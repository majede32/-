import { describe, it, expect } from 'vitest';
import {
  calculateDistanceKm,
  calculateTravelEstimates,
  formatDistance,
  formatMinutesLabel,
  calculateStationProximities,
  findNearestStation,
  WALKING_SPEED_KMH,
  DRIVING_SPEED_KMH
} from '../utils/geo';
import { LINES, TEBOURBA_BUS_STATION, TUNIS_CENTRAL_ID } from '../data/rfrData';

describe('Geo & Station Proximity Engine', () => {
  const stations = [...LINES.D.stations, TEBOURBA_BUS_STATION];

  it('calculates distance between known points correctly', () => {
    // Zero distance for identical points
    expect(calculateDistanceKm(36.7949, 10.1805, 36.7949, 10.1805)).toBe(0);

    // Tunis Central to Le Bardo is roughly 4.5 to 5 km
    const distTunisBardo = calculateDistanceKm(36.7949, 10.1805, 36.8094, 10.1292);
    expect(distTunisBardo).toBeGreaterThan(4.0);
    expect(distTunisBardo).toBeLessThan(5.5);

    // Gobaa to Tebourba Bus hub is roughly 19 to 21 km
    const distGobaaTebourba = calculateDistanceKm(36.8197, 10.0614, 36.8306, 9.8417);
    expect(distGobaaTebourba).toBeGreaterThan(18.0);
    expect(distGobaaTebourba).toBeLessThan(22.0);
  });

  it('calculates travel estimates based on walking (4.5 km/h) and driving (30 km/h) speed', () => {
    // 4.5 km walking should take ~60 minutes
    const est4_5 = calculateTravelEstimates(4.5);
    expect(est4_5.walkMins).toBe(60);
    expect(est4_5.driveMins).toBe(9); // 4.5 / 30 * 60 = 9 mins

    // 0.75 km (~750m)
    const est0_75 = calculateTravelEstimates(0.75);
    expect(est0_75.walkMins).toBe(10); // 0.75 / 4.5 * 60 = 10 mins
    expect(est0_75.driveMins).toBeGreaterThanOrEqual(1);
  });

  it('formats distance in meters when < 1km and in kilometers when >= 1km', () => {
    expect(formatDistance(0.45, 'ar')).toBe('450 م');
    expect(formatDistance(0.45, 'fr')).toBe('450 m');
    expect(formatDistance(0.05, 'ar')).toBe('50 م');

    expect(formatDistance(3.42, 'ar')).toBe('3.4 كم');
    expect(formatDistance(3.42, 'fr')).toBe('3.4 km');
    expect(formatDistance(12.0, 'en')).toBe('12.0 km');
  });

  it('formats minutes labels for Arabic and French/English', () => {
    expect(formatMinutesLabel(1, 'ar')).toBe('دقيقة واحدة');
    expect(formatMinutesLabel(2, 'ar')).toBe('دقيقتان');
    expect(formatMinutesLabel(5, 'ar')).toBe('5 دقائق');
    expect(formatMinutesLabel(15, 'ar')).toBe('15 دقيقة');
    expect(formatMinutesLabel(15, 'fr')).toBe('15 min');
  });

  it('identifies nearest station when coordinates are near Manouba', () => {
    // Coordinates right outside Manouba station (lat: 36.8087, lng: 10.0961)
    const userLat = 36.8090;
    const userLng = 10.0965;

    const nearest = findNearestStation(userLat, userLng, stations, 'ar');
    expect(nearest).not.toBeNull();
    expect(nearest!.station.id).toBe('manouba');
    expect(nearest!.distanceKm).toBeLessThan(0.2); // within 200m
    expect(nearest!.isNearest).toBe(true);
  });

  it('identifies nearest station when coordinates are near Tunis Barcelone', () => {
    const userLat = 36.7950;
    const userLng = 10.1800;

    const nearest = findNearestStation(userLat, userLng, stations, 'ar');
    expect(nearest).not.toBeNull();
    expect(nearest!.station.id).toBe(TUNIS_CENTRAL_ID);
  });

  it('identifies nearest station when coordinates are in Tebourba centre', () => {
    const userLat = 36.8310;
    const userLng = 9.8420;

    const nearest = findNearestStation(userLat, userLng, stations, 'ar');
    expect(nearest).not.toBeNull();
    expect(nearest!.station.id).toBe('tebourba_bus');
  });

  it('sorts all stations in ascending order of distance', () => {
    const userLat = 36.8197;
    const userLng = 10.0614; // At Gobaa station

    const proximities = calculateStationProximities(userLat, userLng, stations, 'ar');
    expect(proximities.length).toBe(stations.length);
    expect(proximities[0].station.id).toBe('gobaa');
    expect(proximities[0].isNearest).toBe(true);

    // Each subsequent station should have distance >= previous
    for (let i = 1; i < proximities.length; i++) {
      expect(proximities[i].distanceKm).toBeGreaterThanOrEqual(proximities[i - 1].distanceKm);
      expect(proximities[i].isNearest).toBe(false);
    }
  });
});
