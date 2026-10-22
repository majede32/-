import { describe, it, expect } from 'vitest';
import {
  LINES,
  ALL_SCHEDULES,
  isTrainRunningOnDay,
  TUNIS_CENTRAL_ID,
  findStationById
} from '../data/rfrData';
import {
  findDirectTrips,
  searchTrips
} from '../services/tripSearchEngine';
import { checkTunisianHoliday } from '../utils/tunisianHolidays';
import { validateRFRDataset } from '../utils/dataValidation';

describe('RFR Timetable Days Circulation Eligibility', () => {
  it('should run code "-" on all days of the week', () => {
    for (let day = 0; day < 7; day++) {
      expect(isTrainRunningOnDay('-', day)).toBe(true);
    }
  });

  it('should run code "A" every day except Sunday', () => {
    expect(isTrainRunningOnDay('A', 0)).toBe(false); // Sunday
    expect(isTrainRunningOnDay('A', 1)).toBe(true);  // Monday
    expect(isTrainRunningOnDay('A', 5)).toBe(true);  // Friday
    expect(isTrainRunningOnDay('A', 6)).toBe(true);  // Saturday
  });

  it('should run code "B" on Sunday only', () => {
    expect(isTrainRunningOnDay('B', 0)).toBe(true);  // Sunday
    expect(isTrainRunningOnDay('B', 1)).toBe(false); // Monday
    expect(isTrainRunningOnDay('B', 6)).toBe(false); // Saturday
  });

  it('should run code "C" Monday through Friday only', () => {
    expect(isTrainRunningOnDay('C', 0)).toBe(false); // Sunday
    expect(isTrainRunningOnDay('C', 1)).toBe(true);  // Monday
    expect(isTrainRunningOnDay('C', 5)).toBe(true);  // Friday
    expect(isTrainRunningOnDay('C', 6)).toBe(false); // Saturday
  });

  it('should run code "D" every day except Saturday', () => {
    expect(isTrainRunningOnDay('D', 6)).toBe(false); // Saturday
    expect(isTrainRunningOnDay('D', 0)).toBe(true);  // Sunday
    expect(isTrainRunningOnDay('D', 1)).toBe(true);  // Monday
    expect(isTrainRunningOnDay('D', 2)).toBe(true);  // Tuesday
    expect(isTrainRunningOnDay('D', 5)).toBe(true);  // Friday
  });

  it('respects holiday status for circulation codes A, B, and C', () => {
    // On Monday (day 1) during an official holiday
    expect(isTrainRunningOnDay('A', 1, true)).toBe(false); // Code A does not run on holidays
    expect(isTrainRunningOnDay('B', 1, true)).toBe(true);  // Code B runs on holidays
    expect(isTrainRunningOnDay('C', 1, true)).toBe(false); // Code C does not run on holidays
    expect(isTrainRunningOnDay('-', 1, true)).toBe(true);  // Code - runs every day
  });
});

describe('Midnight and Next-Day Departure Logic', () => {
  it('evaluates Saturday late-night queries with Sunday morning schedule eligibility', () => {
    // Saturday night 23:55 (day 6, 1435 min)
    const trips = findDirectTrips('gobaa', TUNIS_CENTRAL_ID, 'D', 1435, 6);
    expect(trips.length).toBeGreaterThan(0);

    const firstTrip = trips[0];
    expect(firstTrip.isNextDay).toBe(true);
    // On Sunday morning, only trains running on Sunday (code '-' or 'B' or 'D') should appear
    expect(['-', 'B', 'D']).toContain(firstTrip.schedule.days);
  });
});

describe('Train 636 Exact Schedule Verification', () => {
  it('has exact departure from Gobaa Ville and arrival in Tunis Central as in SNCFT poster', () => {
    const train636 = ALL_SCHEDULES.find((s) => s.trainNumber === '636');
    expect(train636).toBeDefined();

    const gobaaVilleStop = train636?.stops.find((s) => s.stationId === 'gobaa_ville');
    const gobaaStop = train636?.stops.find((s) => s.stationId === 'gobaa');
    const tunisStop = train636?.stops.find((s) => s.stationId === TUNIS_CENTRAL_ID);

    expect(gobaaVilleStop?.time).toBe('12:40');
    expect(gobaaStop?.time).toBe('12:46');
    expect(tunisStop?.time).toBe('13:14');
  });
});

describe('Line D Single-Line Architecture & Isolation', () => {
  it('verifies Line D has 10 stations between Gobaa Ville and Tunis Central', () => {
    const lineD = LINES['D'];
    expect(lineD).toBeDefined();
    expect(lineD.stations).toHaveLength(10);
    expect(lineD.stations[0].id).toBe('gobaa_ville');
    expect(lineD.stations[9].id).toBe(TUNIS_CENTRAL_ID);
  });

  it('searchTrips between Line D stations returns valid direct trips with correct sorting', () => {
    const trips = searchTrips('gobaa', TUNIS_CENTRAL_ID, 480, 1);
    expect(trips.length).toBeGreaterThan(0);
    expect(trips[0].type).toBe('direct');
    expect(trips[0].originStation.id).toBe('gobaa');
    expect(trips[0].destinationStation.id).toBe(TUNIS_CENTRAL_ID);
  });

  it('safely returns empty array for queries referencing removed lines', () => {
    const trips = searchTrips('gobaa', 'hammam_lif', 480, 1);
    expect(trips).toEqual([]);
  });
});

describe('Tunisian Public Holidays Calendar and Engine Integration', () => {
  it('identifies Independence Day (March 20) as holiday', () => {
    const result = checkTunisianHoliday(2026, 3, 20);
    expect(result.isHoliday).toBe(true);
    expect(result.holiday?.nameAr).toContain('عيد الاستقلال');
  });

  it('identifies Martyrs’ Day (April 9) as holiday', () => {
    const result = checkTunisianHoliday(2026, 4, 9);
    expect(result.isHoliday).toBe(true);
    expect(result.holiday?.nameAr).toContain('عيد الشهداء');
  });

  it('identifies Republic Day (July 25) as holiday', () => {
    const result = checkTunisianHoliday(2026, 7, 25);
    expect(result.isHoliday).toBe(true);
    expect(result.holiday?.nameAr).toContain('عيد الجمهورية');
  });

  it('identifies ordinary business days as non-holidays', () => {
    const result = checkTunisianHoliday(2026, 11, 10);
    expect(result.isHoliday).toBe(false);
  });

  it('filters trips properly when query is performed on a holiday', () => {
    // Normal Monday (day 1): trains with schedule code 'A' run today, 'B' does not
    const normalMondayTrips = searchTrips('gobaa', TUNIS_CENTRAL_ID, 400, 1, 'ar', false);
    // Holiday Monday (day 1): trains with schedule code 'A' should NOT run today, code 'B' SHOULD run today
    const holidayMondayTrips = searchTrips('gobaa', TUNIS_CENTRAL_ID, 400, 1, 'ar', true);

    const normalTodayHasCodeA = normalMondayTrips.filter((t) => !t.isNextDay).some((t) => t.type === 'direct' && t.schedule.days === 'A');
    const normalTodayHasCodeB = normalMondayTrips.filter((t) => !t.isNextDay).some((t) => t.type === 'direct' && t.schedule.days === 'B');

    const holidayTodayHasCodeA = holidayMondayTrips.filter((t) => !t.isNextDay).some((t) => t.type === 'direct' && t.schedule.days === 'A');
    const holidayTodayHasCodeB = holidayMondayTrips.filter((t) => !t.isNextDay).some((t) => t.type === 'direct' && t.schedule.days === 'B');

    expect(normalTodayHasCodeA).toBe(true);
    expect(normalTodayHasCodeB).toBe(false);

    expect(holidayTodayHasCodeA).toBe(false);
    expect(holidayTodayHasCodeB).toBe(true);
  });
});

describe('Edge Cases and Fallbacks', () => {
  it('returns empty array when origin and destination stations are the same', () => {
    const trips = searchTrips('gobaa', 'gobaa', 500, 1);
    expect(trips).toEqual([]);
  });

  it('returns empty array when non-existent station IDs are supplied', () => {
    const trips = searchTrips('invalid_id_1', 'invalid_id_2', 500, 1);
    expect(trips).toEqual([]);
  });

  it('handles late night queries (23:59) by retrieving morning trains with correct isNextDay flags', () => {
    // 23:59 on Tuesday (day 2)
    const trips = searchTrips('gobaa', TUNIS_CENTRAL_ID, 1439, 2);
    expect(trips.length).toBeGreaterThan(0);
    expect(trips[0].isNextDay).toBe(true);
    // Remaining minutes should be > 0 (overnight wait until next morning)
    expect(trips[0].remainingMinutes).toBeGreaterThan(0);
  });
});

describe('Dataset Integrity and Monotonicity Validation', () => {
  it('passes comprehensive data validation without errors', () => {
    const report = validateRFRDataset();
    if (!report.isValid) {
      console.error('Validation errors found:', report.errors);
    }
    expect(report.isValid).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.stats.totalLines).toBe(1);
    expect(report.stats.totalSchedules).toBeGreaterThan(50);
  });
});

