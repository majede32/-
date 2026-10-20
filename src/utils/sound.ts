// Synthesizes a pleasant railway announcement chime and official female station voice announcement
import { AnyTrip } from '../types/trips';
import { Language } from '../data/translations';

interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

/**
 * Synthesizes a 4-tone SNCFT-style railway announcement chime
 */
export function playRailwayChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as WebkitWindow).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const notes = [
      { freq: 587.33, start: 0, duration: 0.35 },    // D5
      { freq: 440.00, start: 0.25, duration: 0.35 },  // A4
      { freq: 659.25, start: 0.5, duration: 0.55 },   // E5
      { freq: 880.00, start: 0.8, duration: 0.9 }     // A5
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.start);

      gain.gain.setValueAtTime(0, ctx.currentTime + note.start);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + note.start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.start + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + note.start);
      osc.stop(ctx.currentTime + note.start + note.duration);
    });
  } catch (error) {
    console.warn('Audio chime unavailable or blocked by autoplay policy:', error);
  }
}

/**
 * Builds the official text spoken in station announcements
 */
export function buildAnnouncementText(trip: AnyTrip, lang: Language): string {
  const isDirect = trip.type === 'direct';
  const trainNum = isDirect
    ? trip.schedule.trainNumber
    : `${trip.leg1.schedule.trainNumber} و ${trip.leg2.schedule.trainNumber}`;

  const origin = lang === 'ar' ? trip.originStation.nameAr : trip.originStation.nameFr;
  const dest = lang === 'ar' ? trip.destinationStation.nameAr : trip.destinationStation.nameFr;
  const depTime = trip.departureTime;
  const remaining = trip.remainingMinutes;

  if (lang === 'ar') {
    const [hours, minutes] = depTime.split(':').map((s) => parseInt(s, 10));
    const timePhrase =
      minutes === 0
        ? `تمام الساعة ${hours}`
        : `الساعة ${hours} و ${minutes} دقيقة`;

    const remainingPhrase =
      remaining <= 0
        ? 'ينطلق الآن من المحطة'
        : `ينطلق خلال ${remaining} دقيقة`;

    return `الرجاء الانتباه. القطار رقم ${trainNum}، المتجه من محطة ${origin} إلى محطة ${dest}، ينطلق في ${timePhrase}. ${remainingPhrase}. شكرًا لانتباهكم.`;
  }

  if (lang === 'fr') {
    const remainingPhrase =
      remaining <= 0 ? 'départ immédiat' : `départ dans ${remaining} minutes`;

    return `Attention s'il vous plaît. Le train numéro ${trainNum}, au départ de ${origin} et à destination de ${dest}, partira à ${depTime}. ${remainingPhrase}. Merci de votre attention.`;
  }

  // English fallback
  const remainingPhrase =
    remaining <= 0 ? 'departing now' : `departing in ${remaining} minutes`;

  return `Attention please. Train number ${trainNum}, from ${origin} to ${dest}, will depart at ${depTime}. ${remainingPhrase}. Thank you for your attention.`;
}

/**
 * Finds the most natural female voice for the target language in Web Speech API
 */
function findBestFemaleVoice(voices: SpeechSynthesisVoice[], lang: Language): SpeechSynthesisVoice | null {
  const targetPrefix = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en';

  // Female voice name hints in different browsers/operating systems (Chrome, Android, Safari, Edge, Windows)
  const femaleKeywords = [
    'female', 'woman', 'zira', 'salma', 'meryem', 'yasmin', 'leila', 'amira', 'zeina', 'fatima', 'hoda',
    'hortense', 'julie', 'celine', 'audrey', 'samantha', 'victoria', 'karen', 'moira', 'fiona', 'tessa'
  ];

  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(targetPrefix));

  if (langVoices.length === 0) {
    // If no voice for target language, fall back to any voice matching prefix
    return voices.find((v) => v.lang.toLowerCase().startsWith(targetPrefix)) || null;
  }

  // 1. Look for explicit female name or keyword
  const femaleVoice = langVoices.find((v) => {
    const nameLower = v.name.toLowerCase();
    return femaleKeywords.some((kw) => nameLower.includes(kw));
  });

  if (femaleVoice) return femaleVoice;

  // 2. Default to first matching language voice (on Android TTS, default Arabic voice is high quality female)
  return langVoices[0];
}

/**
 * Plays the official 4-tone chime, followed immediately by the spoken female announcement
 */
export function announceTripStationVoice(trip: AnyTrip, lang: Language): void {
  // 1. Play railway chime
  playRailwayChime();

  // 2. Web Speech API Voice Announcement
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    const synth = window.speechSynthesis;
    // Cancel any previous utterance
    synth.cancel();

    const text = buildAnnouncementText(trip, lang);
    const utterance = new SpeechSynthesisUtterance(text);

    const targetLangCode = lang === 'ar' ? 'ar-TN' : lang === 'fr' ? 'fr-FR' : 'en-US';
    utterance.lang = targetLangCode;
    utterance.rate = 0.92; // Slightly measured station tempo
    utterance.pitch = 1.05; // Slightly elevated feminine pitch

    const setVoiceAndSpeak = () => {
      const voices = synth.getVoices();
      const bestVoice = findBestFemaleVoice(voices, lang);
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
      // Delay speech by 800ms to let the 4-tone chime play its opening chord
      setTimeout(() => {
        synth.speak(utterance);
      }, 800);
    };

    const currentVoices = synth.getVoices();
    if (currentVoices.length > 0) {
      setVoiceAndSpeak();
    } else {
      synth.onvoiceschanged = () => {
        setVoiceAndSpeak();
        synth.onvoiceschanged = null;
      };
    }
  } catch (err) {
    console.warn('Speech synthesis failed:', err);
  }
}
