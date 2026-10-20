export interface TunisianHoliday {
  nameAr: string;
  nameFr: string;
  nameEn: string;
  month: number; // 1-12
  day: number;
  year?: number; // if lunar holiday specific to a year
}

// Official fixed Tunisian national public holidays
const FIXED_HOLIDAYS: TunisianHoliday[] = [
  { month: 1, day: 1, nameAr: 'رأس السنة الميلادية', nameFr: 'Jour de l’An', nameEn: 'New Year’s Day' },
  { month: 1, day: 14, nameAr: 'عيد الثورة', nameFr: 'Fête de la Révolution', nameEn: 'Revolution Day' },
  { month: 3, day: 20, nameAr: 'عيد الاستقلال', nameFr: 'Fête de l’Indépendance', nameEn: 'Independence Day' },
  { month: 4, day: 9, nameAr: 'عيد الشهداء', nameFr: 'Fête des Martyrs', nameEn: 'Martyrs’ Day' },
  { month: 5, day: 1, nameAr: 'عيد الشغل', nameFr: 'Fête du Travail', nameEn: 'Labor Day' },
  { month: 7, day: 25, nameAr: 'عيد الجمهورية', nameFr: 'Fête de la République', nameEn: 'Republic Day' },
  { month: 8, day: 13, nameAr: 'عيد المرأة والأسرة', nameFr: 'Fête de la Femme', nameEn: 'National Women’s Day' },
  { month: 10, day: 15, nameAr: 'عيد الجلاء', nameFr: 'Fête de l’Évacuation', nameEn: 'Evacuation Day' },
  { month: 12, day: 17, nameAr: 'عيد الثورة الرسمي', nameFr: 'Fête de la Révolution', nameEn: 'Revolution Day' }
];

// Islamic religious holidays for 2025, 2026, and 2027 (standard Tunisian official gazette approximations)
const LUNAR_HOLIDAYS: TunisianHoliday[] = [
  // 2026
  { year: 2026, month: 3, day: 20, nameAr: 'عيد الفطر المبارك', nameFr: 'Aïd el-Fitr', nameEn: 'Eid al-Fitr' },
  { year: 2026, month: 3, day: 21, nameAr: 'ثاني أيام عيد الفطر', nameFr: '2ème jour de l’Aïd el-Fitr', nameEn: 'Eid al-Fitr Day 2' },
  { year: 2026, month: 3, day: 22, nameAr: 'ثالث أيام عيد الفطر', nameFr: '3ème jour de l’Aïd el-Fitr', nameEn: 'Eid al-Fitr Day 3' },
  { year: 2026, month: 5, day: 27, nameAr: 'عيد الأضحى المبارك', nameFr: 'Aïd al-Idha', nameEn: 'Eid al-Adha' },
  { year: 2026, month: 5, day: 28, nameAr: 'ثاني أيام عيد الأضحى', nameFr: '2ème jour de l’Aïd al-Idha', nameEn: 'Eid al-Adha Day 2' },
  { year: 2026, month: 6, day: 16, nameAr: 'رأس السنة الهجرية', nameFr: 'Nouvel an de l’Hégire', nameEn: 'Islamic New Year' },
  { year: 2026, month: 8, day: 25, nameAr: 'المولد النبوي الشريف', nameFr: 'Mawlid Ennabaoui', nameEn: 'Prophet’s Birthday' },

  // 2027
  { year: 2027, month: 3, day: 10, nameAr: 'عيد الفطر المبارك', nameFr: 'Aïd el-Fitr', nameEn: 'Eid al-Fitr' },
  { year: 2027, month: 3, day: 11, nameAr: 'ثاني أيام عيد الفطر', nameFr: '2ème jour de l’Aïd el-Fitr', nameEn: 'Eid al-Fitr Day 2' },
  { year: 2027, month: 5, day: 16, nameAr: 'عيد الأضحى المبارك', nameFr: 'Aïd al-Idha', nameEn: 'Eid al-Adha' },
  { year: 2027, month: 5, day: 17, nameAr: 'ثاني أيام عيد الأضحى', nameFr: '2ème jour de l’Aïd al-Idha', nameEn: 'Eid al-Adha Day 2' },
  { year: 2027, month: 6, day: 6, nameAr: 'رأس السنة الهجرية', nameFr: 'Nouvel an de l’Hégire', nameEn: 'Islamic New Year' },
  { year: 2027, month: 8, day: 15, nameAr: 'المولد النبوي الشريف', nameFr: 'Mawlid Ennabaoui', nameEn: 'Prophet’s Birthday' }
];

export interface HolidayCheckResult {
  isHoliday: boolean;
  holiday?: TunisianHoliday;
}

/**
 * Checks if a specific date is an official Tunisian public holiday.
 */
export function checkTunisianHoliday(year: number, month: number, day: number): HolidayCheckResult {
  // Check fixed holidays
  const fixed = FIXED_HOLIDAYS.find((h) => h.month === month && h.day === day);
  if (fixed) {
    return { isHoliday: true, holiday: fixed };
  }

  // Check lunar holidays for specific year
  const lunar = LUNAR_HOLIDAYS.find(
    (h) => h.year === year && h.month === month && h.day === day
  );
  if (lunar) {
    return { isHoliday: true, holiday: lunar };
  }

  return { isHoliday: false };
}
