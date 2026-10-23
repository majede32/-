import { describe, it, expect } from 'vitest';
import {
  isBusOperatingDay,
  BUS_ESTIMATED_TRANSIT_MINUTES,
  HUB_TRANSFER_BUFFER_MINUTES,
  parseTimeToMinutes,
  formatMinutesToTime,
  ALL_BUS_TRIPS,
  BUS_LINE_42_TRIPS,
  BUS_LINE_116_TRIPS,
  getReturnsFromGobaa
} from '../data/busConnectionData';
import {
  getSynchronizedDeparturesFromTebourba,
  getSynchronizedReturnsFromGobaa,
  resolveBusTargetDay
} from '../services/busTrainSyncService';
import { searchTrips, findMultimodalBusTrips } from '../services/tripSearchEngine';

describe('Bus Operating Days and Schedule Consistency', () => {
  it('strictly runs Monday to Saturday, not Sunday', () => {
    expect(isBusOperatingDay(0)).toBe(false); // Sunday
    expect(isBusOperatingDay(1)).toBe(true);  // Monday
    expect(isBusOperatingDay(2)).toBe(true);  // Tuesday
    expect(isBusOperatingDay(3)).toBe(true);  // Wednesday
    expect(isBusOperatingDay(4)).toBe(true);  // Thursday
    expect(isBusOperatingDay(5)).toBe(true);  // Friday
    expect(isBusOperatingDay(6)).toBe(true);  // Saturday
  });

  it('contains exactly 24 trips (8 for Line 42 and 16 for Line 116)', () => {
    expect(BUS_LINE_42_TRIPS.length).toBe(8);
    expect(BUS_LINE_116_TRIPS.length).toBe(16);
    expect(ALL_BUS_TRIPS.length).toBe(24);
  });

  it('standardizes transfer buffer to 6 minutes and transit estimate to 40 minutes', () => {
    expect(HUB_TRANSFER_BUFFER_MINUTES).toBe(6);
    expect(BUS_ESTIMATED_TRANSIT_MINUTES).toBe(40);
  });

  it('preserves exact source flyer rows for Line 116 (row 4: 07:10/09:10, row 5: 07:50/08:50)', () => {
    const trip4 = BUS_LINE_116_TRIPS.find((t) => t.id === 'b116-4');
    const trip5 = BUS_LINE_116_TRIPS.find((t) => t.id === 'b116-5');

    expect(trip4).toBeDefined();
    expect(trip4?.departureTime).toBe('07:10');
    expect(trip4?.returnTime).toBe('09:10');

    expect(trip5).toBeDefined();
    expect(trip5?.departureTime).toBe('07:50');
    expect(trip5?.returnTime).toBe('08:50');

    // Chronological returns sorting presents 08:50 before 09:10
    const returns = getReturnsFromGobaa('116');
    const idx0850 = returns.findIndex((r) => r.departureTime === '08:50');
    const idx0910 = returns.findIndex((r) => r.departureTime === '09:10');
    expect(idx0850).toBeGreaterThan(-1);
    expect(idx0910).toBeGreaterThan(-1);
    expect(idx0850).toBeLessThan(idx0910);
  });
});

describe('Single Source of Truth Day Resolution (resolveBusTargetDay)', () => {
  it('correctly sets isNextDay=true and targetDayOfWeek=1 on Sunday', () => {
    const res = resolveBusTargetDay(300, 720, 0, false, false, false);
    expect(res.isSundayNoService).toBe(true);
    expect(res.isNextDay).toBe(true);
    expect(res.isTomorrow).toBe(true);
    expect(res.targetDayOfWeek).toBe(1);
  });

  it('correctly sets isNextDay=true, isTomorrow=false, and checks isMondayHoliday on Saturday night', () => {
    // Saturday at 21:00 (1260 min) for a bus at 04:10 (250 min)
    // Case 1: Monday is NOT a holiday
    const resNormal = resolveBusTargetDay(250, 1260, 6, false, false, false);
    expect(resNormal.isPassed).toBe(true);
    expect(resNormal.isTomorrow).toBe(false); // Sunday is tomorrow
    expect(resNormal.isNextDay).toBe(true);
    expect(resNormal.targetDayOfWeek).toBe(1); // Targets Monday
    expect(resNormal.targetDayIsHoliday).toBe(false);

    // Case 2: Monday IS an official holiday
    const resHoliday = resolveBusTargetDay(250, 1260, 6, false, false, true);
    expect(resHoliday.targetDayIsHoliday).toBe(true);
  });
});

describe('Sunday Behavior (No Service / Jumps to Monday)', () => {
  it('correctly marks Sunday queries as no-service and targets Monday', () => {
    // Sunday (dayOfWeek = 0) at 12:00 (720 min)
    const departures = getSynchronizedDeparturesFromTebourba(720, 0, false, false, false);
    expect(departures.length).toBeGreaterThan(0);

    for (const d of departures) {
      expect(d.isSundayNoService).toBe(true);
      expect(d.targetDayOfWeek).toBe(1); // Targets Monday
      expect(d.isTomorrow).toBe(true);
      expect(d.isNextDay).toBe(true);
    }
  });

  it('pairs with Monday trains when query occurs on Sunday', () => {
    // Sunday (dayOfWeek = 0) at 10:00 (600 min)
    const departures = getSynchronizedDeparturesFromTebourba(600, 0, false, false, false);
    const morningTrip = departures.find((d) => d.busDeparture === '07:10');
    expect(morningTrip).toBeDefined();
    // On Monday, Type A trains run!
    if (morningTrip?.trainSchedule) {
      expect(['-', 'A', 'C', 'D']).toContain(morningTrip.trainSchedule.days);
    }
  });
});

describe('Saturday Night Behavior (Crossing Midnight into Sunday)', () => {
  it('skips Sunday and rolls over to Monday morning when query is late Saturday night', () => {
    // Saturday (dayOfWeek = 6) at 21:30 (1290 min), after the last bus (19:50)
    const departures = getSynchronizedDeparturesFromTebourba(1290, 6, false, false, false);
    const firstBus = departures.find((d) => d.busDeparture === '04:10');
    expect(firstBus).toBeDefined();
    expect(firstBus?.isPassed).toBe(true);
    expect(firstBus?.isNextDay).toBe(true);
    // Since Sunday has no service, the next bus departs on Monday (targetDayOfWeek = 1)
    expect(firstBus?.targetDayOfWeek).toBe(1);
    // Remaining time must be (1440 - 1290) [rem. of Sat] + 1440 [full Sun] + 250 [04:10 Mon] = 1840 min
    expect(firstBus?.remainingMinutesFromNow).toBe((1440 - 1290) + 1440 + 250);
  });
});

describe('Removal of Synthetic Numbers for Unconnected Buses', () => {
  it('does NOT invent synthetic train times for early return bus 04:55 from Gobaa', () => {
    // Return bus from Gobaa at 04:55 on Monday (dayOfWeek = 1)
    const returns = getSynchronizedReturnsFromGobaa(240, 1, false, false, false);
    const earlyBus = returns.find((r) => r.busDeparture === '04:55');

    expect(earlyBus).toBeDefined();
    // First train from Tunis arrives at Gobaa at 05:58, which is after 04:55
    // Therefore, hasConnectingTrain must be false!
    expect(earlyBus?.hasConnectingTrain).toBe(false);
    expect(earlyBus?.trainSchedule).toBeUndefined();
    expect(earlyBus?.trainDeparture).toBeUndefined();
    expect(earlyBus?.trainArrival).toBeUndefined();
    // Duration must only be the 40 min bus transit, not an invented sum
    expect(earlyBus?.totalDurationMins).toBe(BUS_ESTIMATED_TRANSIT_MINUTES);
  });
});

describe('Return Countdown Alignment to Tunis Train Departure', () => {
  it('counts down to the train departure from Tunis in the return direction', () => {
    // Monday at 05:00 (300 min). Return bus from Gobaa at 06:30.
    // Train 603 departs Tunis at 05:55 and arrives at Gobaa at 06:17 (leaving 13 min comfortable buffer before 06:30 bus).
    const returns = getSynchronizedReturnsFromGobaa(300, 1, false, false, false);
    const trip0630 = returns.find((r) => r.busDeparture === '06:30');

    expect(trip0630).toBeDefined();
    expect(trip0630?.hasConnectingTrain).toBe(true);
    expect(trip0630?.trainDeparture).toBe('05:55');
    // The passenger journey starts at 05:55 in Tunis, NOT at 06:30 in Gobaa!
    expect(trip0630?.firstLegDepartureTime).toBe('05:55');
    // Minutes remaining from 05:00 to 05:55 is 55 minutes (NOT 90 minutes to 06:30!)
    expect(trip0630?.remainingMinutesFromNow).toBe(55);
  });
});

describe('Multimodal Search Integration', () => {
  it('successfully returns multimodal trips from Tebourba to Tunis Central', () => {
    const trips = searchTrips('tebourba_bus', 'tunis_central', 360, 1, 'ar', false, false);
    expect(trips.length).toBeGreaterThan(0);
    const firstTrip = trips[0];
    expect(firstTrip.type).toBe('multimodal_bus');
    if (firstTrip.type === 'multimodal_bus') {
      expect(firstTrip.direction).toBe('tebourba_to_tunis');
      expect(['42', '116']).toContain(firstTrip.busLine);
      expect(firstTrip.transferStation.id).toBe('gobaa');
      expect(firstTrip.trainTrip).toBeDefined();
    }
  });

  it('successfully returns multimodal return trips from Tunis Central to Tebourba', () => {
    const trips = searchTrips('tunis_central', 'tebourba_bus', 360, 1, 'ar', false, false);
    expect(trips.length).toBeGreaterThan(0);
    const firstTrip = trips[0];
    expect(firstTrip.type).toBe('multimodal_bus');
    if (firstTrip.type === 'multimodal_bus') {
      expect(firstTrip.direction).toBe('tunis_to_tebourba');
      expect(['42', '116']).toContain(firstTrip.busLine);
      expect(firstTrip.transferStation.id).toBe('gobaa');
      expect(firstTrip.trainTrip).toBeDefined();
      // Departure time is the train departure from Tunis!
      expect(firstTrip.departureTime).toBe(firstTrip.trainTrip.departureTime);
    }
  });
});
