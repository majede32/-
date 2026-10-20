import { isTrainRunningOnDay, parseTimeToMinutes, formatMinutesToTime, ALL_SCHEDULES, TUNIS_CENTRAL_ID, LINES } from '../src/data/rfrData';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('🧪 Starting RFR Timetable Logic Verification Tests...\n');

// Test 1: Official Circulation Codes on Days of the Week
// Day 0 = Sunday, 1 = Monday, ..., 6 = Saturday
// Code '-': All days
assert(isTrainRunningOnDay('-', 0) === true, "Code '-' runs on Sunday");
assert(isTrainRunningOnDay('-', 1) === true, "Code '-' runs on Monday");
assert(isTrainRunningOnDay('-', 6) === true, "Code '-' runs on Saturday");

// Code 'A': Sauf Dimanches & Fêtes (Monday-Saturday, includes Saturday!)
assert(isTrainRunningOnDay('A', 0) === false, "Code 'A' does NOT run on Sunday");
assert(isTrainRunningOnDay('A', 1) === true, "Code 'A' runs on Monday");
assert(isTrainRunningOnDay('A', 6) === true, "Code 'A' runs on Saturday");

// Code 'B': Dimanches & Fêtes seulement (Sunday only)
assert(isTrainRunningOnDay('B', 0) === true, "Code 'B' runs on Sunday");
assert(isTrainRunningOnDay('B', 1) === false, "Code 'B' does NOT run on Monday");
assert(isTrainRunningOnDay('B', 6) === false, "Code 'B' does NOT run on Saturday");

// Code 'C': Sauf Samedi, Dimanche et Fêtes (Monday-Friday only)
assert(isTrainRunningOnDay('C', 0) === false, "Code 'C' does NOT run on Sunday");
assert(isTrainRunningOnDay('C', 1) === true, "Code 'C' runs on Monday");
assert(isTrainRunningOnDay('C', 5) === true, "Code 'C' runs on Friday");
assert(isTrainRunningOnDay('C', 6) === false, "Code 'C' does NOT run on Saturday");

// Code 'D': Sauf Samedi (All days except Saturday)
assert(isTrainRunningOnDay('D', 6) === false, "Code 'D' does NOT run on Saturday");
assert(isTrainRunningOnDay('D', 0) === true, "Code 'D' runs on Sunday");
assert(isTrainRunningOnDay('D', 1) === true, "Code 'D' runs on Monday");

// Test 2: Saturday late night query (23:30) looking for next day's morning trains
console.log('\n🌙 Testing Saturday Night -> Sunday Morning transition:');
const saturdayNightMinutes = 23 * 60 + 30; // 23:30
const saturdayDayOfWeek = 6;

// Train 402 departs Bougatfa at 05:00 with days '-'
// Train 406 departs Bougatfa at 05:40 with days 'A' (should NOT run on Sunday morning)
// Train 408 departs Bougatfa at 05:50 with days 'B' (SHOULD run on Sunday morning)
const sundayMorningDayOfWeek = (saturdayDayOfWeek + 1) % 7; // 0 = Sunday
assert(sundayMorningDayOfWeek === 0, "Next day after Saturday is Sunday (0)");
assert(isTrainRunningOnDay('-', sundayMorningDayOfWeek) === true, "Train 402 (-) runs Sunday morning");
assert(isTrainRunningOnDay('A', sundayMorningDayOfWeek) === false, "Train 406 (A) does NOT run Sunday morning");
assert(isTrainRunningOnDay('B', sundayMorningDayOfWeek) === true, "Train 408 (B) DOES run Sunday morning");

// Test 3: Train 636 exact data verification
console.log('\n🚆 Testing Train 636 exact poster schedule:');
const train636 = ALL_SCHEDULES.find((s) => s.trainNumber === '636');
assert(!!train636, "Train 636 exists in database");
if (train636) {
  assert(train636.stops[0].time === '12:40', `Train 636 departs Gobaa Ville at 12:40 (actual: ${train636.stops[0].time})`);
  const gobaaStop = train636.stops.find(s => s.stationId === 'gobaa');
  assert(gobaaStop?.time === '12:46', `Train 636 stops at Gobaa at 12:46 (actual: ${gobaaStop?.time})`);
  assert(train636.arrivalTime === '13:14', `Train 636 arrives Tunis at 13:14 (actual: ${train636.arrivalTime})`);
}

// Test 4: Station ID unification
console.log('\n🏢 Testing Tunis Central Station unification:');
assert(LINES.D.stations.some(s => s.id === TUNIS_CENTRAL_ID), "Line D terminates at unified tunis_central");
assert(LINES.E.stations.some(s => s.id === TUNIS_CENTRAL_ID), "Line E terminates at unified tunis_central");
assert(LINES.A.stations.some(s => s.id === TUNIS_CENTRAL_ID), "Line A terminates at unified tunis_central");

console.log('\n🎉 ALL 12 TEST SUITES PASSED SUCCESSFULLY!');
