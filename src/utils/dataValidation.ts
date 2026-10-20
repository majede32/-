import { LINES, ALL_SCHEDULES, parseTimeToMinutes, TrainSchedule } from '../data/rfrData';

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalLines: number;
    totalStations: number;
    totalSchedules: number;
  };
}

/**
 * Validates integrity of RFR timetable data, checking station IDs,
 * temporal monotonicity of stops, and uniqueness of train numbers per line.
 */
export function validateRFRDataset(): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const lineList = Object.values(LINES);
  const lineIds = new Set(lineList.map((l) => l.id));
  const stationMap = new Map<string, Set<string>>();

  let totalStations = 0;
  for (const line of lineList) {
    const sIds = new Set<string>();
    for (const st of line.stations) {
      if (sIds.has(st.id)) {
        errors.push(`Duplicate station ID "${st.id}" in line ${line.id}`);
      }
      sIds.add(st.id);
      totalStations++;
    }
    stationMap.set(line.id, sIds);
  }

  const seenTrainKeys = new Set<string>();
  let totalSchedules = 0;

  for (const sched of ALL_SCHEDULES) {
    totalSchedules++;

    if (!lineIds.has(sched.lineId)) {
      errors.push(`Schedule found for unknown line ID "${sched.lineId}"`);
    }

    const validStationsForLine = stationMap.get(sched.lineId) || new Set();

    // Check unique train ID per line and direction
    const trainKey = `${sched.lineId}-${sched.direction}-${sched.trainNumber}`;
    if (seenTrainKeys.has(trainKey)) {
      warnings.push(`Duplicate train entry "${trainKey}"`);
    }
    seenTrainKeys.add(trainKey);

    // Check stops
    if (!sched.stops || sched.stops.length === 0) {
      errors.push(`Train ${sched.trainNumber} has no stops defined.`);
      continue;
    }

    let lastTimeMin = -1;
    for (const stop of sched.stops) {
      // Station ID check
      if (!validStationsForLine.has(stop.stationId)) {
        errors.push(
          `Train ${sched.trainNumber} references station "${stop.stationId}" not present in line ${sched.lineId}`
        );
      }

      // Time format check
      const timeMin = parseTimeToMinutes(stop.time);
      if (timeMin === -1) {
        errors.push(
          `Train ${sched.trainNumber} has invalid time "${stop.time}" at station ${stop.stationId}`
        );
      } else {
        // Monotonicity check (taking into account overnight trains)
        if (timeMin < lastTimeMin) {
          const isMidnightCrossing = lastTimeMin > 23 * 60 && timeMin < 2 * 60;
          if (!isMidnightCrossing) {
            errors.push(
              `Train ${sched.trainNumber} time non-monotonic: ${stop.time} after previous stop (${lastTimeMin} min)`
            );
          }
        }
        lastTimeMin = timeMin;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalLines: lineList.length,
      totalStations,
      totalSchedules
    }
  };
}
