import {
  ALL_BUS_TRIPS,
  BusTrip,
  parseTimeToMinutes,
  formatMinutesToTime,
  BUS_ESTIMATED_TRANSIT_MINUTES,
  HUB_TRANSFER_BUFFER_MINUTES,
  isBusOperatingDay
} from '../data/busConnectionData';
import {
  ALL_SCHEDULES,
  TUNIS_CENTRAL_ID,
  TrainSchedule,
  isTrainRunningOnDay
} from '../data/rfrData';

export interface SynchronizedBusTrainConnection {
  id: string;
  busTrip: BusTrip;
  busLine: '42' | '116';
  direction: 'to_gobaa' | 'return_to_tebourba';
  busDeparture: string;
  busArrival: string;
  transferWaitMins: number;

  // Connecting train information (strictly undefined if no train operates/connects)
  hasConnectingTrain: boolean;
  trainSchedule?: TrainSchedule;
  trainDeparture?: string;
  trainArrival?: string;
  trainDepartureStationName?: string;
  trainArrivalStationName?: string;

  // Journey metrics
  totalDurationMins: number;
  firstLegDepartureTime: string; // The time the passenger must start journey (bus in outbound; train from Tunis in return)
  remainingMinutesFromNow: number;
  isPassed: boolean;
  isTomorrow: boolean;
  targetDayOfWeek: number;
  isSundayNoService?: boolean;
}

/**
 * Resolves target departure day and time offset given current time and day of week.
 * - Monday to Friday: today if trip is in the future; tomorrow morning if past.
 * - Saturday: today if in future; skips Sunday (no bus) and moves to Monday morning (+2 days) if past.
 * - Sunday: bus does NOT operate on Sunday; next trip is Monday morning (+1 day).
 */
function resolveTargetDayForBus(
  busMinutes: number,
  currentTunisiaMinutes: number,
  currentDayOfWeek: number
): {
  isPassed: boolean;
  isTomorrow: boolean;
  remainingMinutes: number;
  targetDayOfWeek: number;
  isSundayNoService: boolean;
} {
  // Sunday
  if (currentDayOfWeek === 0) {
    const remainingMinutes = (1440 - currentTunisiaMinutes) + busMinutes;
    return {
      isPassed: false,
      isTomorrow: true,
      remainingMinutes,
      targetDayOfWeek: 1, // Monday
      isSundayNoService: true
    };
  }

  // Saturday
  if (currentDayOfWeek === 6) {
    if (busMinutes >= currentTunisiaMinutes) {
      return {
        isPassed: false,
        isTomorrow: false,
        remainingMinutes: busMinutes - currentTunisiaMinutes,
        targetDayOfWeek: 6,
        isSundayNoService: false
      };
    } else {
      // Past Saturday evening -> next bus is Monday (+2 days / 48h jump, since Sunday has no service)
      const remainingMinutes = (1440 - currentTunisiaMinutes) + 1440 + busMinutes;
      return {
        isPassed: true,
        isTomorrow: false,
        remainingMinutes,
        targetDayOfWeek: 1, // Monday
        isSundayNoService: false
      };
    }
  }

  // Monday through Friday
  if (busMinutes >= currentTunisiaMinutes) {
    return {
      isPassed: false,
      isTomorrow: false,
      remainingMinutes: busMinutes - currentTunisiaMinutes,
      targetDayOfWeek: currentDayOfWeek,
      isSundayNoService: false
    };
  } else {
    // Past for today -> next bus is tomorrow
    const nextDay = (currentDayOfWeek + 1) % 7;
    const remainingMinutes = (1440 - currentTunisiaMinutes) + busMinutes;
    return {
      isPassed: true,
      isTomorrow: true,
      remainingMinutes,
      targetDayOfWeek: nextDay,
      isSundayNoService: false
    };
  }
}

/**
 * Finds synchronized connections for travelers leaving Tebourba to Tunis via Gobaa
 */
export function getSynchronizedDeparturesFromTebourba(
  currentTunisiaMinutes: number,
  currentDayOfWeek: number = 1,
  isHoliday: boolean = false,
  isTomorrowHoliday: boolean = false,
  selectedLine?: '42' | '116'
): SynchronizedBusTrainConnection[] {
  const filtered = selectedLine
    ? ALL_BUS_TRIPS.filter((b) => b.line === selectedLine)
    : ALL_BUS_TRIPS;

  const results: SynchronizedBusTrainConnection[] = [];

  for (const bus of filtered) {
    const busDepM = parseTimeToMinutes(bus.departureTime);
    const busArrGobaaM = busDepM + BUS_ESTIMATED_TRANSIT_MINUTES;
    const earliestTrainDepM = busArrGobaaM + HUB_TRANSFER_BUFFER_MINUTES;

    const dayInfo = resolveTargetDayForBus(busDepM, currentTunisiaMinutes, currentDayOfWeek);
    const targetDayIsHoliday = dayInfo.isTomorrow ? isTomorrowHoliday : isHoliday;

    // Outbound trains: Gobaa -> Tunis Central
    // Filter strictly by day-of-week & holiday rules (e.g. Type A trains do not run on Sundays or holidays)
    const candidateTrains = ALL_SCHEDULES.filter((s) => s.direction === 'outbound')
      .filter((s) => isTrainRunningOnDay(s.days, dayInfo.targetDayOfWeek, targetDayIsHoliday))
      .map((s) => {
        const gobaaStop = s.stops.find((st) => st.stationId === 'gobaa');
        const tunisStop = s.stops.find((st) => st.stationId === TUNIS_CENTRAL_ID);
        if (!gobaaStop || !tunisStop) return null;
        const depM = parseTimeToMinutes(gobaaStop.time);
        const arrM = parseTimeToMinutes(tunisStop.time);
        return {
          schedule: s,
          gobaaTime: gobaaStop.time,
          tunisTime: tunisStop.time,
          depM,
          arrM
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => item.depM >= earliestTrainDepM)
      .sort((a, b) => a.depM - b.depM);

    const bestTrain = candidateTrains[0];

    if (bestTrain) {
      const transferWait = bestTrain.depM - busArrGobaaM;
      const trainDuration = bestTrain.arrM - bestTrain.depM;
      const totalDuration = BUS_ESTIMATED_TRANSIT_MINUTES + transferWait + trainDuration;

      results.push({
        id: `out-${bus.line}-${bus.departureTime}`,
        busTrip: bus,
        busLine: bus.line,
        direction: 'to_gobaa',
        busDeparture: bus.departureTime,
        busArrival: formatMinutesToTime(busArrGobaaM),
        transferWaitMins: transferWait,
        hasConnectingTrain: true,
        trainSchedule: bestTrain.schedule,
        trainDeparture: bestTrain.gobaaTime,
        trainArrival: bestTrain.tunisTime,
        trainDepartureStationName: 'القباعة',
        trainArrivalStationName: 'تونس (ساحة برشلونة)',
        totalDurationMins: totalDuration,
        firstLegDepartureTime: bus.departureTime,
        remainingMinutesFromNow: dayInfo.remainingMinutes,
        isPassed: dayInfo.isPassed,
        isTomorrow: dayInfo.isTomorrow,
        targetDayOfWeek: dayInfo.targetDayOfWeek,
        isSundayNoService: dayInfo.isSundayNoService
      });
    } else {
      // No connecting train available for this bus slot
      // DO NOT invent synthetic wait times or train durations!
      results.push({
        id: `out-${bus.line}-${bus.departureTime}`,
        busTrip: bus,
        busLine: bus.line,
        direction: 'to_gobaa',
        busDeparture: bus.departureTime,
        busArrival: formatMinutesToTime(busArrGobaaM),
        transferWaitMins: 0,
        hasConnectingTrain: false,
        totalDurationMins: BUS_ESTIMATED_TRANSIT_MINUTES,
        firstLegDepartureTime: bus.departureTime,
        remainingMinutesFromNow: dayInfo.remainingMinutes,
        isPassed: dayInfo.isPassed,
        isTomorrow: dayInfo.isTomorrow,
        targetDayOfWeek: dayInfo.targetDayOfWeek,
        isSundayNoService: dayInfo.isSundayNoService
      });
    }
  }

  // Sort by bus departure time chronologically
  results.sort((a, b) => parseTimeToMinutes(a.busDeparture) - parseTimeToMinutes(b.busDeparture));
  return results;
}

/**
 * Finds synchronized connections for travelers returning from Tunis to Tebourba via Gobaa
 */
export function getSynchronizedReturnsFromGobaa(
  currentTunisiaMinutes: number,
  currentDayOfWeek: number = 1,
  isHoliday: boolean = false,
  isTomorrowHoliday: boolean = false,
  selectedLine?: '42' | '116'
): SynchronizedBusTrainConnection[] {
  const filtered = (selectedLine
    ? ALL_BUS_TRIPS.filter((b) => b.line === selectedLine)
    : ALL_BUS_TRIPS
  ).filter((b) => Boolean(b.returnTime));

  const results: SynchronizedBusTrainConnection[] = [];

  for (const bus of filtered) {
    const busReturnTime = bus.returnTime!;
    const busDepGobaaM = parseTimeToMinutes(busReturnTime);
    const busArrTebourbaM = busDepGobaaM + BUS_ESTIMATED_TRANSIT_MINUTES;

    // To catch this return bus at Gobaa, passenger must arrive at Gobaa at least HUB_TRANSFER_BUFFER_MINUTES (6 min) before
    const latestTrainArrivalAtGobaaM = busDepGobaaM - HUB_TRANSFER_BUFFER_MINUTES;

    const dayInfo = resolveTargetDayForBus(busDepGobaaM, currentTunisiaMinutes, currentDayOfWeek);
    const targetDayIsHoliday = dayInfo.isTomorrow ? isTomorrowHoliday : isHoliday;

    // Inbound trains: Tunis Central -> Gobaa
    // Filter strictly by day-of-week & holiday circulation rules
    const candidateTrains = ALL_SCHEDULES.filter((s) => s.direction === 'inbound')
      .filter((s) => isTrainRunningOnDay(s.days, dayInfo.targetDayOfWeek, targetDayIsHoliday))
      .map((s) => {
        const tunisStop = s.stops.find((st) => st.stationId === TUNIS_CENTRAL_ID);
        const gobaaStop = s.stops.find((st) => st.stationId === 'gobaa');
        if (!tunisStop || !gobaaStop) return null;
        const depTunisM = parseTimeToMinutes(tunisStop.time);
        const arrGobaaM = parseTimeToMinutes(gobaaStop.time);
        return {
          schedule: s,
          tunisTime: tunisStop.time,
          gobaaTime: gobaaStop.time,
          depTunisM,
          arrGobaaM
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => item.arrGobaaM <= latestTrainArrivalAtGobaaM && item.arrGobaaM >= latestTrainArrivalAtGobaaM - 45)
      .sort((a, b) => b.arrGobaaM - a.arrGobaaM); // latest train that still makes it in time

    const bestTrain = candidateTrains[0];

    if (bestTrain) {
      const transferWait = busDepGobaaM - bestTrain.arrGobaaM;
      const trainDuration = bestTrain.arrGobaaM - bestTrain.depTunisM;
      const totalDuration = trainDuration + transferWait + BUS_ESTIMATED_TRANSIT_MINUTES;

      // For return trip starting from Tunis: the countdown MUST be to the train departure from Tunis!
      const trainDepM = bestTrain.depTunisM;
      const trainDayInfo = resolveTargetDayForBus(trainDepM, currentTunisiaMinutes, currentDayOfWeek);

      results.push({
        id: `ret-${bus.line}-${busReturnTime}`,
        busTrip: bus,
        busLine: bus.line,
        direction: 'return_to_tebourba',
        busDeparture: busReturnTime,
        busArrival: formatMinutesToTime(busArrTebourbaM),
        transferWaitMins: transferWait,
        hasConnectingTrain: true,
        trainSchedule: bestTrain.schedule,
        trainDeparture: bestTrain.tunisTime,
        trainArrival: bestTrain.gobaaTime,
        trainDepartureStationName: 'تونس (ساحة برشلونة)',
        trainArrivalStationName: 'القباعة',
        totalDurationMins: totalDuration,
        firstLegDepartureTime: bestTrain.tunisTime, // Train departure from Tunis!
        remainingMinutesFromNow: trainDayInfo.remainingMinutes,
        isPassed: trainDayInfo.isPassed,
        isTomorrow: trainDayInfo.isTomorrow,
        targetDayOfWeek: dayInfo.targetDayOfWeek,
        isSundayNoService: dayInfo.isSundayNoService
      });
    } else {
      // No connecting train from Tunis exists before this bus departure (e.g. 04:55 bus from Gobaa)
      // DO NOT invent synthetic wait times or train durations!
      results.push({
        id: `ret-${bus.line}-${busReturnTime}`,
        busTrip: bus,
        busLine: bus.line,
        direction: 'return_to_tebourba',
        busDeparture: busReturnTime,
        busArrival: formatMinutesToTime(busArrTebourbaM),
        transferWaitMins: 0,
        hasConnectingTrain: false,
        totalDurationMins: BUS_ESTIMATED_TRANSIT_MINUTES,
        firstLegDepartureTime: busReturnTime,
        remainingMinutesFromNow: dayInfo.remainingMinutes,
        isPassed: dayInfo.isPassed,
        isTomorrow: dayInfo.isTomorrow,
        targetDayOfWeek: dayInfo.targetDayOfWeek,
        isSundayNoService: dayInfo.isSundayNoService
      });
    }
  }

  // Sort by bus return departure time chronologically
  results.sort((a, b) => parseTimeToMinutes(a.busDeparture) - parseTimeToMinutes(b.busDeparture));
  return results;
}
