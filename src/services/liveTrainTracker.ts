import {
  ALL_SCHEDULES,
  LINES,
  Station,
  TrainSchedule,
  parseTimeToMinutes,
  formatMinutesToTime,
  isTrainRunningOnDay,
  findStationById,
  TEBOURBA_BUS_STATION
} from '../data/rfrData';
import { ALL_BUS_TRIPS, isBusOperatingDay, BUS_ESTIMATED_TRANSIT_MINUTES } from '../data/busConnectionData';
import { calculateDistanceKm } from '../utils/geo';

export interface LiveTrainPosition {
  trainNumber: string;
  lineId: string;
  direction: 'outbound' | 'inbound';
  departureTime: string;
  arrivalTime: string;
  originStation: Station;
  destinationStation: Station;
  days: string;
  status: 'at_station' | 'in_transit' | 'departing_soon';
  currentStation?: Station;
  previousStation?: Station;
  nextStation?: Station;
  segmentProgress: number; // 0 to 1 between previousStation and nextStation
  totalTripProgress: number; // 0 to 1 for entire journey
  minutesToNextStation: number;
  currentLat: number;
  currentLng: number;
  estimatedSpeedKmh: number;
  statusLabelAr: string;
  statusLabelFr: string;
  statusLabelEn: string;
  dwellRemainingMins?: number;
}

export interface LiveBusPosition {
  busId: string;
  line: '42' | '116';
  direction: 'tebourba_to_gobaa' | 'gobaa_to_tebourba';
  departureTime: string;
  arrivalTime: string;
  originStation: Station;
  destinationStation: Station;
  status: 'in_transit' | 'departing_soon';
  progress: number;
  currentLat: number;
  currentLng: number;
  minutesToArrival: number;
  statusLabelAr: string;
  statusLabelFr: string;
  statusLabelEn: string;
}

export interface LiveTransitSnapshot {
  targetMinutes: number;
  formattedTime: string;
  activeTrains: LiveTrainPosition[];
  activeBuses: LiveBusPosition[];
  nextUpcomingTrain: LiveTrainPosition | null;
  totalActiveCount: number;
}

/**
 * Calculates live positions of all active Line D trains and feeder buses at any given minute of the day.
 */
export function getLiveTransitPositions(
  targetMinutes: number,
  currentDayOfWeek: number,
  isHoliday: boolean = false
): LiveTransitSnapshot {
  const activeTrains: LiveTrainPosition[] = [];
  const activeBuses: LiveBusPosition[] = [];
  let nextUpcomingTrain: LiveTrainPosition | null = null;
  let minUpcomingDiff = Infinity;

  // 1. Process Train Schedules
  for (const schedule of ALL_SCHEDULES) {
    if (schedule.lineId !== 'D') continue;

    // Circulation day check
    if (!isTrainRunningOnDay(schedule.days, currentDayOfWeek, isHoliday)) {
      continue;
    }

    const firstStop = schedule.stops[0];
    const lastStop = schedule.stops[schedule.stops.length - 1];
    const depM = parseTimeToMinutes(firstStop.time);
    const arrM = parseTimeToMinutes(lastStop.time);

    const originStation = findStationById(firstStop.stationId);
    const destinationStation = findStationById(lastStop.stationId);
    if (
      !originStation ||
      !destinationStation ||
      typeof originStation.lat !== 'number' ||
      typeof originStation.lng !== 'number' ||
      typeof destinationStation.lat !== 'number' ||
      typeof destinationStation.lng !== 'number'
    ) {
      continue;
    }

    // A) Is train currently on track? (depM <= targetMinutes <= arrM)
    if (targetMinutes >= depM && targetMinutes <= arrM) {
      const totalTripDuration = Math.max(1, arrM - depM);
      const totalTripProgress = Math.min(1, Math.max(0, (targetMinutes - depM) / totalTripDuration));

      let currentLat = originStation.lat;
      let currentLng = originStation.lng;
      let status: 'at_station' | 'in_transit' = 'at_station';
      let currentStation: Station | undefined;
      let previousStation: Station | undefined;
      let nextStation: Station | undefined;
      let segmentProgress = 0;
      let minutesToNextStation = 0;
      let estimatedSpeedKmh = 50;
      let statusLabelAr = '';
      let statusLabelFr = '';
      let statusLabelEn = '';

      // Check if train is stopped exactly at a station
      const exactStopIndex = schedule.stops.findIndex((s) => parseTimeToMinutes(s.time) === targetMinutes);

      if (exactStopIndex !== -1) {
        status = 'at_station';
        currentStation = findStationById(schedule.stops[exactStopIndex].stationId) || originStation;
        currentLat = currentStation.lat || originStation.lat;
        currentLng = currentStation.lng || originStation.lng;
        previousStation = currentStation;
        segmentProgress = 1;

        if (exactStopIndex < schedule.stops.length - 1) {
          nextStation = findStationById(schedule.stops[exactStopIndex + 1].stationId);
          const nextTimeM = parseTimeToMinutes(schedule.stops[exactStopIndex + 1].time);
          minutesToNextStation = Math.max(0, nextTimeM - targetMinutes);
        }

        statusLabelAr = `متوقف في محطة ${currentStation.nameAr}`;
        statusLabelFr = `À l'arrêt à ${currentStation.nameFr}`;
        statusLabelEn = `Stopped at ${currentStation.nameEn}`;
      } else {
        // Train is moving between two stops
        status = 'in_transit';
        for (let i = 0; i < schedule.stops.length - 1; i++) {
          const sA = schedule.stops[i];
          const sB = schedule.stops[i + 1];
          const tA = parseTimeToMinutes(sA.time);
          const tB = parseTimeToMinutes(sB.time);

          if (targetMinutes > tA && targetMinutes < tB) {
            previousStation = findStationById(sA.stationId) || originStation;
            nextStation = findStationById(sB.stationId) || destinationStation;

            const segDuration = Math.max(1, tB - tA);
            const segElapsed = targetMinutes - tA;
            segmentProgress = segElapsed / segDuration;
            minutesToNextStation = tB - targetMinutes;

            const latA: number = previousStation.lat ?? originStation.lat!;
            const lngA: number = previousStation.lng ?? originStation.lng!;
            const latB: number = nextStation.lat ?? destinationStation.lat!;
            const lngB: number = nextStation.lng ?? destinationStation.lng!;

            currentLat = latA + (latB - latA) * segmentProgress;
            currentLng = lngA + (lngB - lngA) * segmentProgress;

            const segDistKm = calculateDistanceKm(latA, lngA, latB, lngB);
            estimatedSpeedKmh = Math.max(25, Math.min(80, Math.round((segDistKm / (segDuration / 60)))));

            statusLabelAr = `في الطريق نحو ${nextStation.nameAr} (الوصول بعد ${minutesToNextStation} دق)`;
            statusLabelFr = `En route vers ${nextStation.nameFr} (Arrivée dans ${minutesToNextStation} min)`;
            statusLabelEn = `En route to ${nextStation.nameEn} (ETA ${minutesToNextStation} min)`;
            break;
          }
        }
      }

      activeTrains.push({
        trainNumber: schedule.trainNumber,
        lineId: 'D',
        direction: schedule.direction,
        departureTime: firstStop.time,
        arrivalTime: lastStop.time,
        originStation,
        destinationStation,
        days: schedule.days,
        status,
        currentStation,
        previousStation,
        nextStation,
        segmentProgress,
        totalTripProgress,
        minutesToNextStation,
        currentLat: Math.round(currentLat * 100000) / 100000,
        currentLng: Math.round(currentLng * 100000) / 100000,
        estimatedSpeedKmh,
        statusLabelAr,
        statusLabelFr,
        statusLabelEn
      });
    } else if (depM > targetMinutes) {
      // B) Train departing in the future today
      const diff = depM - targetMinutes;
      if (diff < minUpcomingDiff) {
        minUpcomingDiff = diff;
        nextUpcomingTrain = {
          trainNumber: schedule.trainNumber,
          lineId: 'D',
          direction: schedule.direction,
          departureTime: firstStop.time,
          arrivalTime: lastStop.time,
          originStation,
          destinationStation,
          days: schedule.days,
          status: 'departing_soon',
          currentStation: originStation,
          nextStation: findStationById(schedule.stops[1]?.stationId),
          segmentProgress: 0,
          totalTripProgress: 0,
          minutesToNextStation: diff,
          currentLat: originStation.lat,
          currentLng: originStation.lng,
          estimatedSpeedKmh: 0,
          statusLabelAr: `ينطلق في ${firstStop.time} (خلال ${diff} دقيقة) من ${originStation.nameAr}`,
          statusLabelFr: `Départ à ${firstStop.time} (dans ${diff} min) de ${originStation.nameFr}`,
          statusLabelEn: `Departs at ${firstStop.time} (in ${diff} min) from ${originStation.nameEn}`
        };
      }
    }
  }

  // 2. Process Feeder Bus Trips (Tebourba ⇄ Gobaa)
  if (isBusOperatingDay(currentDayOfWeek) && !isHoliday) {
    const tebourbaStation = TEBOURBA_BUS_STATION;
    const gobaaStation = findStationById('gobaa');

    if (tebourbaStation.lat && tebourbaStation.lng && gobaaStation?.lat && gobaaStation?.lng) {
      for (const bus of ALL_BUS_TRIPS) {
        // Outbound: Tebourba -> Gobaa
        const depTebourbaM = parseTimeToMinutes(bus.departureTime);
        const arrGobaaM = depTebourbaM + BUS_ESTIMATED_TRANSIT_MINUTES;

        if (targetMinutes >= depTebourbaM && targetMinutes <= arrGobaaM) {
          const elapsed = targetMinutes - depTebourbaM;
          const progress = elapsed / BUS_ESTIMATED_TRANSIT_MINUTES;
          const minsToArr = arrGobaaM - targetMinutes;

          const lat = tebourbaStation.lat + (gobaaStation.lat - tebourbaStation.lat) * progress;
          const lng = tebourbaStation.lng + (gobaaStation.lng - tebourbaStation.lng) * progress;

          activeBuses.push({
            busId: `bus-${bus.id}-out`,
            line: bus.line,
            direction: 'tebourba_to_gobaa',
            departureTime: bus.departureTime,
            arrivalTime: formatMinutesToTime(arrGobaaM),
            originStation: tebourbaStation,
            destinationStation: gobaaStation,
            status: 'in_transit',
            progress,
            currentLat: Math.round(lat * 100000) / 100000,
            currentLng: Math.round(lng * 100000) / 100000,
            minutesToArrival: minsToArr,
            statusLabelAr: `حافلة الخط ${bus.line}: في الطريق نحو محطة القباعة (تصل بعد ${minsToArr} دق)`,
            statusLabelFr: `Bus ${bus.line} : En route vers Gobâa (ETA ${minsToArr} min)`,
            statusLabelEn: `Bus ${bus.line}: En route to Gobaa (ETA ${minsToArr} min)`
          });
        }

        // Return: Gobaa -> Tebourba
        if (bus.returnTime) {
          const depGobaaM = parseTimeToMinutes(bus.returnTime);
          const arrTebourbaM = depGobaaM + BUS_ESTIMATED_TRANSIT_MINUTES;

          if (targetMinutes >= depGobaaM && targetMinutes <= arrTebourbaM) {
            const elapsed = targetMinutes - depGobaaM;
            const progress = elapsed / BUS_ESTIMATED_TRANSIT_MINUTES;
            const minsToArr = arrTebourbaM - targetMinutes;

            const lat = gobaaStation.lat + (tebourbaStation.lat - gobaaStation.lat) * progress;
            const lng = gobaaStation.lng + (tebourbaStation.lng - gobaaStation.lng) * progress;

            activeBuses.push({
              busId: `bus-${bus.id}-ret`,
              line: bus.line,
              direction: 'gobaa_to_tebourba',
              departureTime: bus.returnTime,
              arrivalTime: formatMinutesToTime(arrTebourbaM),
              originStation: gobaaStation,
              destinationStation: tebourbaStation,
              status: 'in_transit',
              progress,
              currentLat: Math.round(lat * 100000) / 100000,
              currentLng: Math.round(lng * 100000) / 100000,
              minutesToArrival: minsToArr,
              statusLabelAr: `حافلة الخط ${bus.line}: في طريق العودة نحو طبربة (تصل بعد ${minsToArr} دق)`,
              statusLabelFr: `Bus ${bus.line} : Retour vers Tébourba (ETA ${minsToArr} min)`,
              statusLabelEn: `Bus ${bus.line}: Returning to Tebourba (ETA ${minsToArr} min)`
            });
          }
        }
      }
    }
  }

  return {
    targetMinutes,
    formattedTime: formatMinutesToTime(targetMinutes),
    activeTrains,
    activeBuses,
    nextUpcomingTrain,
    totalActiveCount: activeTrains.length + activeBuses.length
  };
}
