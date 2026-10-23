import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildAnnouncementText,
  findBestEnglishFemaleVoice,
  waitForVoices,
  playRailwayChime,
  announceTripStationVoice,
  getAudioContext
} from '../utils/sound';
import { DirectTrip, MultimodalBusTrainTrip } from '../types/trips';
import { LINES } from '../data/rfrData';

describe('Sound & Voice Announcement System', () => {
  const lineDStations = LINES.D.stations;
  const dummyDirectTrip: DirectTrip = {
    type: 'direct',
    originStation: lineDStations[lineDStations.length - 1], // Tunis Central
    destinationStation: lineDStations[1], // Gobaa
    departureTime: '06:40',
    arrivalTime: '07:08',
    durationMinutes: 28,
    remainingMinutes: 15,
    isNextDay: false,
    dayBadgeText: 'اليوم',
    intermediateStops: [],
    schedule: {
      trainNumber: '110',
      lineId: 'D',
      direction: 'outbound',
      departureTime: '06:40',
      arrivalTime: '07:08',
      originStationId: 'tunis_central',
      destinationStationId: 'gobaa',
      days: 'A',
      stops: [
        { stationId: 'tunis_central', time: '06:40' },
        { stationId: 'gobaa', time: '07:08' }
      ]
    }
  };

  const dummyBusTrip: MultimodalBusTrainTrip = {
    type: 'multimodal_bus',
    direction: 'tebourba_to_tunis',
    busLine: '42',
    busDeparture: '06:30',
    busArrival: '07:10',
    transferStation: lineDStations[1],
    transferWaitMinutes: 6,
    trainTrip: dummyDirectTrip,
    originStation: {
      id: 'tebourba_center',
      lineId: 'BUS',
      nameAr: 'طبربة',
      nameFr: 'Tébourba',
      nameEn: 'Tebourba',
      order: 0,
      facilities: []
    },
    destinationStation: lineDStations[lineDStations.length - 1],
    departureTime: '06:30',
    arrivalTime: '07:38',
    durationMinutes: 68,
    remainingMinutes: 5,
    isNextDay: false,
    dayBadgeText: 'اليوم'
  };

  it('builds clear English announcement text for direct train trips', () => {
    const text = buildAnnouncementText(dummyDirectTrip);
    expect(text).toContain('Attention please.');
    expect(text).toContain('Train number 110');
    expect(text).toContain('departing in 15 minutes');
    expect(text).toContain('Have a pleasant journey');
  });

  it('builds clear English announcement text for multimodal bus trips', () => {
    const text = buildAnnouncementText(dummyBusTrip);
    expect(text).toContain('Combined journey with feeder bus line 42');
    expect(text).toContain('departing in 5 minutes');
    expect(text).toContain('Have a pleasant journey');
  });

  it('selects the best female English voice when present', () => {
    const mockVoices: SpeechSynthesisVoice[] = [
      {
        name: 'Google US English Male',
        lang: 'en-US',
        default: false,
        localService: true,
        voiceURI: 'Google US English Male'
      },
      {
        name: 'Google UK English Female',
        lang: 'en-GB',
        default: false,
        localService: true,
        voiceURI: 'Google UK English Female'
      },
      {
        name: 'Thomas',
        lang: 'fr-FR',
        default: false,
        localService: true,
        voiceURI: 'Thomas'
      }
    ];

    const voice = findBestEnglishFemaleVoice(mockVoices);
    expect(voice).toBeDefined();
    expect(voice?.name).toBe('Google UK English Female');
  });

  it('resolves voices asynchronously via waitForVoices', async () => {
    const voices = await waitForVoices(50);
    expect(Array.isArray(voices)).toBe(true);
  });

  it('handles AudioContext and chime gracefully in test environment', async () => {
    await expect(playRailwayChime()).resolves.not.toThrow();
  });
});
