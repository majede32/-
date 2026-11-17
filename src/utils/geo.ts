import { Station } from '../data/rfrData';
import { Language } from '../data/translations';

/**
 * Average speeds in km/h for urban Tunisia transit context:
 * - Walking speed: 4.5 km/h
 * - Urban driving / taxi speed: 30 km/h
 */
export const WALKING_SPEED_KMH = 4.5;
export const DRIVING_SPEED_KMH = 30.0;

/**
 * Calculates Great-Circle distance between two coordinates in kilometers using the Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return Math.round(dist * 100) / 100;
}

/**
 * Returns estimated travel duration in minutes based on distance and speed.
 */
export function calculateTravelEstimates(distanceKm: number): {
  walkMins: number;
  driveMins: number;
} {
  const walkMins = Math.max(1, Math.round((distanceKm / WALKING_SPEED_KMH) * 60));
  const driveMins = Math.max(1, Math.round((distanceKm / DRIVING_SPEED_KMH) * 60));
  return { walkMins, driveMins };
}

/**
 * Formats distance cleanly (e.g. "650 م" / "650 m" if < 1km, or "3.4 كم" / "3.4 km").
 */
export function formatDistance(distanceKm: number, lang: Language = 'ar'): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return lang === 'ar' ? `${meters} م` : `${meters} m`;
  }
  const formatted = distanceKm.toFixed(1);
  return lang === 'ar' ? `${formatted} كم` : `${formatted} km`;
}

/**
 * Formats duration in minutes for human display.
 */
export function formatMinutesLabel(mins: number, lang: Language = 'ar'): string {
  if (lang === 'ar') {
    if (mins === 1) return 'دقيقة واحدة';
    if (mins === 2) return 'دقيقتان';
    if (mins >= 3 && mins <= 10) return `${mins} دقائق`;
    return `${mins} دقيقة`;
  }
  return `${mins} min`;
}

export interface StationProximity {
  station: Station;
  distanceKm: number;
  formattedDistance: string;
  walkMins: number;
  driveMins: number;
  formattedWalk: string;
  formattedDrive: string;
  isNearest: boolean;
}

/**
 * Calculates proximity and estimated travel times for an array of stations.
 * Sorted from closest to farthest.
 */
export function calculateStationProximities(
  userLat: number,
  userLng: number,
  stations: Station[],
  lang: Language = 'ar'
): StationProximity[] {
  const validStations = stations.filter(
    (s): s is Station & { lat: number; lng: number } =>
      typeof s.lat === 'number' && typeof s.lng === 'number'
  );

  const list: StationProximity[] = validStations.map((station) => {
    const distanceKm = calculateDistanceKm(userLat, userLng, station.lat, station.lng);
    const { walkMins, driveMins } = calculateTravelEstimates(distanceKm);
    return {
      station,
      distanceKm,
      formattedDistance: formatDistance(distanceKm, lang),
      walkMins,
      driveMins,
      formattedWalk: formatMinutesLabel(walkMins, lang),
      formattedDrive: formatMinutesLabel(driveMins, lang),
      isNearest: false
    };
  });

  list.sort((a, b) => a.distanceKm - b.distanceKm);

  if (list.length > 0) {
    list[0].isNearest = true;
  }

  return list;
}

/**
 * Finds the nearest station to the given coordinates.
 */
export function findNearestStation(
  userLat: number,
  userLng: number,
  stations: Station[],
  lang: Language = 'ar'
): StationProximity | null {
  const proximities = calculateStationProximities(userLat, userLng, stations, lang);
  return proximities.length > 0 ? proximities[0] : null;
}

export interface RouteProgressResult {
  distanceToDestKm: number;
  formattedDistanceToDest: string;
  totalRouteKm: number;
  distanceFromOriginKm: number;
  progressPercent: number; // 0 to 100
  speedKmh: number;
  isLiveSpeed: boolean;
  etaMinutes: number;
  formattedEta: string;
  arrived: boolean;
}

/**
 * Calculates live GPS progress and ETA along a route between origin and destination stations.
 * Uses real GPS speed if moving (>= 1.5 m/s / ~5.4 km/h), otherwise falls back to urban transit speed (30 km/h).
 */
export function calculateRouteProgressAndEta(
  userLat: number,
  userLng: number,
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  liveSpeedMs?: number | null,
  lang: Language = 'ar'
): RouteProgressResult {
  const distanceToDestKm = calculateDistanceKm(userLat, userLng, destLat, destLng);
  const distanceFromOriginKm = calculateDistanceKm(userLat, userLng, originLat, originLng);
  const totalRouteKm = Math.max(0.1, calculateDistanceKm(originLat, originLng, destLat, destLng));

  // Project progress along the route based on relative distances to origin & destination
  const rawProgress =
    totalRouteKm > 0
      ? ((totalRouteKm - distanceToDestKm) / totalRouteKm) * 100
      : 0;
  const progressPercent = Math.max(0, Math.min(100, Math.round(rawProgress)));

  const arrived = distanceToDestKm <= 0.15; // Within 150 meters of the station

  const hasValidLiveSpeed =
    typeof liveSpeedMs === 'number' && !Number.isNaN(liveSpeedMs) && liveSpeedMs >= 1.5;

  const speedKmh = hasValidLiveSpeed
    ? Math.max(5, Math.round(liveSpeedMs! * 3.6))
    : DRIVING_SPEED_KMH;

  const etaMinutes = arrived
    ? 0
    : Math.max(1, Math.round((distanceToDestKm / speedKmh) * 60));

  return {
    distanceToDestKm,
    formattedDistanceToDest: formatDistance(distanceToDestKm, lang),
    totalRouteKm,
    distanceFromOriginKm,
    progressPercent: arrived ? 100 : progressPercent,
    speedKmh,
    isLiveSpeed: hasValidLiveSpeed,
    etaMinutes,
    formattedEta: arrived
      ? (lang === 'ar' ? 'وصلت المحطة!' : lang === 'fr' ? 'Arrivé !' : 'Arrived!')
      : formatMinutesLabel(etaMinutes, lang),
    arrived
  };
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

/**
 * Projects a GPS point onto the ordered bus corridor (from Tebourba -> Gobâa, reversed on return)
 * and returns only the intermediate waypoints strictly ahead of the user so Google Maps
 * follows the real TRANSTU bus road without routing backwards or taking wrong shortcuts.
 */
export function getAheadBusIntermediates(
  userLat: number,
  userLng: number,
  corridorFromTebourbaToGobaa: LatLngPoint[],
  direction: 'tebourba_to_gobaa' | 'gobaa_to_tebourba',
  maxCorridorDistKm: number = 5
): LatLngPoint[] {
  if (corridorFromTebourbaToGobaa.length < 3) return [];

  const ordered =
    direction === 'tebourba_to_gobaa'
      ? corridorFromTebourbaToGobaa
      : [...corridorFromTebourbaToGobaa].reverse();

  let bestSegIdx = 0;
  let bestT = 0;
  let minDistKm = Infinity;

  for (let i = 0; i < ordered.length - 1; i++) {
    const a = ordered[i];
    const b = ordered[i + 1];
    const cosLat = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);

    const ax = a.lng * cosLat;
    const ay = a.lat;
    const bx = b.lng * cosLat;
    const by = b.lat;
    const px = userLng * cosLat;
    const py = userLat;

    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    const t =
      lenSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq)) : 0;

    const projLat = a.lat + (b.lat - a.lat) * t;
    const projLng = a.lng + (b.lng - a.lng) * t;
    const distKm = calculateDistanceKm(userLat, userLng, projLat, projLng);

    if (distKm < minDistKm) {
      minDistKm = distKm;
      bestSegIdx = i;
      bestT = t;
    }
  }

  // If user is far outside the bus corridor, let routing go directly from their position
  if (minDistKm > maxCorridorDistKm) {
    return [];
  }

  let startIdx = bestSegIdx + 1;
  const candidate = ordered[startIdx];
  if (
    candidate &&
    startIdx < ordered.length - 1 &&
    (bestT > 0.85 || calculateDistanceKm(userLat, userLng, candidate.lat, candidate.lng) < 0.4)
  ) {
    startIdx += 1;
  }

  // Exclude the final terminal station (index ordered.length - 1) since that is the route destination
  if (startIdx >= ordered.length - 1) {
    return [];
  }

  return ordered.slice(startIdx, ordered.length - 1).map((p) => ({ lat: p.lat, lng: p.lng }));
}

/**
 * Interpolates a position along a multi-segment polyline weighted by segment distance.
 */
export function interpolateAlongWaypoints(
  points: LatLngPoint[],
  progress: number
): LatLngPoint {
  if (points.length === 0) return { lat: 0, lng: 0 };
  if (points.length === 1) return points[0];

  const clamped = Math.max(0, Math.min(1, progress));
  if (clamped === 0) return points[0];
  if (clamped === 1) return points[points.length - 1];

  const segLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const d = Math.max(
      0.001,
      calculateDistanceKm(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng)
    );
    segLengths.push(d);
    totalLength += d;
  }

  const targetDist = clamped * totalLength;
  let accumulated = 0;

  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (accumulated + segLen >= targetDist) {
      const localT = (targetDist - accumulated) / segLen;
      return {
        lat: points[i].lat + (points[i + 1].lat - points[i].lat) * localT,
        lng: points[i].lng + (points[i + 1].lng - points[i].lng) * localT
      };
    }
    accumulated += segLen;
  }

  return points[points.length - 1];
}

