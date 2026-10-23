/**
 * Feeder Bus Connections between Tebourba (طبربة) and Gobaa (القباعة)
 * Source document: ولاية منوبة - معتمدية طبربة (تواقيت سفرات خط الترابط طبربة – القباعة)
 * Validity period stated on document: 1 - 6 September 2025 (من 1 إلى 6 سبتمبر 2025)
 * Operating Days: Monday to Saturday (من الإثنين إلى السبت) - No service on Sunday.
 *
 * NOTE ON ESTIMATED VALUES:
 * - Transit duration (40 minutes) is an engineering estimate based on road distance (~24 km via RN7)
 *   and traffic conditions; it is not stated on the municipal poster.
 * - Platform transfer buffer at Gobaa is standardized to 6 minutes for both directions.
 */

export interface BusTrip {
  id: string;
  line: '42' | '116';
  departureTime: string; // "HH:mm" from Tebourba (ذهاب)
  returnTime?: string;   // "HH:mm" from Gobaa (عودة)
  daysDescriptionAr: string;
  daysDescriptionFr: string;
  daysDescriptionEn: string;
}

export interface BusConnectionSchedule {
  line: '42' | '116';
  direction: 'tebourba_to_gobaa' | 'gobaa_to_tebourba';
  departureTime: string;
  estimatedArrival: string;
  estimatedDurationMins: number;
}

/**
 * Feeder buses operate Monday to Saturday (days 1 through 6 in standard JS Date, 0 is Sunday).
 */
export function isBusOperatingDay(dayOfWeek: number): boolean {
  return dayOfWeek >= 1 && dayOfWeek <= 6;
}

// Line 42 Departures from Tebourba and Returns from Gobaa
// (8 departures from Tebourba, 7 returns from Gobaa - slot after 18:30 is blank on poster)
export const BUS_LINE_42_TRIPS: BusTrip[] = [
  { id: 'b42-1', line: '42', departureTime: '04:50', returnTime: '05:30', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b42-2', line: '42', departureTime: '06:30', returnTime: '07:30', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b42-3', line: '42', departureTime: '08:30', returnTime: '09:30', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b42-4', line: '42', departureTime: '10:30', returnTime: '11:30', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b42-5', line: '42', departureTime: '12:20', returnTime: '13:30', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b42-6', line: '42', departureTime: '14:30', returnTime: '15:30', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b42-7', line: '42', departureTime: '16:30', returnTime: '17:30', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b42-8', line: '42', departureTime: '18:30', returnTime: undefined, daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' }
];

// Line 116 Departures from Tebourba and Returns from Gobaa
// NOTE ON SOURCE DOCUMENT DATA:
// In the official municipal flyer, row 4 lists departure 07:10 paired with return 09:10,
// and row 5 lists departure 07:50 paired with return 08:50.
// Notice that 09:10 is printed above 08:50 in the return column of the flyer (a likely non-chronological typographic inversion in the flyer).
// We store the data here exactly in the flyer's row order. When generating return timetables,
// sorting by returnTime chronologically presents 08:50 then 09:10.
export const BUS_LINE_116_TRIPS: BusTrip[] = [
  { id: 'b116-1',  line: '116', departureTime: '04:10', returnTime: '04:55', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b116-2',  line: '116', departureTime: '05:30', returnTime: '06:30', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b116-3',  line: '116', departureTime: '05:50', returnTime: '06:50', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b116-4',  line: '116', departureTime: '07:10', returnTime: '09:10', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b116-5',  line: '116', departureTime: '07:50', returnTime: '08:50', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b116-6',  line: '116', departureTime: '09:10', returnTime: '10:10', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b116-7',  line: '116', departureTime: '09:50', returnTime: '10:50', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b116-8',  line: '116', departureTime: '11:10', returnTime: '12:10', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b116-9',  line: '116', departureTime: '11:40', returnTime: '12:50', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b116-10', line: '116', departureTime: '13:00', returnTime: '14:00', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b116-11', line: '116', departureTime: '13:50', returnTime: '14:50', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b116-12', line: '116', departureTime: '15:10', returnTime: '16:10', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b116-13', line: '116', departureTime: '15:50', returnTime: '16:50', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b116-14', line: '116', departureTime: '16:10', returnTime: '17:10', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b116-15', line: '116', departureTime: '17:50', returnTime: '18:50', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' },
  { id: 'b116-16', line: '116', departureTime: '19:50', returnTime: '21:00', daysDescriptionAr: 'من الإثنين إلى السبت', daysDescriptionFr: 'Du lundi au samedi', daysDescriptionEn: 'Monday to Saturday' }
];

export const ALL_BUS_TRIPS = [...BUS_LINE_42_TRIPS, ...BUS_LINE_116_TRIPS];

/**
 * Engineering estimate of road transit duration between Tebourba and Gobaa Station (~24 km via RN7).
 */
export const BUS_ESTIMATED_TRANSIT_MINUTES = 40;

/**
 * Standardized walking & transfer buffer between bus drop-off and RFR train platform at Gobaa Station.
 */
export const HUB_TRANSFER_BUFFER_MINUTES = 6;

export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

export function formatMinutesToTime(mins: number): string {
  const normalized = (mins % 1440 + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Returns all departures from Tebourba (ذهاب إلى القباعة)
 */
export function getDeparturesFromTebourba(selectedLine?: '42' | '116'): BusConnectionSchedule[] {
  const trips = selectedLine
    ? ALL_BUS_TRIPS.filter((t) => t.line === selectedLine)
    : ALL_BUS_TRIPS;

  return trips.map((t) => {
    const depM = parseTimeToMinutes(t.departureTime);
    const arrM = depM + BUS_ESTIMATED_TRANSIT_MINUTES;
    return {
      line: t.line,
      direction: 'tebourba_to_gobaa' as const,
      departureTime: t.departureTime,
      estimatedArrival: formatMinutesToTime(arrM),
      estimatedDurationMins: BUS_ESTIMATED_TRANSIT_MINUTES
    };
  }).sort((a, b) => parseTimeToMinutes(a.departureTime) - parseTimeToMinutes(b.departureTime));
}

/**
 * Returns all return departures from Gobaa (العودة من القباعة إلى طبربة)
 */
export function getReturnsFromGobaa(selectedLine?: '42' | '116'): BusConnectionSchedule[] {
  const trips = (selectedLine
    ? ALL_BUS_TRIPS.filter((t) => t.line === selectedLine)
    : ALL_BUS_TRIPS
  ).filter((t) => Boolean(t.returnTime));

  return trips.map((t) => {
    const depM = parseTimeToMinutes(t.returnTime!);
    const arrM = depM + BUS_ESTIMATED_TRANSIT_MINUTES;
    return {
      line: t.line,
      direction: 'gobaa_to_tebourba' as const,
      departureTime: t.returnTime!,
      estimatedArrival: formatMinutesToTime(arrM),
      estimatedDurationMins: BUS_ESTIMATED_TRANSIT_MINUTES
    };
  }).sort((a, b) => parseTimeToMinutes(a.departureTime) - parseTimeToMinutes(b.departureTime));
}

/**
 * Special multimodal station identifier for Tebourba
 */
export const TEBOURBA_STATION = {
  id: 'tebourba_bus',
  nameAr: 'طبربة (ترابط الحافلة 42/116)',
  nameFr: 'Tébourba (Bus 42/116)',
  nameEn: 'Tebourba (Bus 42/116)',
  hubStationId: 'gobaa',
  connections: ['الحافلة 42', 'الحافلة 116']
};
