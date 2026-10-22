export interface Station {
  id: string;
  nameAr: string;
  nameFr: string;
  nameEn: string;
  lineId: string;
  order: number;
  connections?: string[]; // e.g., ['Metro 4', 'Bus', 'TGM']
  facilities?: string[]; // e.g., ['Guichet', 'Parking', 'Accessible PMR']
}

export interface LineInfo {
  id: string;
  code: string;
  nameAr: string;
  nameFr: string;
  nameEn: string;
  terminusAr: string;
  terminusFr: string;
  terminusEn: string;
  color: string;
  bgHex: string;
  textHex: string;
  borderHex: string;
  badgeBg: string;
  badgeText: string;
  activeBorder: string;
  stations: Station[];
}

export type DaysType = '-' | 'A' | 'B' | 'C' | 'D';

export interface TrainSchedule {
  trainNumber: string;
  lineId: string;
  direction: 'outbound' | 'inbound'; // outbound: Gobaa -> Tunis Central; inbound: Tunis Central -> Gobaa
  departureTime: string; // "HH:mm"
  arrivalTime: string; // "HH:mm"
  originStationId: string;
  destinationStationId: string;
  days: DaysType;
  stops: {
    stationId: string;
    time: string; // "HH:mm"
  }[];
}

export const TUNIS_CENTRAL_ID = 'tunis_central';

export const LINES: Record<string, LineInfo> = {
  D: {
    id: 'D',
    code: 'D',
    nameAr: 'الخط D',
    nameFr: 'Ligne D',
    nameEn: 'Line D',
    terminusAr: 'القباعة المدينة ⇄ تونس (ساحة برشلونة)',
    terminusFr: 'Gobaa Ville ⇄ Tunis Barcelone',
    terminusEn: 'Gobaa Ville ⇄ Tunis Central',
    color: 'orange',
    bgHex: '#ea580c',
    textHex: '#c2410c',
    borderHex: '#f97316',
    badgeBg: 'bg-orange-500',
    badgeText: 'text-orange-600',
    activeBorder: 'border-orange-500 ring-orange-500/30',
    stations: [
      { id: 'gobaa_ville', nameAr: 'القباعة المدينة', nameFr: 'Gobaa Ville', nameEn: 'Gobaa Ville', lineId: 'D', order: 1, connections: ['Bus'], facilities: ['Guichet', 'Parking'] },
      { id: 'gobaa', nameAr: 'القباعة', nameFr: 'Gobaa', nameEn: 'Gobaa', lineId: 'D', order: 2, connections: ['Bus'] },
      { id: 'les_orangers', nameAr: 'حي البرتقال', nameFr: 'Les Orangers', nameEn: 'Les Orangers', lineId: 'D', order: 3 },
      { id: 'manouba', nameAr: 'منوبة', nameFr: 'Manouba', nameEn: 'Manouba', lineId: 'D', order: 4, connections: ['Metro 4', 'Bus'], facilities: ['Guichet', 'Parking'] },
      { id: 'el_bortal', nameAr: 'البرطال', nameFr: 'El Bortal', nameEn: 'El Bortal', lineId: 'D', order: 5 },
      { id: 'le_bardo', nameAr: 'باردو', nameFr: 'Le Bardo', nameEn: 'Le Bardo', lineId: 'D', order: 6, connections: ['Metro 4', 'Bus'], facilities: ['Guichet', 'PMR'] },
      { id: 'erraoudha', nameAr: 'الروضة', nameFr: 'Erraoudha', nameEn: 'Erraoudha', lineId: 'D', order: 7 },
      { id: 'mellassine', nameAr: 'الملاسين', nameFr: 'Mellassine', nameEn: 'Mellassine', lineId: 'D', order: 8 },
      { id: 'saida_manoubia_d', nameAr: 'السيدة المنوبية', nameFr: 'Saïda Manoubia', nameEn: 'Saida Manoubia', lineId: 'D', order: 9, connections: ['Metro 1, 6'] },
      { id: TUNIS_CENTRAL_ID, nameAr: 'تونس (محطة برشلونة)', nameFr: 'Tunis (Place Barcelone)', nameEn: 'Tunis Central', lineId: 'D', order: 10, connections: ['Metro 1..6', 'SNCFT', 'TGM'], facilities: ['Guichet', 'PMR', 'Parking'] }
    ]
  }
};

/**
 * Validates whether a train operates on a given day-of-week and holiday status.
 * @param days Circulation flag: '-', 'A', 'B', 'C', 'D'
 * @param dayOfWeek 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 * @param isHoliday true if target date is an official Tunisian public holiday
 */
export function isTrainRunningOnDay(days: DaysType, dayOfWeek: number, isHoliday: boolean = false): boolean {
  const isSundayOrHoliday = dayOfWeek === 0 || isHoliday;
  const isSaturday = dayOfWeek === 6 && !isHoliday;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday;

  switch (days) {
    case '-':
      // Tous les jours / كامل أيام الأسبوع
      return true;
    case 'A':
      // Sauf les Dimanches et Fêtes / كامل أيام الأسبوع ما عدا الأحد والأعياد
      return !isSundayOrHoliday;
    case 'B':
      // Dimanches et Fêtes seulement / أيام الأحد والأعياد الرسمية فقط
      return isSundayOrHoliday;
    case 'C':
      // Sauf Samedi, Dimanche et Fêtes / أيام العمل (ما عدا السبت والأحد والأعياد)
      return isWeekday;
    case 'D':
      // Sauf Samedi / كامل الأسبوع ما عدا السبت
      return !isSaturday;
    default:
      return true;
  }
}

export function formatMinutesToTime(totalMinutes: number): string {
  const normalized = (totalMinutes % 1440 + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Line D Outbound: Gobaa / Gobaa Ville -> Tunis Central
// Official SNCFT Winter 2026-2027 poster schedule
const lineD_outbound_data: { train: string; depGobaa: string; days: DaysType; fromVille?: boolean; depVille?: string; arrTunis?: string }[] = [
  { train: '602', depGobaa: '05:15', days: 'A', fromVille: true, depVille: '05:10', arrTunis: '05:41' },
  { train: '604', depGobaa: '05:40', days: '-', fromVille: false, arrTunis: '06:07' },
  { train: '606', depGobaa: '06:10', days: '-', fromVille: false, arrTunis: '06:37' },
  { train: '608', depGobaa: '06:35', days: 'A', fromVille: false, arrTunis: '07:00' },
  { train: '610', depGobaa: '06:55', days: '-', fromVille: false, arrTunis: '07:21' },
  { train: '612', depGobaa: '07:15', days: 'A', fromVille: false, arrTunis: '07:42' },
  { train: '614', depGobaa: '07:35', days: '-', fromVille: false, arrTunis: '08:02' },
  { train: '616', depGobaa: '07:50', days: 'A', fromVille: false, arrTunis: '08:20' },
  { train: '618', depGobaa: '08:10', days: '-', fromVille: false, arrTunis: '08:37' },
  { train: '620', depGobaa: '08:35', days: 'A', fromVille: false, arrTunis: '09:02' },
  { train: '622', depGobaa: '09:10', days: '-', fromVille: false, arrTunis: '09:37' },
  { train: '624', depGobaa: '09:35', days: '-', fromVille: false, arrTunis: '10:01' },
  { train: '626', depGobaa: '10:10', days: 'A', fromVille: false, arrTunis: '10:37' },
  { train: '628', depGobaa: '10:35', days: '-', fromVille: false, arrTunis: '11:01' },
  { train: '630', depGobaa: '11:05', days: '-', fromVille: false, arrTunis: '11:31' },
  { train: '632', depGobaa: '11:35', days: 'A', fromVille: false, arrTunis: '12:01' },
  { train: '634', depGobaa: '12:05', days: '-', fromVille: false, arrTunis: '12:31' },
  { train: '636', depGobaa: '12:46', days: '-', fromVille: true, depVille: '12:40', arrTunis: '13:14' },
  { train: '638', depGobaa: '13:05', days: 'A', fromVille: false, arrTunis: '13:31' },
  { train: '640', depGobaa: '13:35', days: '-', fromVille: false, arrTunis: '14:01' },
  { train: '642', depGobaa: '14:05', days: '-', fromVille: false, arrTunis: '14:31' },
  { train: '644', depGobaa: '14:35', days: 'A', fromVille: false, arrTunis: '15:01' },
  { train: '646', depGobaa: '15:05', days: '-', fromVille: false, arrTunis: '15:31' },
  { train: '648', depGobaa: '15:35', days: '-', fromVille: false, arrTunis: '16:01' },
  { train: '650', depGobaa: '16:05', days: 'A', fromVille: false, arrTunis: '16:31' },
  { train: '652', depGobaa: '16:35', days: '-', fromVille: false, arrTunis: '17:01' },
  { train: '654', depGobaa: '17:05', days: '-', fromVille: false, arrTunis: '17:31' },
  { train: '656', depGobaa: '17:35', days: 'A', fromVille: false, arrTunis: '18:01' },
  { train: '658', depGobaa: '18:05', days: '-', fromVille: false, arrTunis: '18:31' },
  { train: '660', depGobaa: '18:35', days: '-', fromVille: false, arrTunis: '19:01' },
  { train: '662', depGobaa: '19:05', days: 'A', fromVille: false, arrTunis: '19:31' },
  { train: '664', depGobaa: '19:35', days: '-', fromVille: false, arrTunis: '20:01' },
  { train: '666', depGobaa: '20:05', days: '-', fromVille: false, arrTunis: '20:31' },
  { train: '668', depGobaa: '20:35', days: 'A', fromVille: false, arrTunis: '21:01' },
  { train: '670', depGobaa: '21:05', days: 'A', fromVille: false, arrTunis: '21:31' },
  { train: '672', depGobaa: '21:35', days: 'B', fromVille: false, arrTunis: '22:01' },
  { train: '674', depGobaa: '22:00', days: 'A', fromVille: true, depVille: '21:55', arrTunis: '22:26' }
];

// Line D Inbound: Tunis Central -> Gobaa / Gobaa Ville
const lineD_inbound_data: { train: string; depTunis: string; days: DaysType; toVille?: boolean; arrGobaa?: string; arrVille?: string }[] = [
  { train: '601', depTunis: '04:30', days: 'A', toVille: true, arrGobaa: '04:56', arrVille: '05:00' },
  { train: '603', depTunis: '04:55', days: '-', toVille: true, arrGobaa: '05:21', arrVille: '05:25' },
  { train: '605', depTunis: '05:30', days: '-', toVille: true, arrGobaa: '05:56', arrVille: '06:00' },
  { train: '607', depTunis: '05:55', days: 'A', toVille: true, arrGobaa: '06:21', arrVille: '06:25' },
  { train: '609', depTunis: '06:15', days: '-', toVille: false, arrGobaa: '06:41', arrVille: '06:45' },
  { train: '611', depTunis: '06:50', days: '-', toVille: true, arrGobaa: '07:17', arrVille: '07:21' },
  { train: '613', depTunis: '07:10', days: 'A', toVille: false, arrGobaa: '07:36', arrVille: '07:40' },
  { train: '615', depTunis: '07:30', days: '-', toVille: false, arrGobaa: '07:56', arrVille: '08:00' },
  { train: '617', depTunis: '07:55', days: 'A', toVille: true, arrGobaa: '08:21', arrVille: '08:25' },
  { train: '619', depTunis: '08:30', days: '-', toVille: false, arrGobaa: '08:56', arrVille: '09:00' },
  { train: '621', depTunis: '08:55', days: '-', toVille: false, arrGobaa: '09:21', arrVille: '09:25' },
  { train: '623', depTunis: '09:30', days: 'A', toVille: true, arrGobaa: '09:56', arrVille: '10:00' },
  { train: '625', depTunis: '09:55', days: '-', toVille: false, arrGobaa: '10:20', arrVille: '10:25' },
  { train: '627', depTunis: '10:25', days: '-', toVille: false, arrGobaa: '10:51', arrVille: '10:55' },
  { train: '629', depTunis: '10:55', days: 'A', toVille: false, arrGobaa: '11:21', arrVille: '11:25' },
  { train: '631', depTunis: '11:25', days: '-', toVille: false, arrGobaa: '11:51', arrVille: '11:55' },
  { train: '633', depTunis: '11:55', days: '-', toVille: false, arrGobaa: '12:21', arrVille: '12:25' },
  { train: '635', depTunis: '12:25', days: 'A', toVille: true, arrGobaa: '12:51', arrVille: '12:55' },
  { train: '637', depTunis: '12:50', days: '-', toVille: false, arrGobaa: '13:16', arrVille: '13:20' },
  { train: '639', depTunis: '13:25', days: '-', toVille: false, arrGobaa: '13:51', arrVille: '13:55' },
  { train: '641', depTunis: '13:55', days: 'A', toVille: false, arrGobaa: '14:21', arrVille: '14:25' },
  { train: '643', depTunis: '14:25', days: '-', toVille: false, arrGobaa: '14:51', arrVille: '14:55' },
  { train: '645', depTunis: '14:55', days: '-', toVille: false, arrGobaa: '15:21', arrVille: '15:25' },
  { train: '647', depTunis: '15:25', days: 'A', toVille: false, arrGobaa: '15:51', arrVille: '15:55' },
  { train: '649', depTunis: '15:55', days: '-', toVille: false, arrGobaa: '16:21', arrVille: '16:25' },
  { train: '651', depTunis: '16:25', days: '-', toVille: false, arrGobaa: '16:51', arrVille: '16:55' },
  { train: '653', depTunis: '16:55', days: 'A', toVille: false, arrGobaa: '17:21', arrVille: '17:25' },
  { train: '655', depTunis: '17:25', days: '-', toVille: false, arrGobaa: '17:51', arrVille: '17:55' },
  { train: '657', depTunis: '17:55', days: '-', toVille: false, arrGobaa: '18:21', arrVille: '18:25' },
  { train: '659', depTunis: '18:25', days: 'A', toVille: false, arrGobaa: '18:51', arrVille: '18:55' },
  { train: '661', depTunis: '18:55', days: '-', toVille: false, arrGobaa: '19:21', arrVille: '19:25' },
  { train: '663', depTunis: '19:25', days: '-', toVille: false, arrGobaa: '19:51', arrVille: '19:55' },
  { train: '665', depTunis: '19:55', days: '-', toVille: false, arrGobaa: '20:21', arrVille: '20:25' },
  { train: '667', depTunis: '20:25', days: '-', toVille: false, arrGobaa: '20:51', arrVille: '20:55' },
  { train: '669', depTunis: '20:55', days: 'B', toVille: false, arrGobaa: '21:21', arrVille: '21:25' },
  { train: '671', depTunis: '21:20', days: 'A', toVille: true, arrGobaa: '21:46', arrVille: '21:50' }
];

export function getAllSchedules(): TrainSchedule[] {
  const result: TrainSchedule[] = [];

  // Line D Outbound (Gobaa / Gobaa Ville -> Tunis Central)
  for (const item of lineD_outbound_data) {
    const depGobaaM = parseTimeToMinutes(item.depGobaa);
    const stops: { stationId: string; time: string }[] = [];

    if (item.fromVille) {
      const depV = item.depVille || formatMinutesToTime(depGobaaM - 5);
      stops.push({ stationId: 'gobaa_ville', time: depV });
    }
    stops.push(
      { stationId: 'gobaa', time: formatMinutesToTime(depGobaaM) },
      { stationId: 'les_orangers', time: formatMinutesToTime(depGobaaM + 2) },
      { stationId: 'manouba', time: formatMinutesToTime(depGobaaM + 5) },
      { stationId: 'el_bortal', time: formatMinutesToTime(depGobaaM + 7) },
      { stationId: 'le_bardo', time: formatMinutesToTime(depGobaaM + 12) },
      { stationId: 'erraoudha', time: formatMinutesToTime(depGobaaM + 18) },
      { stationId: 'mellassine', time: formatMinutesToTime(depGobaaM + 20) },
      { stationId: 'saida_manoubia_d', time: formatMinutesToTime(depGobaaM + 22) },
      { stationId: TUNIS_CENTRAL_ID, time: item.arrTunis || formatMinutesToTime(depGobaaM + 26) }
    );

    result.push({
      trainNumber: item.train,
      lineId: 'D',
      direction: 'outbound',
      departureTime: stops[0].time,
      arrivalTime: stops[stops.length - 1].time,
      originStationId: stops[0].stationId,
      destinationStationId: stops[stops.length - 1].stationId,
      days: item.days,
      stops
    });
  }

  // Line D Inbound (Tunis Central -> Gobaa / Gobaa Ville)
  for (const item of lineD_inbound_data) {
    const depM = parseTimeToMinutes(item.depTunis);
    const stops: { stationId: string; time: string }[] = [
      { stationId: TUNIS_CENTRAL_ID, time: formatMinutesToTime(depM) },
      { stationId: 'saida_manoubia_d', time: formatMinutesToTime(depM + 4) },
      { stationId: 'mellassine', time: formatMinutesToTime(depM + 6) },
      { stationId: 'erraoudha', time: formatMinutesToTime(depM + 8) },
      { stationId: 'le_bardo', time: formatMinutesToTime(depM + 14) },
      { stationId: 'el_bortal', time: formatMinutesToTime(depM + 19) },
      { stationId: 'manouba', time: formatMinutesToTime(depM + 21) },
      { stationId: 'les_orangers', time: formatMinutesToTime(depM + 23) },
      { stationId: 'gobaa', time: item.arrGobaa || formatMinutesToTime(depM + 26) }
    ];
    if (item.toVille) {
      stops.push({ stationId: 'gobaa_ville', time: item.arrVille || formatMinutesToTime(depM + 30) });
    }

    result.push({
      trainNumber: item.train,
      lineId: 'D',
      direction: 'inbound',
      departureTime: stops[0].time,
      arrivalTime: stops[stops.length - 1].time,
      originStationId: stops[0].stationId,
      destinationStationId: stops[stops.length - 1].stationId,
      days: item.days,
      stops
    });
  }

  return result;
}

export const ALL_SCHEDULES = getAllSchedules();

// Get all unique stations across Line D
export function getAllNetworkStations(): { station: Station; line: LineInfo }[] {
  const result: { station: Station; line: LineInfo }[] = [];
  const line = LINES.D;
  for (const station of line.stations) {
    result.push({ station, line });
  }
  return result;
}

export const TEBOURBA_BUS_STATION: Station = {
  id: 'tebourba_bus',
  nameAr: 'طبربة (ترابط الحافلة 42/116)',
  nameFr: 'Tébourba (Bus 42/116)',
  nameEn: 'Tebourba (Bus 42/116)',
  lineId: 'D',
  order: 0,
  connections: ['حافلة 42', 'حافلة 116 (الترابط مع قطار RFR بالقباعة)'],
  facilities: ['محطة حافلات ترابط طبربة']
};

export function findStationById(id: string): Station | undefined {
  if (id === 'tebourba_bus') return TEBOURBA_BUS_STATION;
  return LINES.D.stations.find((s) => s.id === id);
}

// Fare calculation system for Line D (up to 4 fare sections)
export interface FareTier {
  sections: number;
  singlePriceDT: number;
  carnet10DT: number;
  monthlySubDT: number;
  studentSubDT: number;
}

export const FARE_DATA: FareTier[] = [
  { sections: 1, singlePriceDT: 0.500, carnet10DT: 4.500, monthlySubDT: 18.000, studentSubDT: 32.000 },
  { sections: 2, singlePriceDT: 0.700, carnet10DT: 6.300, monthlySubDT: 24.500, studentSubDT: 42.000 },
  { sections: 3, singlePriceDT: 0.950, carnet10DT: 8.550, monthlySubDT: 32.000, studentSubDT: 52.000 },
  { sections: 4, singlePriceDT: 1.250, carnet10DT: 11.250, monthlySubDT: 40.000, studentSubDT: 65.000 }
];

export function calculateFare(fromOrder: number, toOrder: number): FareTier {
  const diff = Math.abs(fromOrder - toOrder);
  if (diff <= 2) return FARE_DATA[0];
  if (diff <= 5) return FARE_DATA[1];
  if (diff <= 7) return FARE_DATA[2];
  return FARE_DATA[3];
}
