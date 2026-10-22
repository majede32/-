import {
  ALL_BUS_TRIPS,
  BusTrip,
  parseTimeToMinutes,
  formatMinutesToTime,
  BUS_ESTIMATED_TRANSIT_MINUTES,
  HUB_TRANSFER_BUFFER_MINUTES
} from '../data/busConnectionData';
import { ALL_SCHEDULES, TUNIS_CENTRAL_ID, TrainSchedule } from '../data/rfrData';

export interface SynchronizedBusTrainConnection {
  busTrip: BusTrip;
  busLine: '42' | '116';
  direction: 'to_gobaa' | 'return_to_tebourba';
  busDeparture: string;
  busArrival: string;
  transferWaitMins: number;
  trainSchedule?: TrainSchedule;
  trainDeparture?: string;
  trainArrival?: string;
  trainDepartureStationName?: string;
  trainArrivalStationName?: string;
  totalDurationMins: number;
  remainingMinutesFromNow: number;
  isPassed: boolean;
}

/**
 * Finds the synchronized connection for travelers leaving Tebourba to Tunis via Gobaa
 */
export function getSynchronizedDeparturesFromTebourba(
  currentTunisiaMinutes: number,
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

    // Outbound trains: Gobaa -> Tunis Central
    // Find earliest train stopping at Gobaa after earliestTrainDepM
    const candidateTrains = ALL_SCHEDULES.filter((s) => s.direction === 'outbound')
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
    const trainDepTime = bestTrain ? bestTrain.gobaaTime : undefined;
    const trainArrTime = bestTrain ? bestTrain.tunisTime : undefined;
    const transferWait = bestTrain ? bestTrain.depM - busArrGobaaM : 10;
    const trainDuration = bestTrain ? bestTrain.arrM - bestTrain.depM : 28;
    const totalDuration = BUS_ESTIMATED_TRANSIT_MINUTES + transferWait + trainDuration;

    let remaining = busDepM - currentTunisiaMinutes;
    const isPassed = remaining < 0;
    if (remaining < 0) remaining += 1440;

    results.push({
      busTrip: bus,
      busLine: bus.line,
      direction: 'to_gobaa',
      busDeparture: bus.departureTime,
      busArrival: formatMinutesToTime(busArrGobaaM),
      transferWaitMins: transferWait,
      trainSchedule: bestTrain ? bestTrain.schedule : undefined,
      trainDeparture: trainDepTime,
      trainArrival: trainArrTime,
      trainDepartureStationName: 'القباعة',
      trainArrivalStationName: 'تونس (ساحة برشلونة)',
      totalDurationMins: totalDuration,
      remainingMinutesFromNow: remaining,
      isPassed
    });
  }

  // Sort by departure time
  results.sort((a, b) => parseTimeToMinutes(a.busDeparture) - parseTimeToMinutes(b.busDeparture));
  return results;
}

/**
 * Finds the synchronized connection for travelers returning from Tunis to Tebourba via Gobaa
 */
export function getSynchronizedReturnsFromGobaa(
  currentTunisiaMinutes: number,
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

    // To catch this return bus at Gobaa, passenger should arrive at Gobaa station at least 4 mins before bus departure
    const latestTrainArrivalAtGobaaM = busDepGobaaM - 4;

    // Inbound trains: Tunis Central -> Gobaa
    const candidateTrains = ALL_SCHEDULES.filter((s) => s.direction === 'inbound')
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
    const trainDepTime = bestTrain ? bestTrain.tunisTime : undefined;
    const trainArrTime = bestTrain ? bestTrain.gobaaTime : undefined;
    const transferWait = bestTrain ? busDepGobaaM - bestTrain.arrGobaaM : 10;
    const trainDuration = bestTrain ? bestTrain.arrGobaaM - bestTrain.depTunisM : 28;
    const totalDuration = trainDuration + transferWait + BUS_ESTIMATED_TRANSIT_MINUTES;

    let remaining = busDepGobaaM - currentTunisiaMinutes;
    const isPassed = remaining < 0;
    if (remaining < 0) remaining += 1440;

    results.push({
      busTrip: bus,
      busLine: bus.line,
      direction: 'return_to_tebourba',
      busDeparture: busReturnTime,
      busArrival: formatMinutesToTime(busArrTebourbaM),
      transferWaitMins: transferWait,
      trainSchedule: bestTrain ? bestTrain.schedule : undefined,
      trainDeparture: trainDepTime,
      trainArrival: trainArrTime,
      trainDepartureStationName: 'تونس (ساحة برشلونة)',
      trainArrivalStationName: 'القباعة',
      totalDurationMins: totalDuration,
      remainingMinutesFromNow: remaining,
      isPassed
    });
  }

  results.sort((a, b) => parseTimeToMinutes(a.busDeparture) - parseTimeToMinutes(b.busDeparture));
  return results;
}
