import { describe, it, expect } from 'vitest';
import {
  calculateDistanceKm,
  calculateTravelEstimates,
  formatDistance,
  formatMinutesLabel,
  calculateStationProximities,
  findNearestStation,
  calculateRouteProgressAndEta,
  getAheadBusIntermediates,
  interpolateAlongWaypoints,
  WALKING_SPEED_KMH,
  DRIVING_SPEED_KMH
} from '../utils/geo';
import { LINES, TEBOURBA_BUS_STATION, TUNIS_CENTRAL_ID } from '../data/rfrData';
import { BUS_ROUTE_WAYPOINTS } from '../data/busConnectionData';

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

  describe('calculateRouteProgressAndEta', () => {
    // Tebourba Bus Station -> Gobaa Station
    const originLat = 36.8306;
    const originLng = 9.8417;
    const destLat = 36.8197;
    const destLng = 10.0614;

    it('calculates mid-route progress (~50%) and fallback speed ETA', () => {
      const midLat = (originLat + destLat) / 2;
      const midLng = (originLng + destLng) / 2;

      const res = calculateRouteProgressAndEta(
        midLat,
        midLng,
        originLat,
        originLng,
        destLat,
        destLng,
        null,
        'ar'
      );

      expect(res.arrived).toBe(false);
      expect(res.isLiveSpeed).toBe(false);
      expect(res.speedKmh).toBe(DRIVING_SPEED_KMH);
      expect(res.progressPercent).toBeGreaterThanOrEqual(45);
      expect(res.progressPercent).toBeLessThanOrEqual(55);
      expect(res.distanceToDestKm).toBeGreaterThan(8.5);
      expect(res.distanceToDestKm).toBeLessThan(11.0);
      expect(res.etaMinutes).toBeGreaterThanOrEqual(15);
      expect(res.etaMinutes).toBeLessThanOrEqual(24);
    });

    it('uses live GPS speed when moving >= 1.5 m/s', () => {
      const midLat = (originLat + destLat) / 2;
      const midLng = (originLng + destLng) / 2;

      // 15 m/s = 54 km/h
      const resFast = calculateRouteProgressAndEta(
        midLat,
        midLng,
        originLat,
        originLng,
        destLat,
        destLng,
        15,
        'ar'
      );

      expect(resFast.isLiveSpeed).toBe(true);
      expect(resFast.speedKmh).toBe(54);
      // ~9.8 km at 54 km/h -> ~11 minutes
      expect(resFast.etaMinutes).toBeGreaterThanOrEqual(9);
      expect(resFast.etaMinutes).toBeLessThanOrEqual(13);

      // Slow jitter (0.8 m/s < 1.5 m/s) should fall back to DRIVING_SPEED_KMH
      const resSlowJitter = calculateRouteProgressAndEta(
        midLat,
        midLng,
        originLat,
        originLng,
        destLat,
        destLng,
        0.8,
        'fr'
      );
      expect(resSlowJitter.isLiveSpeed).toBe(false);
      expect(resSlowJitter.speedKmh).toBe(DRIVING_SPEED_KMH);
    });

    it('marks arrived within 150m of destination station', () => {
      const nearGobaaLat = 36.8199;
      const nearGobaaLng = 10.0616;

      const res = calculateRouteProgressAndEta(
        nearGobaaLat,
        nearGobaaLng,
        originLat,
        originLng,
        destLat,
        destLng,
        10,
        'ar'
      );

      expect(res.arrived).toBe(true);
      expect(res.etaMinutes).toBe(0);
      expect(res.progressPercent).toBe(100);
      expect(res.formattedEta).toBe('وصلت المحطة!');
    });
  });

  describe('Bus Corridor Waypoints & Forward Filtering', () => {
    it('returns all 5 intermediate road stops when departing Tebourba for Line 42 and 116', () => {
      const ahead42 = getAheadBusIntermediates(
        36.8306,
        9.8417,
        BUS_ROUTE_WAYPOINTS['42'],
        'tebourba_to_gobaa'
      );
      expect(ahead42.length).toBe(5);
      expect(ahead42[0]).toEqual({ lat: 36.8037, lng: 9.8442 }); // El Battan

      const ahead116 = getAheadBusIntermediates(
        36.8306,
        9.8417,
        BUS_ROUTE_WAYPOINTS['116'],
        'tebourba_to_gobaa'
      );
      expect(ahead116.length).toBe(5);
      expect(ahead116[0]).toEqual({ lat: 36.8398, lng: 9.8516 }); // Ed Dhehiba
    });

    it('filters out already-passed stops and avoids U-turns near the next stop', () => {
      // Mid-segment between Jedeida (36.8493, 9.9353) and Essaida (36.8276, 9.9698)
      const aheadMid = getAheadBusIntermediates(
        36.839,
        9.952,
        BUS_ROUTE_WAYPOINTS['42'],
        'tebourba_to_gobaa'
      );
      expect(aheadMid.length).toBe(3); // Essaida, Carrefour Bejaoua, Oued Ellil
      expect(aheadMid[0]).toEqual({ lat: 36.8276, lng: 9.9698 });

      // Right next to Essaida (< 0.4km), should skip Essaida and aim at Carrefour Bejaoua next
      const aheadNearEssaida = getAheadBusIntermediates(
        36.8278,
        9.9701,
        BUS_ROUTE_WAYPOINTS['42'],
        'tebourba_to_gobaa'
      );
      expect(aheadNearEssaida.length).toBe(2);
      expect(aheadNearEssaida[0]).toEqual({ lat: 36.8361, lng: 10.0136 });
    });

    it('reverses corridor waypoints on gobaa_to_tebourba return trips', () => {
      // At Carrefour Bejaoua heading back toward Tebourba
      const aheadReturn = getAheadBusIntermediates(
        36.834,
        10.005,
        BUS_ROUTE_WAYPOINTS['42'],
        'gobaa_to_tebourba'
      );
      expect(aheadReturn.length).toBe(3); // Essaida -> Jedeida -> El Battan
      expect(aheadReturn[0]).toEqual({ lat: 36.8276, lng: 9.9698 });
      expect(aheadReturn[2]).toEqual({ lat: 36.8037, lng: 9.8442 });
    });

    it('returns empty intermediates when user is far outside the bus corridor (> 5 km)', () => {
      // Tunis Barcelone central station (~12 km away)
      const aheadOutside = getAheadBusIntermediates(
        36.7949,
        10.1805,
        BUS_ROUTE_WAYPOINTS['42'],
        'tebourba_to_gobaa'
      );
      expect(aheadOutside).toEqual([]);
    });

    it('interpolates along multi-segment waypoints preserving start, end, and northern road curve', () => {
      const corridor = BUS_ROUTE_WAYPOINTS['42'];
      expect(interpolateAlongWaypoints(corridor, 0)).toEqual(corridor[0]);
      expect(interpolateAlongWaypoints(corridor, 1)).toEqual(corridor[corridor.length - 1]);

      const mid = interpolateAlongWaypoints(corridor, 0.5);
      // Should sit near the Jedeida - Essaida northern road arc rather than a southern shortcut
      expect(mid.lat).toBeGreaterThan(36.825);
      expect(mid.lng).toBeGreaterThan(9.9);
      expect(mid.lng).toBeLessThan(9.99);
    });
  });
});

