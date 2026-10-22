import {
  LINES,
  ALL_SCHEDULES,
  Station,
  TrainSchedule,
  parseTimeToMinutes,
  isTrainRunningOnDay,
  TUNIS_CENTRAL_ID,
  findStationById,
  formatMinutesToTime
} from '../data/rfrData';
import { TRANSLATIONS, Language } from '../data/translations';
import { DirectTrip, AnyTrip, DaysBadgeInfo } from '../types/trips';

/**
 * Returns human-readable circulation days badge info.
 */
export function getDaysBadgeInfo(days: TrainSchedule['days'], lang: Language): DaysBadgeInfo {
  const t = TRANSLATIONS[lang];
  switch (days) {
    case '-':
      return { short: 'Tous', full: t.allDays, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'A':
      return { short: 'A', full: t.weekdaysOnly, color: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'B':
      return { short: 'B (Dim.)', full: t.sundaysOnly, color: 'bg-purple-50 text-purple-800 border-purple-200' };
    case 'C':
      return { short: 'C', full: t.exceptSatSun, color: 'bg-blue-50 text-blue-800 border-blue-200' };
    case 'D':
      return { short: 'D', full: t.exceptSat, color: 'bg-slate-100 text-slate-800 border-slate-200' };
    default:
      return { short: days, full: days, color: 'bg-slate-100 text-slate-800 border-slate-200' };
  }
}

/**
 * Pure function to calculate all direct train trips between two stations on a specific line.
 */
export function findDirectTrips(
  fromId: string,
  toId: string,
  targetLineId: string,
  baseMinutes: number,
  currentDayOfWeek: number,
  lang: Language = 'ar',
  isHoliday: boolean = false,
  isTomorrowHoliday: boolean = false
): DirectTrip[] {
  const trips: DirectTrip[] = [];
  const line = LINES[targetLineId];
  if (!line) return trips;

  for (const schedule of ALL_SCHEDULES) {
    if (schedule.lineId !== targetLineId) continue;

    const fromIndex = schedule.stops.findIndex((s) => s.stationId === fromId);
    const toIndex = schedule.stops.findIndex((s) => s.stationId === toId);

    // Must stop at both, and fromIndex < toIndex (correct direction)
    if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
      const depTime = schedule.stops[fromIndex].time;
      const arrTime = schedule.stops[toIndex].time;
      const depMinutes = parseTimeToMinutes(depTime);
      const arrMinutes = parseTimeToMinutes(arrTime);

      let duration = arrMinutes - depMinutes;
      if (duration < 0) duration += 1440;

      let remaining = depMinutes - baseMinutes;
      let isNextDay = false;
      let effectiveDayOfWeek = currentDayOfWeek;
      let targetDayIsHoliday = isHoliday;

      if (remaining < 0) {
        // Departs tomorrow morning!
        remaining += 1440;
        isNextDay = true;
        effectiveDayOfWeek = (currentDayOfWeek + 1) % 7;
        targetDayIsHoliday = isTomorrowHoliday;
      }

      // Evaluate train eligibility against the ACTUAL day of departure (today or tomorrow) and holiday status
      const runsOnTargetDay = isTrainRunningOnDay(schedule.days, effectiveDayOfWeek, targetDayIsHoliday);
      if (!runsOnTargetDay) continue;

      // Build intermediate stops
      const slicedStops = schedule.stops.slice(fromIndex, toIndex + 1);
      const intermediateStops = slicedStops.map((st) => {
        const stObj = findStationById(st.stationId) || {
          id: st.stationId,
          nameAr: st.stationId,
          nameFr: st.stationId,
          nameEn: st.stationId,
          lineId: targetLineId,
          order: 0
        };
        const stopM = parseTimeToMinutes(st.time);
        return {
          station: stObj,
          time: st.time,
          passed: !isNextDay && baseMinutes > stopM
        };
      });

      const originSt = findStationById(fromId) || {
        id: fromId,
        nameAr: fromId,
        nameFr: fromId,
        nameEn: fromId,
        lineId: targetLineId,
        order: 0
      };
      const destSt = findStationById(toId) || {
        id: toId,
        nameAr: toId,
        nameFr: toId,
        nameEn: toId,
        lineId: targetLineId,
        order: 0
      };
      const badge = getDaysBadgeInfo(schedule.days, lang);

      trips.push({
        type: 'direct',
        schedule,
        departureTime: depTime,
        arrivalTime: arrTime,
        durationMinutes: duration,
        remainingMinutes: remaining,
        originStation: originSt,
        destinationStation: destSt,
        intermediateStops,
        isNextDay,
        dayBadgeText: badge.short
      });
    }
  }

  trips.sort((a, b) => a.remainingMinutes - b.remainingMinutes);
  return trips;
}

import {
  ALL_BUS_TRIPS,
  BUS_ESTIMATED_TRANSIT_MINUTES,
  HUB_TRANSFER_BUFFER_MINUTES
} from '../data/busConnectionData';
import { MultimodalBusTrainTrip } from '../types/trips';

/**
 * Pure function to calculate multimodal trips between Tebourba (feeder bus 42/116) and Line D stations via Gobaa.
 */
export function findMultimodalBusTrips(
  fromStationId: string,
  toStationId: string,
  currentTunisiaMinutes: number,
  currentDayOfWeek: number,
  lang: Language = 'ar',
  isHoliday: boolean = false,
  isTomorrowHoliday: boolean = false
): MultimodalBusTrainTrip[] {
  const fromStation = findStationById(fromStationId);
  const toStation = findStationById(toStationId);
  if (!fromStation || !toStation) return [];

  const trips: MultimodalBusTrainTrip[] = [];

  // Direction 1: Tebourba -> Gobaa (Bus) -> Line D Station (Train)
  if (fromStationId === 'tebourba_bus' && toStationId !== 'tebourba_bus') {
    const hubStation = findStationById('gobaa') || fromStation;
    for (const bus of ALL_BUS_TRIPS) {
      const busDepM = parseTimeToMinutes(bus.departureTime);
      const busArrGobaaM = busDepM + BUS_ESTIMATED_TRANSIT_MINUTES;
      const trainMinDepM = busArrGobaaM + HUB_TRANSFER_BUFFER_MINUTES;

      // Find trains from Gobaa to toStationId
      const connectingTrains = findDirectTrips(
        'gobaa',
        toStationId,
        'D',
        trainMinDepM,
        currentDayOfWeek,
        lang,
        isHoliday,
        isTomorrowHoliday
      );

      if (connectingTrains.length > 0) {
        const trainTrip = connectingTrains[0];
        const trainDepM = parseTimeToMinutes(trainTrip.departureTime);
        const transferWait = trainDepM - busArrGobaaM;
        const totalDuration = BUS_ESTIMATED_TRANSIT_MINUTES + transferWait + trainTrip.durationMinutes;

        let remaining = busDepM - currentTunisiaMinutes;
        let isNextDay = false;
        if (remaining < 0) {
          remaining += 1440;
          isNextDay = true;
        }

        trips.push({
          type: 'multimodal_bus',
          direction: 'tebourba_to_tunis',
          busLine: bus.line,
          busDeparture: bus.departureTime,
          busArrival: formatMinutesToTime(busArrGobaaM),
          transferStation: hubStation,
          transferWaitMinutes: Math.max(0, transferWait),
          trainTrip,
          departureTime: bus.departureTime,
          arrivalTime: trainTrip.arrivalTime,
          durationMinutes: totalDuration,
          remainingMinutes: remaining,
          originStation: fromStation,
          destinationStation: toStation,
          isNextDay,
          dayBadgeText: `حافلة ${bus.line} + قطار D`
        });
      }
    }
  }

  // Direction 2: Line D Station (Train) -> Gobaa -> Tebourba (Bus return)
  if (fromStationId !== 'tebourba_bus' && toStationId === 'tebourba_bus') {
    const hubStation = findStationById('gobaa') || toStation;
    const returnBuses = ALL_BUS_TRIPS.filter((b) => Boolean(b.returnTime));

    for (const bus of returnBuses) {
      const busDepGobaaM = parseTimeToMinutes(bus.returnTime!);
      const latestTrainArrivalAtGobaaM = busDepGobaaM - 4;

      // Find inbound trains from fromStationId to gobaa
      const candidateTrains = findDirectTrips(
        fromStationId,
        'gobaa',
        'D',
        Math.max(0, latestTrainArrivalAtGobaaM - 90),
        currentDayOfWeek,
        lang,
        isHoliday,
        isTomorrowHoliday
      ).filter((t) => {
        const arrM = parseTimeToMinutes(t.arrivalTime);
        return arrM <= latestTrainArrivalAtGobaaM && arrM >= latestTrainArrivalAtGobaaM - 45;
      }).sort((a, b) => parseTimeToMinutes(b.arrivalTime) - parseTimeToMinutes(a.arrivalTime));

      if (candidateTrains.length > 0) {
        const trainTrip = candidateTrains[0];
        const trainArrM = parseTimeToMinutes(trainTrip.arrivalTime);
        const transferWait = busDepGobaaM - trainArrM;
        const trainDuration = trainTrip.durationMinutes;
        const totalDuration = trainDuration + transferWait + BUS_ESTIMATED_TRANSIT_MINUTES;

        const trainDepM = parseTimeToMinutes(trainTrip.departureTime);
        let remaining = trainDepM - currentTunisiaMinutes;
        let isNextDay = false;
        if (remaining < 0) {
          remaining += 1440;
          isNextDay = true;
        }

        const busArrTebourbaM = busDepGobaaM + BUS_ESTIMATED_TRANSIT_MINUTES;

        trips.push({
          type: 'multimodal_bus',
          direction: 'tunis_to_tebourba',
          busLine: bus.line,
          busDeparture: bus.returnTime!,
          busArrival: formatMinutesToTime(busArrTebourbaM),
          transferStation: hubStation,
          transferWaitMinutes: Math.max(0, transferWait),
          trainTrip,
          departureTime: trainTrip.departureTime,
          arrivalTime: formatMinutesToTime(busArrTebourbaM),
          durationMinutes: totalDuration,
          remainingMinutes: remaining,
          originStation: fromStation,
          destinationStation: toStation,
          isNextDay,
          dayBadgeText: `قطار D + حافلة ${bus.line}`
        });
      }
    }
  }

  trips.sort((a, b) => a.remainingMinutes - b.remainingMinutes);
  return trips;
}

/**
 * Master query function returning direct Line D trips or Tebourba feeder bus connections.
 */
export function searchTrips(
  fromStationId: string,
  toStationId: string,
  currentTunisiaMinutes: number,
  currentDayOfWeek: number,
  lang: Language = 'ar',
  isHoliday: boolean = false,
  isTomorrowHoliday: boolean = false
): AnyTrip[] {
  if (fromStationId === toStationId) return [];

  // Multimodal Bus-Train connections
  if (fromStationId === 'tebourba_bus' || toStationId === 'tebourba_bus') {
    return findMultimodalBusTrips(
      fromStationId,
      toStationId,
      currentTunisiaMinutes,
      currentDayOfWeek,
      lang,
      isHoliday,
      isTomorrowHoliday
    );
  }

  const fromStation = findStationById(fromStationId);
  const toStation = findStationById(toStationId);

  if (!fromStation || !toStation) return [];
  if (fromStation.lineId !== toStation.lineId) return [];

  return findDirectTrips(
    fromStationId,
    toStationId,
    fromStation.lineId,
    currentTunisiaMinutes,
    currentDayOfWeek,
    lang,
    isHoliday,
    isTomorrowHoliday
  );
}

/**
 * Formats remaining minutes into localized human-friendly string.
 */
export function formatRemainingTime(mins: number, lang: Language): string {
  const t = TRANSLATIONS[lang];
  if (mins <= 0) return t.departsNow;
  if (mins < 60) return `${mins} ${t.minutes}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} ${t.hours} ${m} ${t.minutes}` : `${h} ${t.hours}`;
}
