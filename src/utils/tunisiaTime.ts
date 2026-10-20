import { checkTunisianHoliday, TunisianHoliday } from './tunisianHolidays';

export interface TunisiaTimeInfo {
  date: Date;
  year: number;
  month: number; // 1-12
  day: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  hours: number;
  minutes: number;
  totalMinutes: number; // hours * 60 + minutes
  formattedTime: string; // "HH:mm"
  formattedDateAr: string;
  formattedDateFr: string;
  formattedDateEn: string;
  isSunday: boolean;
  isSundayOrHoliday: boolean;
  isHoliday: boolean;
  holiday?: TunisianHoliday;
  isSaturday: boolean;
  isWeekday: boolean;
}

/**
 * Returns current date and time in Tunisia (Africa/Tunis, CET/UTC+1, no DST).
 * If simulatedMinutes, simulatedDayOfWeek, or simulatedDate are provided, overrides accordingly.
 */
export function getTunisiaTime(
  simulatedMinutes: number | null = null,
  simulatedDayOfWeek: number | null = null,
  simulatedDateObj: { year?: number; month?: number; day?: number } | null = null
): TunisiaTimeInfo {
  const now = new Date();

  // Robust formatting via Intl.DateTimeFormat with Africa/Tunis
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Tunis',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  let year = parseInt(partMap.year, 10);
  let month = parseInt(partMap.month, 10);
  let day = parseInt(partMap.day, 10);
  let hours = parseInt(partMap.hour, 10);
  if (hours === 24) hours = 0; // Fix edge case
  let minutes = parseInt(partMap.minute, 10);

  // Day of week calculation in Africa/Tunis
  const weekdayShort = partMap.weekday; // 'Sun', 'Mon', etc.
  const daysMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };
  let dayOfWeek = daysMap[weekdayShort] ?? now.getDay();

  // If specific date is simulated
  if (simulatedDateObj) {
    if (simulatedDateObj.year) year = simulatedDateObj.year;
    if (simulatedDateObj.month) month = simulatedDateObj.month;
    if (simulatedDateObj.day) day = simulatedDateObj.day;
  }

  // If time in minutes is simulated
  if (simulatedMinutes !== null) {
    hours = Math.floor(simulatedMinutes / 60) % 24;
    minutes = simulatedMinutes % 60;
  }

  // If day of week is explicitly simulated
  if (simulatedDayOfWeek !== null) {
    dayOfWeek = simulatedDayOfWeek;
  }

  const totalMinutes = hours * 60 + minutes;
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  // Check official Tunisian public holidays
  const holidayCheck = checkTunisianHoliday(year, month, day);
  const isSunday = dayOfWeek === 0;
  const isHoliday = holidayCheck.isHoliday;
  const isSundayOrHoliday = isSunday || isHoliday;
  const isSaturday = dayOfWeek === 6;
  const isWeekday = !isSundayOrHoliday && dayOfWeek >= 1 && dayOfWeek <= 5;

  // Localized date strings
  const targetDate = new Date(year, month - 1, day, hours, minutes);
  const formattedDateAr = targetDate.toLocaleDateString('ar-TN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
  const formattedDateFr = targetDate.toLocaleDateString('fr-TN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
  const formattedDateEn = targetDate.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  return {
    date: targetDate,
    year,
    month,
    day,
    dayOfWeek,
    hours,
    minutes,
    totalMinutes,
    formattedTime,
    formattedDateAr,
    formattedDateFr,
    formattedDateEn,
    isSunday,
    isSundayOrHoliday,
    isHoliday,
    holiday: holidayCheck.holiday,
    isSaturday,
    isWeekday
  };
}
