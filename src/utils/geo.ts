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
