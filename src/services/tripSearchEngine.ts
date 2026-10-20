import {
  LINES,
  ALL_SCHEDULES,
  Station,
  TrainSchedule,
  parseTimeToMinutes,
  isTrainRunningOnDay,
  TUNIS_CENTRAL_ID,
  findStationById
} from '../data/rfrData';
import { TRANSLATIONS, Language } from '../data/translations';
import { DirectTrip, InterlineTrip, AnyTrip, DaysBadgeInfo } from '../types/trips';

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
  lang: Language = 'ar'
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

      if (remaining < 0) {
        // Departs tomorrow morning!
        remaining += 1440;
        isNextDay = true;
        effectiveDayOfWeek = (currentDayOfWeek + 1) % 7;
      }

      // Evaluate train eligibility against the ACTUAL day of departure (today or tomorrow)
      const runsOnTargetDay = isTrainRunningOnDay(schedule.days, effectiveDayOfWeek);
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

/**
 * Pure function to calculate interline trips across different RFR lines via Tunis Central.
 */
export function findInterlineTrips(
  fromStation: Station,
  toStation: Station,
  currentTunisiaMinutes: number,
  currentDayOfWeek: number,
  lang: Language = 'ar'
): InterlineTrip[] {
  const leg1Trips = findDirectTrips(
    fromStation.id,
    TUNIS_CENTRAL_ID,
    fromStation.lineId,
    currentTunisiaMinutes,
    currentDayOfWeek,
    lang
  );
  const interlineTrips: InterlineTrip[] = [];

  for (const leg1 of leg1Trips.slice(0, 5)) {
    const leg1ArrMinutes = parseTimeToMinutes(leg1.arrivalTime);
    // Minimum 6 minutes walking buffer at Tunis central station
    const minTransferDepMinutes = leg1ArrMinutes + 6;

    // Leg 2: TUNIS_CENTRAL_ID -> toStation on toStation.lineId
    const leg2Candidates = findDirectTrips(
      TUNIS_CENTRAL_ID,
      toStation.id,
      toStation.lineId,
      minTransferDepMinutes,
      currentDayOfWeek,
      lang
    );

    if (leg2Candidates.length > 0) {
      const leg2 = leg2Candidates[0];
      const leg2DepMinutes = parseTimeToMinutes(leg2.departureTime);
      let transferWait = leg2DepMinutes - leg1ArrMinutes;
      if (transferWait < 0) transferWait += 1440;

      const totalDuration = leg1.durationMinutes + transferWait + leg2.durationMinutes;

      interlineTrips.push({
        type: 'interline',
        originStation: fromStation,
        destinationStation: toStation,
        leg1,
        leg2,
        transferWaitMinutes: transferWait,
        totalDurationMinutes: totalDuration,
        remainingMinutes: leg1.remainingMinutes,
        departureTime: leg1.departureTime,
        arrivalTime: leg2.arrivalTime,
        isNextDay: leg1.isNextDay
      });
    }
  }

  interlineTrips.sort((a, b) => a.remainingMinutes - b.remainingMinutes);
  return interlineTrips;
}

/**
 * Master query function deciding between direct or interline trips.
 */
export function searchTrips(
  fromStationId: string,
  toStationId: string,
  currentTunisiaMinutes: number,
  currentDayOfWeek: number,
  lang: Language = 'ar'
): AnyTrip[] {
  const fromStation = findStationById(fromStationId);
  const toStation = findStationById(toStationId);

  if (!fromStation || !toStation) return [];

  const isCrossLine = fromStation.lineId !== toStation.lineId;
  if (!isCrossLine) {
    return findDirectTrips(
      fromStationId,
      toStationId,
      fromStation.lineId,
      currentTunisiaMinutes,
      currentDayOfWeek,
      lang
    );
  } else {
    return findInterlineTrips(
      fromStation,
      toStation,
      currentTunisiaMinutes,
      currentDayOfWeek,
      lang
    );
  }
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
