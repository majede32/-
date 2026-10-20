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
 * Builds the official text spoken in station announcements in clear English
 */
export function buildAnnouncementText(trip: AnyTrip, _lang?: Language): string {
  const isDirect = trip.type === 'direct';
  const trainNum = isDirect
    ? trip.schedule.trainNumber
    : `${trip.leg1.schedule.trainNumber} and ${trip.leg2.schedule.trainNumber}`;

  // Use Latin station names for fluent and natural English TTS pronunciation
  const origin = trip.originStation.nameFr;
  const dest = trip.destinationStation.nameFr;
  const depTime = trip.departureTime;
  const remaining = trip.remainingMinutes;

  const remainingPhrase =
    remaining <= 0
      ? 'departing now from the platform'
      : `departing in ${remaining} minute${remaining > 1 ? 's' : ''}`;

  if (isDirect) {
    return `Attention please. Train number ${trainNum}, from ${origin} to ${dest}, will depart at ${depTime}. ${remainingPhrase}. Have a pleasant journey.`;
  }

  return `Attention please. Connection from ${origin} to ${dest}, with transfer at Tunis Barcelona Central. First train number ${trip.leg1.schedule.trainNumber} departs at ${depTime}. ${remainingPhrase}. Have a pleasant journey.`;
}

/**
 * Finds the highest quality English female voice in Web Speech API
 */
function findBestEnglishFemaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const enVoices = voices.filter((v) => {
    const l = v.lang.toLowerCase().replace('_', '-');
    return l.startsWith('en');
  });

  if (enVoices.length === 0) {
    return voices[0] || null;
  }

  // Keywords that identify female voices across Android (Google TTS), iOS/Safari, Windows, and Chrome
  const femaleKeywords = [
    'female', 'woman', 'zira', 'samantha', 'victoria', 'karen', 'moira', 'fiona', 'tessa',
    'serena', 'ava', 'allison', 'susan', 'jenny', 'aria', 'en-gb-x-rjs#female', 'en-us-x-sfg#female',
    'google uk english female', 'google us english female', 'en-gb-language', 'en-gb', 'en-us'
  ];

  // 1. Prioritize explicit female English voice (British English is classic railway style)
  const femaleVoice = enVoices.find((v) => {
    const nameLower = (v.name + ' ' + (v.voiceURI || '')).toLowerCase();
    return femaleKeywords.some((kw) => nameLower.includes(kw));
  });

  if (femaleVoice) return femaleVoice;

  // 2. Default to British English if found, otherwise first available English voice
  const ukVoice = enVoices.find((v) => v.lang.toLowerCase().includes('gb'));
  if (ukVoice) return ukVoice;

  return enVoices[0];
}

// Pre-warm voices on Android WebView
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  } catch {}
}

/**
 * Plays the official 4-tone chime, followed immediately by the spoken English female station announcement
 */
export function announceTripStationVoice(trip: AnyTrip, _lang?: Language): void {
  // 1. Play railway chime
  playRailwayChime();

  // 2. Web Speech API Voice Announcement
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported on this device/browser');
    return;
  }

  try {
    const synth = window.speechSynthesis;
    
    // Critical for Android WebView: cancel previous and resume if paused
    synth.cancel();
    if (synth.paused) {
      synth.resume();
    }

    const text = buildAnnouncementText(trip);
    const utterance = new SpeechSynthesisUtterance(text);

    // Standard English language code guaranteed on 100% of Android devices
    utterance.lang = 'en-US';
    utterance.rate = 0.90; // Calm, measured railway announcer cadence
    utterance.pitch = 1.15; // Natural feminine pitch
    utterance.volume = 1.0;

    const voices = synth.getVoices();
    const bestVoice = findBestEnglishFemaleVoice(voices);
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    }

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
    };

    // Synchronous execution ensures Android WebView autoplay activation gate is honored
    synth.resume();
    synth.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis failed:', err);
  }
}
