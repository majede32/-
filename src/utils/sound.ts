// Synthesizes a pleasant railway announcement chime and official station voice announcement
// Optimized for Native Android (Capacitor TextToSpeech), Chrome, and modern Web browsers
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { AnyTrip } from '../types/trips';
import { Language } from '../data/translations';

interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

// Singleton AudioContext to prevent exceeding Android hardware context limits (usually max 6)
let sharedAudioCtx: AudioContext | null = null;

/**
 * Returns or initializes the shared AudioContext instance
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext || (window as unknown as WebkitWindow).webkitAudioContext;

  if (!AudioContextClass) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    try {
      sharedAudioCtx = new AudioContextClass();
    } catch (e) {
      console.warn('Failed to initialize AudioContext:', e);
      return null;
    }
  }
  return sharedAudioCtx;
}

/**
 * Synthesizes a 4-tone SNCFT-style railway announcement chime.
 * Includes explicit user-gesture AudioContext.resume() for Android WebView & Chrome Autoplay policy.
 */
export async function playRailwayChime(): Promise<void> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Android & Chrome Autoplay Policy requirement: explicitly resume suspended context inside user gesture
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (resumeErr) {
        console.warn('AudioContext resume failed:', resumeErr);
      }
    }

    const startTime = ctx.currentTime;
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
      osc.frequency.setValueAtTime(note.freq, startTime + note.start);

      gain.gain.setValueAtTime(0, startTime + note.start);
      gain.gain.linearRampToValueAtTime(0.2, startTime + note.start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.start + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + note.start);
      osc.stop(startTime + note.start + note.duration);
    });
  } catch (error) {
    console.warn('Audio chime unavailable or blocked by autoplay policy:', error);
  }
}

/**
 * Stops any active speech synthesis across Native Capacitor TTS and Web Speech API.
 */
export async function stopAllSpeech(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await TextToSpeech.stop();
    } catch {}
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

/**
 * Builds the official text spoken in station announcements in clear English
 */
export function buildAnnouncementText(trip: AnyTrip, _lang?: Language): string {
  const origin = trip.originStation.nameFr;
  const dest = trip.destinationStation.nameFr;
  const depTime = trip.departureTime;
  const remaining = trip.remainingMinutes;

  const remainingPhrase =
    remaining <= 0
      ? 'departing now from the platform'
      : `departing in ${remaining} minute${remaining > 1 ? 's' : ''}`;

  if (trip.type === 'multimodal_bus') {
    return `Attention please. Combined journey with feeder bus line ${trip.busLine} and RFR train, from ${origin} to ${dest}, departing at ${depTime}. ${remainingPhrase}. Have a pleasant journey.`;
  }

  const trainNum = trip.schedule.trainNumber;
  return `Attention please. Train number ${trainNum}, from ${origin} to ${dest}, will depart at ${depTime}. ${remainingPhrase}. Have a pleasant journey.`;
}

/**
 * Asynchronously waits for SpeechSynthesis voices to load (Web Speech fallback).
 */
export function waitForVoices(timeoutMs: number = 400): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([]);
  }

  const synth = window.speechSynthesis;
  const initial = synth.getVoices();
  if (initial && initial.length > 0) {
    return Promise.resolve(initial);
  }

  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        synth.removeEventListener('voiceschanged', onVoicesChanged);
        resolve(synth.getVoices() || []);
      }
    };

    const timer = setTimeout(cleanup, timeoutMs);

    const onVoicesChanged = () => {
      const v = synth.getVoices();
      if (v && v.length > 0) {
        cleanup();
      }
    };

    synth.addEventListener('voiceschanged', onVoicesChanged, { once: true });
  });
}

/**
 * Finds the highest quality English female voice in Web Speech API
 */
export function findBestEnglishFemaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
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

// Retain a module-level reference to the active utterance to prevent Chrome GC bug
let activeUtterance: SpeechSynthesisUtterance | null = null;

// Pre-warm voices on startup
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
 * Plays the official 4-tone chime, followed after realistic station chime duration (~950ms)
 * by the spoken English female station announcement.
 *
 * Uses Native Android/iOS TTS via @capacitor-community/text-to-speech when running as a native app,
 * seamlessly falling back to Web Speech API in browsers.
 */
export async function announceTripStationVoice(trip: AnyTrip, _lang?: Language): Promise<void> {
  // 1. Play railway chime immediately (with AudioContext.resume on user click)
  await playRailwayChime();

  const text = buildAnnouncementText(trip);

  // 2. Realistic station timing pause (~950ms)
  await new Promise((resolve) => setTimeout(resolve, 950));

  // 3. Priority: Native Android Text-to-Speech (bypasses WebView sandbox directly to Google TTS)
  if (Capacitor.isNativePlatform()) {
    try {
      await TextToSpeech.stop();
      await TextToSpeech.speak({
        text,
        lang: 'en-US',
        rate: 0.90,
        pitch: 1.15,
        volume: 1.0,
        category: 'ambient',
      });
      return;
    } catch (nativeErr) {
      console.warn('Native Capacitor TextToSpeech failed, falling back to Web Speech API:', nativeErr);
    }
  }

  // 4. Web Speech API Fallback (for Web browsers / Chrome desktop / mobile browsers)
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported on this device/browser');
    return;
  }

  try {
    const synth = window.speechSynthesis;

    // Reset stuck queue from prior interactions
    synth.cancel();
    if (synth.paused) {
      synth.resume();
    }

    const voices = await waitForVoices(300);
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = 'en-US';
    utterance.rate = 0.90; // Calm, measured railway announcer cadence
    utterance.pitch = 1.15; // Natural feminine pitch
    utterance.volume = 1.0;

    const bestVoice = findBestEnglishFemaleVoice(voices);
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    }

    // Keep active utterance referenced to prevent garbage collection on Android Chromium
    activeUtterance = utterance;

    utterance.onend = () => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
    };

    if (synth.paused) {
      synth.resume();
    }
    synth.speak(utterance);

    // Some Android devices need another resume call right after speak to wake up the audio pipeline
    if (synth.paused) {
      synth.resume();
    }
  } catch (err) {
    console.warn('Speech synthesis failed:', err);
  }
}

/**
 * Custom speech announcement utility with railway chime, Native TTS support, and Web Speech fallback.
 */
export async function announceCustomStationVoice(
  text: string,
  langCode: string = 'en-US',
  delayMs: number = 950
): Promise<void> {
  await playRailwayChime();

  if (delayMs > 0) {
    await new Promise((r) => setTimeout(r, delayMs));
  }

  // 1. Native Android TTS
  if (Capacitor.isNativePlatform()) {
    try {
      await TextToSpeech.stop();
      await TextToSpeech.speak({
        text,
        lang: langCode,
        rate: 0.90,
        pitch: 1.05,
        volume: 1.0,
        category: 'ambient',
      });
      return;
    } catch (nativeErr) {
      console.warn('Native Capacitor TextToSpeech failed, falling back to Web Speech API:', nativeErr);
    }
  }

  // 2. Web Speech API fallback
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    if (synth.paused) {
      synth.resume();
    }

    const voices = await waitForVoices(300);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.90;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    // Pick matching language voice if found
    const targetLang = langCode.toLowerCase().replace('_', '-');
    const matchedVoice = voices.find((v) =>
      v.lang.toLowerCase().replace('_', '-').startsWith(targetLang.slice(0, 2))
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    activeUtterance = utterance;
    utterance.onend = () => {
      if (activeUtterance === utterance) activeUtterance = null;
    };
    utterance.onerror = () => {
      if (activeUtterance === utterance) activeUtterance = null;
    };

    if (synth.paused) synth.resume();
    synth.speak(utterance);
    if (synth.paused) synth.resume();
  } catch (e) {
    console.warn('Custom announcement failed:', e);
  }
}
