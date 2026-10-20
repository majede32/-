import { ALL_SCHEDULES, LINES, TUNIS_CENTRAL_ID, parseTimeToMinutes } from '../src/data/rfrData';

console.log('🔍 Validating Tunis RFR schedules and stations dataset...');

let errorsCount = 0;

function reportError(msg: string) {
  console.error(`❌ Validation Error: ${msg}`);
  errorsCount++;
}

// 1. Validate Lines and Stations
const allStationIds = new Set<string>();
for (const [lineKey, line] of Object.entries(LINES)) {
  if (!line.stations || line.stations.length === 0) {
    reportError(`Line ${lineKey} has no stations defined.`);
  }
  line.stations.forEach((st, idx) => {
    if (!st.id || !st.nameAr || !st.nameFr) {
      reportError(`Station at index ${idx} in Line ${lineKey} is missing required fields (id, nameAr, nameFr).`);
    }
    allStationIds.add(st.id);
  });
}

// Ensure Tunis Central is present
if (!allStationIds.has(TUNIS_CENTRAL_ID)) {
  reportError(`Unified Tunis Central Station (${TUNIS_CENTRAL_ID}) is missing!`);
}

// 2. Validate Schedules
if (!ALL_SCHEDULES || ALL_SCHEDULES.length === 0) {
  reportError('ALL_SCHEDULES dataset is empty!');
}

console.log(`📊 Checking ${ALL_SCHEDULES.length} train schedules across all lines...`);

ALL_SCHEDULES.forEach((train) => {
  if (!train.trainNumber) {
    reportError(`Train with missing trainNumber found.`);
    return;
  }

  if (!train.stops || train.stops.length < 2) {
    reportError(`Train ${train.trainNumber} has fewer than 2 stops.`);
  }

  // Check valid circulation code
  const validCodes = ['-', 'A', 'B', 'C', 'D'];
  if (!validCodes.includes(train.days)) {
    reportError(`Train ${train.trainNumber} has unrecognized circulation days code: "${train.days}".`);
  }

  // Check stops
  let lastMinutes = -1;
  train.stops.forEach((stop, idx) => {
    if (!allStationIds.has(stop.stationId)) {
      reportError(`Train ${train.trainNumber} stop #${idx} references unknown stationId: "${stop.stationId}".`);
    }

    const minutes = parseTimeToMinutes(stop.time);
    if (isNaN(minutes)) {
      reportError(`Train ${train.trainNumber} has invalid stop time format "${stop.time}" at station ${stop.stationId}.`);
    }

    if (idx === 0) {
      if (stop.time !== train.departureTime) {
        reportError(`Train ${train.trainNumber} departureTime (${train.departureTime}) does not match first stop time (${stop.time}).`);
      }
    }
    if (idx === train.stops.length - 1) {
      if (stop.time !== train.arrivalTime) {
        reportError(`Train ${train.trainNumber} arrivalTime (${train.arrivalTime}) does not match last stop time (${stop.time}).`);
      }
    }

    // Monotonic time check
    if (idx > 0 && minutes < lastMinutes) {
      // unless crossing midnight (e.g., 23:55 -> 00:10)
      const isMidnightCross = lastMinutes > 23 * 60 && minutes < 2 * 60;
      if (!isMidnightCross) {
        reportError(`Train ${train.trainNumber} stop times are not chronological: ${stop.time} comes after previous stop (${lastMinutes} min).`);
      }
    }
    lastMinutes = minutes;
  });
});

if (errorsCount > 0) {
  console.error(`\n💥 Dataset validation FAILED with ${errorsCount} error(s)! Build aborted.`);
  process.exit(1);
}

console.log(`✅ Dataset validation PASSED successfully! All ${ALL_SCHEDULES.length} trains and stations are 100% consistent.\n`);
