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
  findInterlineTrips,
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

describe('Interline Transfers Across Lines', () => {
  it('connects Line D to Line A via Tunis Central with walking buffer', () => {
    const fromStation = findStationById('gobaa');
    const toStation = findStationById('hammam_lif');

    expect(fromStation).toBeDefined();
    expect(toStation).toBeDefined();

    // Query on Monday at 08:00 (480 minutes)
    const trips = findInterlineTrips(fromStation!, toStation!, 480, 1);
    expect(trips.length).toBeGreaterThan(0);

    const firstInterline = trips[0];
    expect(firstInterline.type).toBe('interline');
    expect(firstInterline.leg1.schedule.lineId).toBe('D');
    expect(firstInterline.leg2.schedule.lineId).toBe('A');
    expect(firstInterline.transferWaitMinutes).toBeGreaterThanOrEqual(6);
  });

  it('searchTrips automatically detects cross-line routes', () => {
    const trips = searchTrips('gobaa', 'hammam_lif', 480, 1);
    expect(trips.length).toBeGreaterThan(0);
    expect(trips[0].type).toBe('interline');
  });
});

describe('Tunisian Public Holidays Calendar', () => {
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
});

describe('Dataset Integrity and Monotonicity Validation', () => {
  it('passes comprehensive data validation without errors', () => {
    const report = validateRFRDataset();
    if (!report.isValid) {
      console.error('Validation errors found:', report.errors);
    }
    expect(report.isValid).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.stats.totalLines).toBe(3);
    expect(report.stats.totalSchedules).toBeGreaterThan(50);
  });
});
