import { describe, it, expect } from 'vitest';
import { getLiveTransitPositions } from '../services/liveTrainTracker';
import { parseTimeToMinutes } from '../data/rfrData';

describe('Live Train Tracker Engine', () => {
  it('correctly detects active trains during morning rush hour (07:45 on Monday)', () => {
    // 07:45 is 465 minutes. Day 1 is Monday.
    const snapshot = getLiveTransitPositions(465, 1, false);

    expect(snapshot.targetMinutes).toBe(465);
    expect(snapshot.formattedTime).toBe('07:45');
    expect(snapshot.activeTrains.length).toBeGreaterThan(0);

    // Train 614 departs Gobaa at 07:35 and arrives Tunis Central at 08:02
    const train614 = snapshot.activeTrains.find((t) => t.trainNumber === '614');
    expect(train614).toBeDefined();
    expect(train614?.direction).toBe('outbound');
    expect(train614?.status).toBe('in_transit');
    expect(train614?.currentLat).toBeGreaterThan(36.79);
    expect(train614?.currentLng).toBeGreaterThan(10.06);
    expect(train614?.estimatedSpeedKmh).toBeGreaterThan(20);

    // Train 615 departs Tunis at 07:30 and arrives Gobaa at 07:56
    const train615 = snapshot.activeTrains.find((t) => t.trainNumber === '615');
    expect(train615).toBeDefined();
    expect(train615?.direction).toBe('inbound');
  });

  it('correctly detects when a train is stopped at a station', () => {
    // Train 614 departs Gobaa at 07:35 exactly
    const snapshot = getLiveTransitPositions(parseTimeToMinutes('07:35'), 1, false);
    const train614 = snapshot.activeTrains.find((t) => t.trainNumber === '614');

    expect(train614).toBeDefined();
    expect(train614?.status).toBe('at_station');
    expect(train614?.currentStation?.id).toBe('gobaa');
  });

  it('respects Sunday schedule rules (trains with day A should not run on Sunday)', () => {
    // Train 608 departs Gobaa at 06:35 with days 'A' (does NOT run on Sunday / Day 0)
    const sundaySnapshot = getLiveTransitPositions(parseTimeToMinutes('06:45'), 0, false);
    const train608Sunday = sundaySnapshot.activeTrains.find((t) => t.trainNumber === '608');
    expect(train608Sunday).toBeUndefined();

    // But on Monday (Day 1), Train 608 should be running!
    const mondaySnapshot = getLiveTransitPositions(parseTimeToMinutes('06:45'), 1, false);
    const train608Monday = mondaySnapshot.activeTrains.find((t) => t.trainNumber === '608');
    expect(train608Monday).toBeDefined();
  });

  it('returns upcoming train when no train is currently on the track', () => {
    // 04:00 AM: Before first morning train
    const earlyMorning = getLiveTransitPositions(parseTimeToMinutes('04:00'), 1, false);
    expect(earlyMorning.activeTrains.length).toBe(0);
    expect(earlyMorning.nextUpcomingTrain).not.toBeNull();
    expect(earlyMorning.nextUpcomingTrain?.departureTime).toBe('04:30');
  });

  it('tracks feeder bus positions on operating days', () => {
    // Bus 42 departs Tebourba at 06:30 and reaches Gobaa in ~40 mins (07:10)
    // At 06:50, bus should be mid-transit
    const busSnapshot = getLiveTransitPositions(parseTimeToMinutes('06:50'), 1, false);
    const bus = busSnapshot.activeBuses.find((b) => b.line === '42');

    expect(bus).toBeDefined();
    expect(bus?.direction).toBe('tebourba_to_gobaa');
    expect(bus?.progress).toBeGreaterThan(0.3);
    expect(bus?.progress).toBeLessThan(0.7);
  });
});
