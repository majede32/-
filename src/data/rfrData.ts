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
  direction: 'inbound' | 'outbound'; // outbound: from suburban terminus towards Tunis; inbound: from Tunis towards suburb
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

export const LINES: Record<string, LineInfo> = {
  D: {
    id: 'D',
    code: 'D',
    nameAr: 'الخط D',
    nameFr: 'Ligne D',
    nameEn: 'Line D',
    terminusAr: 'القباعة المدينة / منوبة',
    terminusFr: 'Gobaa Ville',
    terminusEn: 'Gobaa Ville',
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
      { id: 'le_bardo', nameAr: 'باردو', nameFr: 'Le Bardo', nameEn: 'Le Bardo', lineId: 'D', order: 6, connections: ['Metro 4', 'Bus'], facilities: ['Guichet', 'Accessibilité PMR'] },
      { id: 'erraoudha', nameAr: 'الروضة', nameFr: 'Erraoudha', nameEn: 'Erraoudha', lineId: 'D', order: 7 },
      { id: 'mellassine', nameAr: 'الملاسين', nameFr: 'Mellassine', nameEn: 'Mellassine', lineId: 'D', order: 8 },
      { id: 'saida_manoubia', nameAr: 'السيدة المنوبية', nameFr: 'Saïda Manoubia', nameEn: 'Saida Manoubia', lineId: 'D', order: 9, connections: ['Metro 1, 6'] },
      { id: 'tunis', nameAr: 'تونس (محطة برشلونة)', nameFr: 'Tunis', nameEn: 'Tunis', lineId: 'D', order: 10, connections: ['Metro 1, 2, 3, 4, 5, 6', 'SNCFT Grandes Lignes', 'Bus TGM'], facilities: ['Guichets', 'Salle d\'attente', 'Parking', 'PMR'] }
    ]
  },
  E: {
    id: 'E',
    code: 'E',
    nameAr: 'الخط E',
    nameFr: 'Ligne E',
    nameEn: 'Line E',
    terminusAr: 'بوقطفة / سيدي حسين',
    terminusFr: 'Bougatfa',
    terminusEn: 'Bougatfa',
    color: 'emerald',
    bgHex: '#10b981',
    textHex: '#059669',
    borderHex: '#10b981',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-emerald-700',
    activeBorder: 'border-emerald-500 ring-emerald-500/30',
    stations: [
      { id: 'bougatfa', nameAr: 'بوقطفة', nameFr: 'Bougatfa', nameEn: 'Bougatfa', lineId: 'E', order: 1, connections: ['Bus'], facilities: ['Guichet', 'Parking'] },
      { id: 'al_hrairiya', nameAr: 'الحرارية', nameFr: 'Al Hrairiya', nameEn: 'Al Hrairiya', lineId: 'E', order: 2, connections: ['Bus'] },
      { id: 'ezzouhour', nameAr: 'الزهور', nameFr: 'Ezzouhour', nameEn: 'Ezzouhour', lineId: 'E', order: 3 },
      { id: 'ettayarane', nameAr: 'الطيران', nameFr: 'Ettayarane', nameEn: 'Ettayarane', lineId: 'E', order: 4 },
      { id: 'ennajah', nameAr: 'النجاح', nameFr: 'Ennajah', nameEn: 'Ennajah', lineId: 'E', order: 5 },
      { id: 'saida_manoubia_e', nameAr: 'السيدة المنوبية', nameFr: 'Saïda Manoubia', nameEn: 'Saida Manoubia', lineId: 'E', order: 6, connections: ['Metro 1, 6'] },
      { id: 'tunis', nameAr: 'تونس (محطة برشلونة)', nameFr: 'Tunis', nameEn: 'Tunis', lineId: 'E', order: 7, connections: ['Metro 1, 2, 3, 4, 5, 6', 'SNCFT Grandes Lignes'], facilities: ['Guichets', 'PMR'] }
    ]
  },
  A: {
    id: 'A',
    code: 'A',
    nameAr: 'الخط A',
    nameFr: 'Ligne A',
    nameEn: 'Line A',
    terminusAr: 'الرياض / برج السدرية',
    terminusFr: 'Erriadh',
    terminusEn: 'Erriadh',
    color: 'blue',
    bgHex: '#2563eb',
    textHex: '#1d4ed8',
    borderHex: '#3b82f6',
    badgeBg: 'bg-blue-600',
    badgeText: 'text-blue-700',
    activeBorder: 'border-blue-500 ring-blue-500/30',
    stations: [
      { id: 'erriadh', nameAr: 'الرياض', nameFr: 'Erriadh', nameEn: 'Erriadh', lineId: 'A', order: 1, facilities: ['Guichet', 'Parking'] },
      { id: 'borj_cedria', nameAr: 'برج السدرية', nameFr: 'Borj Cedria', nameEn: 'Borj Cedria', lineId: 'A', order: 2, connections: ['Bus'] },
      { id: 'bir_el_bey', nameAr: 'بئر الباي', nameFr: 'Bir El Bey', nameEn: 'Bir El Bey', lineId: 'A', order: 3 },
      { id: 'hammam_chatt', nameAr: 'حمام الشط', nameFr: 'Hammam Chatt', nameEn: 'Hammam Chatt', lineId: 'A', order: 4 },
      { id: 'tahar_sfar', nameAr: 'طاهر صفر', nameFr: 'Tahar Sfar', nameEn: 'Tahar Sfar', lineId: 'A', order: 5 },
      { id: 'arret_du_stade', nameAr: 'محطة الملعب', nameFr: 'Arret du Stade', nameEn: 'Stadium Stop', lineId: 'A', order: 6 },
      { id: 'hammam_lif', nameAr: 'حمام الأنف', nameFr: 'Hammam Lif', nameEn: 'Hammam Lif', lineId: 'A', order: 7, connections: ['Bus'], facilities: ['Guichet'] },
      { id: 'bou_kornine', nameAr: 'بوقرنين', nameFr: 'Bou Kornine', nameEn: 'Bou Kornine', lineId: 'A', order: 8 },
      { id: 'ez_zahra', nameAr: 'الزهراء', nameFr: 'Ez-Zahra', nameEn: 'Ez-Zahra', lineId: 'A', order: 9, facilities: ['Guichet'] },
      { id: 'rades_meliane', nameAr: 'رادس مليان', nameFr: 'Rades Meliane', nameEn: 'Rades Meliane', lineId: 'A', order: 10 },
      { id: 'lycee_rades', nameAr: 'معهد رادس', nameFr: 'Lycee Rades', nameEn: 'Lycee Rades', lineId: 'A', order: 11 },
      { id: 'rades', nameAr: 'رادس', nameFr: 'Rades', nameEn: 'Rades', lineId: 'A', order: 12, connections: ['Bus'], facilities: ['Guichet'] },
      { id: 'sidi_rezig', nameAr: 'سيدي رزيق', nameFr: 'Sidi Rezig', nameEn: 'Sidi Rezig', lineId: 'A', order: 13 },
      { id: 'megrine', nameAr: 'مقرين', nameFr: 'Megrine', nameEn: 'Megrine', lineId: 'A', order: 14 },
      { id: 'megrine_riadh', nameAr: 'مقرين الرياض', nameFr: 'Megrine Riadh', nameEn: 'Megrine Riadh', lineId: 'A', order: 15 },
      { id: 'jebel_jelloud', nameAr: 'جبل الجلود', nameFr: 'Jebel Jelloud', nameEn: 'Jebel Jelloud', lineId: 'A', order: 16, connections: ['Metro 1, 6'] },
      { id: 'tunis_ville', nameAr: 'تونس (محطة برشلونة)', nameFr: 'Tunis Ville', nameEn: 'Tunis Central', lineId: 'A', order: 17, connections: ['Metro 1..6', 'SNCFT'], facilities: ['Guichet', 'PMR'] }
    ]
  }
};

// Helper to format minutes to "HH:mm"
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

// Generate Line E Schedules based on the Winter 2026-2027 poster
// Bougatfa -> Tunis: 15 mins total
// Offsets: Bougatfa(0), Al Hrairiya(+2), Ezzouhour(+4), Ettayarane(+7), Ennajah(+9), Saïda Manoubia(+11), Tunis(+15)
const lineE_outbound_data: [string, string, DaysType][] = [
  ['402', '05:00', '-'],
  ['404', '05:20', '-'],
  ['406', '05:40', 'A'],
  ['408', '05:50', 'B'],
  ['410', '06:00', 'A'],
  ['412', '06:20', '-'],
  ['414', '06:40', 'A'],
  ['416', '06:50', 'B'],
  ['418', '07:00', 'A'],
  ['420', '07:20', '-'],
  ['422', '07:40', 'A'],
  ['424', '07:50', 'B'],
  ['426', '08:00', 'A'],
  ['428', '08:20', '-'],
  ['430', '08:40', 'A'],
  ['432', '08:50', 'B'],
  ['434', '09:00', 'A'],
  ['436', '09:20', '-'],
  ['438', '09:40', 'A'],
  ['440', '09:50', 'B'],
  ['442', '10:00', 'A'],
  ['444', '10:20', '-'],
  ['446', '10:40', 'A'],
  ['448', '10:50', 'B'],
  ['450', '11:00', 'A'],
  ['452', '11:20', '-'],
  ['454', '11:40', 'A'],
  ['456', '11:50', 'B'],
  ['458', '12:00', 'A'],
  ['460', '12:20', '-'],
  ['462', '12:40', 'A'],
  ['464', '12:50', 'B'],
  ['466', '13:00', 'A'],
  ['468', '13:20', '-'],
  ['470', '13:40', 'A'],
  ['472', '13:50', 'B'],
  ['474', '14:00', 'A'],
  ['476', '14:20', '-'],
  ['478', '14:40', 'A'],
  ['480', '14:50', 'B'],
  ['482', '15:00', 'A'],
  ['484', '15:20', '-'],
  ['486', '15:40', 'A'],
  ['488', '15:50', 'B'],
  ['490', '16:00', 'A'],
  ['492', '16:20', '-'],
  ['494', '16:40', 'A'],
  ['496', '16:50', 'B'],
  ['498', '17:00', 'A'],
  ['500', '17:20', '-'],
  ['502', '17:40', 'A'],
  ['504', '17:50', 'B'],
  ['506', '18:00', 'A'],
  ['508', '18:20', '-'],
  ['510', '18:50', '-'],
  ['512', '19:20', '-'],
  ['514', '19:50', '-'],
  ['516', '20:20', '-'],
  ['518', '20:50', '-'],
  ['520', '21:20', '-']
];

// Tunis -> Bougatfa:
// Offsets: Tunis(0), Saïda Manoubia(+4), Ennajah(+6), Ettayarane(+9), Ezzouhour(+11), Al Hrairiya(+13), Bougatfa(+15)
const lineE_inbound_data: [string, string, DaysType][] = [
  ['401', '04:40', '-'],
  ['403', '05:00', '-'],
  ['405', '05:20', 'A'],
  ['407', '05:25', 'B'],
  ['409', '05:40', 'A'],
  ['411', '06:00', '-'],
  ['413', '06:20', 'A'],
  ['415', '06:30', 'B'],
  ['417', '06:40', 'A'],
  ['419', '07:00', '-'],
  ['421', '07:20', 'A'],
  ['423', '07:25', 'B'],
  ['425', '07:40', 'A'],
  ['427', '08:00', '-'],
  ['429', '08:20', 'A'],
  ['431', '08:25', 'B'],
  ['433', '08:40', 'A'],
  ['435', '09:00', '-'],
  ['437', '09:20', 'A'],
  ['439', '09:25', 'B'],
  ['441', '09:40', 'A'],
  ['443', '10:00', '-'],
  ['445', '10:20', 'A'],
  ['447', '10:30', 'B'],
  ['449', '10:40', 'A'],
  ['451', '11:00', '-'],
  ['453', '11:20', 'A'],
  ['455', '11:30', 'B'],
  ['457', '11:40', 'A'],
  ['459', '12:00', '-'],
  ['461', '12:20', 'A'],
  ['463', '12:30', 'B'],
  ['465', '12:40', 'A'],
  ['467', '13:00', '-'],
  ['469', '13:20', 'A'],
  ['471', '13:30', 'B'],
  ['473', '13:40', 'A'],
  ['475', '14:00', '-'],
  ['477', '14:20', 'A'],
  ['479', '14:30', 'B'],
  ['481', '14:40', 'A'],
  ['483', '15:00', '-'],
  ['485', '15:20', 'A'],
  ['487', '15:30', 'B'],
  ['489', '15:40', 'A'],
  ['491', '16:00', '-'],
  ['493', '16:20', 'A'],
  ['495', '16:30', 'B'],
  ['497', '16:40', 'A'],
  ['499', '17:00', '-'],
  ['501', '17:20', 'A'],
  ['503', '17:30', 'B'],
  ['505', '17:40', 'A'],
  ['507', '18:00', '-'],
  ['509', '18:30', '-'],
  ['511', '19:00', '-'],
  ['513', '19:30', '-'],
  ['515', '20:00', '-'],
  ['517', '20:30', '-'],
  ['519', '21:00', '-']
];

// Generate Line D Schedules based on Winter 2026-2027 poster
// Gobaa -> Tunis:
// Gobaa(0), Les Orangers(+2), Manouba(+5), El Bortal(+7), Le Bardo(+12), Erraoudha(+18), Mellassine(+20), Saïda Manoubia(+22), Tunis(+26)
// Note: If starts at Gobaa Ville, it leaves Gobaa Ville 5 mins earlier!
const lineD_outbound_data: { train: string; dep: string; days: DaysType; fromVille?: boolean }[] = [
  { train: '602', dep: '05:15', days: 'A', fromVille: true },
  { train: '604', dep: '05:40', days: '-', fromVille: false },
  { train: '606', dep: '06:10', days: '-', fromVille: false },
  { train: '608', dep: '06:35', days: 'A', fromVille: false },
  { train: '610', dep: '06:55', days: '-', fromVille: false },
  { train: '612', dep: '07:15', days: 'A', fromVille: false },
  { train: '614', dep: '07:35', days: '-', fromVille: false },
  { train: '616', dep: '07:50', days: 'A', fromVille: false },
  { train: '618', dep: '08:10', days: '-', fromVille: false },
  { train: '620', dep: '08:35', days: 'A', fromVille: false },
  { train: '622', dep: '09:10', days: '-', fromVille: false },
  { train: '624', dep: '09:35', days: '-', fromVille: false },
  { train: '626', dep: '10:10', days: 'A', fromVille: false },
  { train: '628', dep: '10:35', days: '-', fromVille: false },
  { train: '630', dep: '11:05', days: '-', fromVille: false },
  { train: '632', dep: '11:35', days: 'A', fromVille: false },
  { train: '634', dep: '12:05', days: '-', fromVille: false },
  { train: '636', dep: '12:46', days: '-', fromVille: true }, // Gobaa Ville 12:40 -> Gobaa 12:46 -> Tunis 13:14
  { train: '638', dep: '13:05', days: 'A', fromVille: false },
  { train: '640', dep: '13:35', days: '-', fromVille: false },
  { train: '642', dep: '14:05', days: '-', fromVille: false },
  { train: '644', dep: '14:35', days: 'A', fromVille: false },
  { train: '646', dep: '15:05', days: '-', fromVille: false },
  { train: '648', dep: '15:35', days: '-', fromVille: false },
  { train: '650', dep: '16:05', days: 'A', fromVille: false },
  { train: '652', dep: '16:35', days: '-', fromVille: false },
  { train: '654', dep: '17:05', days: '-', fromVille: false },
  { train: '656', dep: '17:35', days: 'A', fromVille: false },
  { train: '658', dep: '18:05', days: '-', fromVille: false },
  { train: '660', dep: '18:35', days: '-', fromVille: false },
  { train: '662', dep: '19:05', days: 'A', fromVille: false },
  { train: '664', dep: '19:35', days: '-', fromVille: false },
  { train: '666', dep: '20:05', days: '-', fromVille: false },
  { train: '668', dep: '20:35', days: 'A', fromVille: false },
  { train: '670', dep: '21:05', days: 'A', fromVille: false },
  { train: '672', dep: '21:35', days: 'B', fromVille: false },
  { train: '674', dep: '22:00', days: 'A', fromVille: true }  // Gobaa Ville 21:55 -> Gobaa 22:00 -> Tunis 22:26
];

// Line D Inbound: Tunis -> Gobaa / Gobaa Ville:
// Tunis(0), Saïda Manoubia(+4), Mellassine(+6), Erraoudha(+8), Le Bardo(+14), El Bortal(+19), Manouba(+21), Les Orangers(+23), Gobaa(+26), Gobaa Ville(+30)
const lineD_inbound_data: { train: string; dep: string; days: DaysType; toVille?: boolean }[] = [
  { train: '601', dep: '04:30', days: 'A', toVille: true },
  { train: '603', dep: '04:55', days: '-', toVille: true },
  { train: '605', dep: '05:30', days: '-', toVille: true },
  { train: '607', dep: '05:55', days: 'A', toVille: true },
  { train: '609', dep: '06:15', days: '-', toVille: false },
  { train: '611', dep: '06:50', days: '-', toVille: true },
  { train: '613', dep: '07:10', days: 'A', toVille: false },
  { train: '615', dep: '07:30', days: '-', toVille: false },
  { train: '617', dep: '07:55', days: 'A', toVille: true },
  { train: '619', dep: '08:30', days: '-', toVille: false },
  { train: '621', dep: '08:55', days: '-', toVille: false },
  { train: '623', dep: '09:30', days: 'A', toVille: true },
  { train: '625', dep: '09:55', days: '-', toVille: false },
  { train: '627', dep: '10:25', days: '-', toVille: false },
  { train: '629', dep: '10:55', days: 'A', toVille: false },
  { train: '631', dep: '11:25', days: '-', toVille: false },
  { train: '633', dep: '11:55', days: '-', toVille: false },
  { train: '635', dep: '12:25', days: 'A', toVille: true },
  { train: '637', dep: '12:50', days: '-', toVille: false },
  { train: '639', dep: '13:25', days: '-', toVille: false },
  { train: '641', dep: '13:55', days: 'A', toVille: false },
  { train: '643', dep: '14:25', days: '-', toVille: false },
  { train: '645', dep: '14:55', days: '-', toVille: false },
  { train: '647', dep: '15:25', days: 'A', toVille: false },
  { train: '649', dep: '15:55', days: '-', toVille: false },
  { train: '651', dep: '16:25', days: '-', toVille: false },
  { train: '653', dep: '16:55', days: 'A', toVille: false },
  { train: '655', dep: '17:25', days: '-', toVille: false },
  { train: '657', dep: '17:55', days: '-', toVille: false },
  { train: '659', dep: '18:25', days: 'A', toVille: false },
  { train: '661', dep: '18:55', days: '-', toVille: false },
  { train: '663', dep: '19:25', days: '-', toVille: false },
  { train: '665', dep: '19:55', days: '-', toVille: false },
  { train: '667', dep: '20:25', days: '-', toVille: false },
  { train: '669', dep: '20:55', days: 'B', toVille: false },
  { train: '671', dep: '21:20', days: 'A', toVille: true }
];

// Line A Schedules based on Winter 2026-2027 poster
// Erriadh -> Tunis (Travel time ~45 mins omnibus, stops all 17 stations)
// Offsets:
// Erriadh(0), Borj Cedria(+5), Bir El Bey(+9), Hammam Chatt(+11), Tahar Sfar(+13),
// Arret du Stade(+16), Hammam Lif(+19), Bou Kornine(+21), Ez-Zahra(+23), Rades Meliane(+25),
// Lycee Rades(+29), Rades(+32), Sidi Rezig(+34), Megrine(+36), Megrine Riadh(+39), Jebel Jelloud(+41), Tunis(+45)
const lineA_outbound_data: [string, string, DaysType][] = [
  ['102', '04:30', 'A'],
  ['108', '05:00', '-'],
  ['110', '05:30', '-'],
  ['112', '05:45', 'A'],
  ['116', '06:00', 'B'],
  ['118', '06:05', 'A'],
  ['120', '06:20', 'C'],
  ['124', '06:30', 'A'],
  ['126', '06:45', 'A'],
  ['130', '07:00', 'A'],
  ['134', '07:20', 'A'],
  ['136', '07:30', 'B'],
  ['138', '07:40', 'A'],
  ['140', '08:05', 'A'],
  ['142', '08:25', 'A'],
  ['144', '08:40', 'B'],
  ['146', '08:55', 'A'],
  ['150', '09:05', 'B'],
  ['152', '09:30', '-'],
  ['156', '09:50', 'A'],
  ['158', '10:00', 'B'],
  ['162', '10:10', 'A'],
  ['164', '10:30', 'A'],
  ['170', '10:50', 'A'],
  ['172', '11:00', 'B'],
  ['174', '11:15', 'A'],
  ['178', '11:30', 'A'],
  ['180', '11:45', 'A'],
  ['182', '12:00', 'A'],
  ['190', '12:35', 'A'],
  ['194', '12:50', 'A'],
  ['198', '13:05', 'A'],
  ['200', '13:25', 'B'],
  ['204', '13:40', '-'],
  ['208', '14:00', 'A'],
  ['210', '14:30', 'A'],
  ['212', '14:50', 'A'],
  ['214', '15:00', 'B'],
  ['216', '15:10', 'A'],
  ['218', '15:30', 'B'],
  ['220', '15:40', 'A'],
  ['222', '15:55', 'A'],
  ['224', '16:00', 'B'],
  ['226', '16:15', 'A'],
  ['228', '16:30', 'B'],
  ['230', '16:35', 'A'],
  ['232', '17:00', 'B'],
  ['234', '17:05', 'A'],
  ['236', '17:25', 'A'],
  ['240', '17:40', 'A'],
  ['242', '18:10', 'A'],
  ['244', '18:40', 'A'],
  ['246', '19:10', 'A'],
  ['248', '19:40', 'A'],
  ['250', '20:10', '-'],
  ['252', '20:40', 'A'],
  ['254', '21:10', 'A'],
  ['256', '21:40', 'A'],
  ['258', '22:10', 'A']
];

// Line A Inbound: Tunis -> Erriadh
// Tunis(0), Jebel Jelloud(+4), Megrine Riadh(+6), Megrine(+8), Sidi Rezig(+10),
// Rades(+12), Lycee Rades(+15), Rades Meliane(+18), Ez-Zahra(+20), Bou Kornine(+22),
// Hammam Lif(+24), Arret du Stade(+26), Tahar Sfar(+28), Hammam Chatt(+30), Bir El Bey(+32), Borj Cedria(+36), Erriadh(+40)
const lineA_inbound_data: [string, string, DaysType][] = [
  ['101', '04:30', 'A'],
  ['103', '05:00', '-'],
  ['105', '05:30', '-'],
  ['109', '05:50', 'A'],
  ['111', '06:00', 'B'],
  ['115', '06:15', 'A'],
  ['117', '06:30', 'B'],
  ['119', '06:40', 'A'],
  ['121', '07:00', 'A'],
  ['123', '07:15', 'A'],
  ['125', '07:30', 'D'],
  ['131', '07:45', 'A'],
  ['133', '08:00', 'A'],
  ['135', '08:20', 'A'],
  ['137', '08:30', 'B'],
  ['139', '08:40', 'A'],
  ['141', '09:00', 'A'],
  ['143', '09:20', 'A'],
  ['145', '09:30', 'B'],
  ['147', '09:40', 'A'],
  ['149', '10:00', 'B'],
  ['153', '10:10', 'A'],
  ['155', '10:30', 'A'],
  ['157', '10:40', 'A'],
  ['159', '11:00', 'B'],
  ['161', '11:20', 'A'],
  ['163', '11:30', 'B'],
  ['165', '11:40', 'A'],
  ['167', '12:00', 'A'],
  ['169', '12:20', 'A'],
  ['171', '12:30', 'B'],
  ['173', '12:40', 'A'],
  ['175', '12:55', 'A'],
  ['177', '13:20', 'A'],
  ['181', '13:30', 'B'],
  ['183', '13:45', 'A'],
  ['185', '14:00', 'A'],
  ['189', '14:30', 'A'],
  ['193', '14:50', 'A'],
  ['195', '15:00', 'B'],
  ['197', '15:10', 'A'],
  ['199', '15:30', 'B'],
  ['205', '16:00', 'A'],
  ['207', '16:20', 'A'],
  ['209', '16:35', 'A'],
  ['211', '17:00', 'A'],
  ['213', '17:05', 'A'],
  ['215', '17:25', 'A'],
  ['217', '17:35', 'B'],
  ['219', '17:45', 'A'],
  ['221', '18:00', 'B'],
  ['223', '18:05', 'A'],
  ['225', '18:30', 'A'],
  ['229', '19:00', 'A'],
  ['231', '19:30', 'A'],
  ['233', '20:00', '-'],
  ['235', '20:30', 'A'],
  ['239', '21:00', 'A'],
  ['241', '21:30', 'A'],
  ['243', '22:00', 'A']
];

// Helper to build full schedule array
export function getAllSchedules(): TrainSchedule[] {
  const result: TrainSchedule[] = [];

  // Line E Outbound (Bougatfa -> Tunis)
  // Stops: bougatfa, al_hrairiya, ezzouhour, ettayarane, ennajah, saida_manoubia_e, tunis
  const e_out_stops_offsets = [0, 2, 4, 7, 9, 11, 15];
  const e_out_station_ids = ['bougatfa', 'al_hrairiya', 'ezzouhour', 'ettayarane', 'ennajah', 'saida_manoubia_e', 'tunis'];

  for (const [train, dep, days] of lineE_outbound_data) {
    const depM = parseTimeToMinutes(dep);
    const stops = e_out_station_ids.map((stId, idx) => ({
      stationId: stId,
      time: formatMinutesToTime(depM + e_out_stops_offsets[idx])
    }));
    result.push({
      trainNumber: train,
      lineId: 'E',
      direction: 'outbound',
      departureTime: stops[0].time,
      arrivalTime: stops[stops.length - 1].time,
      originStationId: stops[0].stationId,
      destinationStationId: stops[stops.length - 1].stationId,
      days,
      stops
    });
  }

  // Line E Inbound (Tunis -> Bougatfa)
  const e_in_stops_offsets = [0, 4, 6, 9, 11, 13, 15];
  const e_in_station_ids = ['tunis', 'saida_manoubia_e', 'ennajah', 'ettayarane', 'ezzouhour', 'al_hrairiya', 'bougatfa'];

  for (const [train, dep, days] of lineE_inbound_data) {
    const depM = parseTimeToMinutes(dep);
    const stops = e_in_station_ids.map((stId, idx) => ({
      stationId: stId,
      time: formatMinutesToTime(depM + e_in_stops_offsets[idx])
    }));
    result.push({
      trainNumber: train,
      lineId: 'E',
      direction: 'inbound',
      departureTime: stops[0].time,
      arrivalTime: stops[stops.length - 1].time,
      originStationId: stops[0].stationId,
      destinationStationId: stops[stops.length - 1].stationId,
      days,
      stops
    });
  }

  // Line D Outbound (Gobaa / Gobaa Ville -> Tunis)
  // Stations: gobaa_ville (-5), gobaa (0), les_orangers (+2), manouba (+5), el_bortal (+7), le_bardo (+12), erraoudha (+18), mellassine (+20), saida_manoubia (+22), tunis (+26)
  for (const item of lineD_outbound_data) {
    const depGobaaM = parseTimeToMinutes(item.dep);
    const stops: { stationId: string; time: string }[] = [];

    if (item.fromVille) {
      stops.push({ stationId: 'gobaa_ville', time: formatMinutesToTime(depGobaaM - 5) });
    }
    stops.push(
      { stationId: 'gobaa', time: formatMinutesToTime(depGobaaM) },
      { stationId: 'les_orangers', time: formatMinutesToTime(depGobaaM + 2) },
      { stationId: 'manouba', time: formatMinutesToTime(depGobaaM + 5) },
      { stationId: 'el_bortal', time: formatMinutesToTime(depGobaaM + 7) },
      { stationId: 'le_bardo', time: formatMinutesToTime(depGobaaM + 12) },
      { stationId: 'erraoudha', time: formatMinutesToTime(depGobaaM + 18) },
      { stationId: 'mellassine', time: formatMinutesToTime(depGobaaM + 20) },
      { stationId: 'saida_manoubia', time: formatMinutesToTime(depGobaaM + 22) },
      { stationId: 'tunis', time: formatMinutesToTime(depGobaaM + 26) }
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

  // Line D Inbound (Tunis -> Gobaa / Gobaa Ville)
  for (const item of lineD_inbound_data) {
    const depM = parseTimeToMinutes(item.dep);
    const stops: { stationId: string; time: string }[] = [
      { stationId: 'tunis', time: formatMinutesToTime(depM) },
      { stationId: 'saida_manoubia', time: formatMinutesToTime(depM + 4) },
      { stationId: 'mellassine', time: formatMinutesToTime(depM + 6) },
      { stationId: 'erraoudha', time: formatMinutesToTime(depM + 8) },
      { stationId: 'le_bardo', time: formatMinutesToTime(depM + 14) },
      { stationId: 'el_bortal', time: formatMinutesToTime(depM + 19) },
      { stationId: 'manouba', time: formatMinutesToTime(depM + 21) },
      { stationId: 'les_orangers', time: formatMinutesToTime(depM + 23) },
      { stationId: 'gobaa', time: formatMinutesToTime(depM + 26) }
    ];
    if (item.toVille) {
      stops.push({ stationId: 'gobaa_ville', time: formatMinutesToTime(depM + 30) });
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

  // Line A Outbound (Erriadh -> Tunis)
  const a_out_offsets = [0, 5, 9, 11, 13, 16, 19, 21, 23, 25, 29, 32, 34, 36, 39, 41, 45];
  const a_out_stations = [
    'erriadh', 'borj_cedria', 'bir_el_bey', 'hammam_chatt', 'tahar_sfar',
    'arret_du_stade', 'hammam_lif', 'bou_kornine', 'ez_zahra', 'rades_meliane',
    'lycee_rades', 'rades', 'sidi_rezig', 'megrine', 'megrine_riadh', 'jebel_jelloud', 'tunis_ville'
  ];

  for (const [train, dep, days] of lineA_outbound_data) {
    const depM = parseTimeToMinutes(dep);
    const stops = a_out_stations.map((stId, idx) => ({
      stationId: stId,
      time: formatMinutesToTime(depM + a_out_offsets[idx])
    }));
    result.push({
      trainNumber: train,
      lineId: 'A',
      direction: 'outbound',
      departureTime: stops[0].time,
      arrivalTime: stops[stops.length - 1].time,
      originStationId: stops[0].stationId,
      destinationStationId: stops[stops.length - 1].stationId,
      days,
      stops
    });
  }

  // Line A Inbound (Tunis -> Erriadh)
  const a_in_offsets = [0, 4, 6, 8, 10, 12, 15, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40];
  const a_in_stations = [
    'tunis_ville', 'jebel_jelloud', 'megrine_riadh', 'megrine', 'sidi_rezig',
    'rades', 'lycee_rades', 'rades_meliane', 'ez_zahra', 'bou_kornine',
    'hammam_lif', 'arret_du_stade', 'tahar_sfar', 'hammam_chatt', 'bir_el_bey', 'borj_cedria', 'erriadh'
  ];

  for (const [train, dep, days] of lineA_inbound_data) {
    const depM = parseTimeToMinutes(dep);
    const stops = a_in_stations.map((stId, idx) => ({
      stationId: stId,
      time: formatMinutesToTime(depM + a_in_offsets[idx])
    }));
    result.push({
      trainNumber: train,
      lineId: 'A',
      direction: 'inbound',
      departureTime: stops[0].time,
      arrivalTime: stops[stops.length - 1].time,
      originStationId: stops[0].stationId,
      destinationStationId: stops[stops.length - 1].stationId,
      days,
      stops
    });
  }

  return result;
}

export const ALL_SCHEDULES = getAllSchedules();

// Fare calculation system
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
  if (diff <= 9) return FARE_DATA[2];
  return FARE_DATA[3];
}
