import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  CollisionBehavior,
  useMap,
  useMapsLibrary,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  APILoadingStatus
} from '@vis.gl/react-google-maps';
import {
  LINES,
  Station,
  TEBOURBA_BUS_STATION,
  TUNIS_CENTRAL_ID,
  formatMinutesToTime,
  findStationById
} from '../../data/rfrData';
import { ActiveBusRide, BUS_ROUTE_WAYPOINTS } from '../../data/busConnectionData';
import { TRANSLATIONS, Language } from '../../data/translations';
import { GeoCoordinates } from '../../hooks/useGeolocation';
import {
  getLiveTransitPositions,
  LiveTrainPosition,
  LiveBusPosition,
  LiveTransitSnapshot
} from '../../services/liveTrainTracker';
import {
  calculateDistanceKm,
  calculateRouteProgressAndEta,
  formatDistance,
  formatMinutesLabel,
  getAheadBusIntermediates
} from '../../utils/geo';
import {
  Play,
  Pause,
  RotateCcw,
  Navigation,
  Train,
  Bus,
  Clock,
  Gauge,
  Layers,
  ExternalLink,
  Loader2,
  Car,
  ArrowLeftRight,
  Radio,
  CheckCircle2
} from 'lucide-react';

interface GoogleLiveTrainMapProps {
  apiKey: string;
  lang: Language;
  currentTunisiaMinutes: number;
  currentDayOfWeek: number;
  isHoliday?: boolean;
  onSelectStation?: (lineId: string, stationId: string, role: 'from' | 'to') => void;
  userCoords?: GeoCoordinates | null;
  focusedTrainNumber?: string | null;
  activeBusRide?: ActiveBusRide | null;
  onUpdateBusRide?: (ride: ActiveBusRide | null) => void;
  isWatchingGps?: boolean;
  onStartGpsWatch?: () => void;
  onStopGpsWatch?: () => void;
  onFallbackToOffline?: () => void;
}

type MapTypeOption = 'roadmap' | 'hybrid' | 'terrain';

interface RoadRouteMetrics {
  distanceMeters?: number;
  durationMillis?: number;
  isRoadRoute: boolean;
}

/**
 * Helper wrapper that exposes the underlying AdvancedMarkerElement instance for InfoWindow anchoring
 */
const StationAdvancedMarker: React.FC<{
  station: Station;
  isTerminal: boolean;
  isHub: boolean;
  isBusHub?: boolean;
  lang: Language;
  onSelectMarker: (station: Station, marker: google.maps.marker.AdvancedMarkerElement) => void;
}> = ({ station, isTerminal, isHub, isBusHub = false, lang, onSelectMarker }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  if (typeof station.lat !== 'number' || typeof station.lng !== 'number') {
    return null;
  }

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: station.lat, lng: station.lng }}
      title={lang === 'ar' ? station.nameAr : station.nameFr}
      zIndex={isBusHub || isHub ? 20 : 10}
      collisionBehavior={CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY}
      onClick={() => {
        if (marker) {
          onSelectMarker(station, marker);
        }
      }}
    >
      <div className="flex flex-col items-center cursor-pointer group">
        {isBusHub ? (
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white border-2 border-white ring-2 ring-emerald-300 shadow-md flex items-center justify-center text-[11px] font-bold transition-transform group-hover:scale-110">
            🚌
          </div>
        ) : (
          <div
            className={`w-4 h-4 rounded-full border-2 shadow-md flex items-center justify-center transition-transform group-hover:scale-125 ${
              isTerminal
                ? 'bg-white border-orange-600 ring-4 ring-orange-200'
                : isHub
                ? 'bg-orange-500 border-white ring-2 ring-orange-400'
                : 'bg-white border-orange-500'
            }`}
          >
            {isTerminal && <div className="w-1.5 h-1.5 bg-orange-600 rounded-full" />}
          </div>
        )}
        <span
          className={`mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm whitespace-nowrap ${
            isBusHub ? 'bg-emerald-950/90 text-white' : 'bg-slate-900/90 text-white'
          }`}
        >
          {lang === 'ar' ? station.nameAr : station.nameFr}
        </span>
      </div>
    </AdvancedMarker>
  );
};

/**
 * Manages Polylines, Routes API live bus routing, TrafficLayer, and TransitLayer
 */
const GoogleMapLayersAndRoutes: React.FC<{
  lineDPath: google.maps.LatLngLiteral[];
  busPath: google.maps.LatLngLiteral[];
  busLine: '42' | '116';
  showTraffic: boolean;
  showTransit: boolean;
  flyToTarget: { lat: number; lng: number; zoom?: number; seq: number } | null;
  isUserBusMode: boolean;
  userCoords?: GeoCoordinates | null;
  destStation: Station;
  busDirection: 'tebourba_to_gobaa' | 'gobaa_to_tebourba';
  onRouteMetricsChange: (metrics: RoadRouteMetrics | null) => void;
}> = ({
  lineDPath,
  busPath,
  busLine,
  showTraffic,
  showTransit,
  flyToTarget,
  isUserBusMode,
  userCoords,
  destStation,
  busDirection,
  onRouteMetricsChange
}) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const routesLib = useMapsLibrary('routes');

  const baselineBusPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const baselineRouteCacheRef = useRef<Record<string, google.maps.LatLngLiteral[]>>({});
  const liveBusPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const lastComputedRef = useRef<{
    lat: number;
    lng: number;
    direction: string;
    busLine: '42' | '116';
  } | null>(null);
  const hasFittedBoundsForModeRef = useRef<string | null>(null);

  const clearBaselineBusPolylines = useCallback(() => {
    baselineBusPolylinesRef.current.forEach((p) => p.setMap(null));
    baselineBusPolylinesRef.current = [];
  }, []);

  const clearLiveBusPolylines = useCallback(() => {
    liveBusPolylinesRef.current.forEach((p) => p.setMap(null));
    liveBusPolylinesRef.current = [];
  }, []);

  // Render Line D railway track & real-road TRANSTU Bus 42 / 116 corridor
  useEffect(() => {
    if (!map || !mapsLib) return;
    let cancelled = false;

    const railCasing = new mapsLib.Polyline({
      path: lineDPath,
      strokeColor: '#9a3412',
      strokeOpacity: 0.9,
      strokeWeight: 6,
      geodesic: true,
      map
    });

    const railMain = new mapsLib.Polyline({
      path: lineDPath,
      strokeColor: '#ea580c',
      strokeOpacity: 1,
      strokeWeight: 4,
      geodesic: true,
      map
    });

    const isDimmed = Boolean(isUserBusMode && userCoords);
    const drawBaselinePath = (pathCoords: google.maps.LatLngLiteral[], isRoadGeometry: boolean) => {
      clearBaselineBusPolylines();
      if (pathCoords.length < 2) return;

      if (isRoadGeometry) {
        const casing = new mapsLib.Polyline({
          path: pathCoords,
          strokeColor: '#065f46',
          strokeOpacity: isDimmed ? 0.22 : 0.75,
          strokeWeight: 6,
          zIndex: 15,
          map
        });
        const inner = new mapsLib.Polyline({
          path: pathCoords,
          strokeColor: '#10b981',
          strokeOpacity: isDimmed ? 0.25 : 0.9,
          strokeWeight: 3.5,
          zIndex: 16,
          map
        });
        baselineBusPolylinesRef.current = [casing, inner];
      } else {
        const dashed = new mapsLib.Polyline({
          path: pathCoords,
          strokeColor: '#059669',
          strokeOpacity: 0,
          strokeWeight: 3,
          geodesic: true,
          zIndex: 15,
          icons: [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: isDimmed ? 0.25 : 0.85,
                strokeColor: '#059669',
                scale: 2.5
              },
              offset: '0',
              repeat: '14px'
            }
          ],
          map
        });
        baselineBusPolylinesRef.current = [dashed];
      }
    };

    const cachedRoadPath = baselineRouteCacheRef.current[busLine];
    if (cachedRoadPath && cachedRoadPath.length > 1) {
      drawBaselinePath(cachedRoadPath, true);
    } else {
      drawBaselinePath(busPath, false);

      if (routesLib?.Route?.computeRoutes && busPath.length >= 2) {
        const computeBaselineRoad = async () => {
          try {
            const origin = busPath[0];
            const destination = busPath[busPath.length - 1];
            const intermediates = busPath.slice(1, -1).map((pt) => ({
              location: pt,
              via: true
            }));

            const { routes } = await routesLib.Route.computeRoutes({
              origin,
              destination,
              intermediates,
              travelMode: routesLib.TravelMode.DRIVING,
              fields: ['path']
            });

            if (cancelled) return;
            const primary = routes?.[0];
            const roadPoints: google.maps.LatLngLiteral[] =
              primary?.path?.map((p) => ({
                lat: typeof p.lat === 'function' ? (p as unknown as google.maps.LatLng).lat() : p.lat,
                lng: typeof p.lng === 'function' ? (p as unknown as google.maps.LatLng).lng() : p.lng
              })) ?? [];

            if (roadPoints.length > 1) {
              baselineRouteCacheRef.current[busLine] = roadPoints;
              drawBaselinePath(roadPoints, true);
            }
          } catch {
            // Keep waypoint polyline fallback on quota/network error
          }
        };

        void computeBaselineRoad();
      }
    }

    return () => {
      cancelled = true;
      clearBaselineBusPolylines();
      railCasing.setMap(null);
      railMain.setMap(null);
    };
  }, [map, mapsLib, routesLib, lineDPath, busPath, busLine, isUserBusMode, userCoords, clearBaselineBusPolylines]);

  // Live Road Route Computation from User's GPS Position (= Bus Position) -> Destination Station via Real Bus Corridor
  useEffect(() => {
    if (
      !map ||
      !mapsLib ||
      !isUserBusMode ||
      !userCoords ||
      typeof destStation.lat !== 'number' ||
      typeof destStation.lng !== 'number'
    ) {
      clearLiveBusPolylines();
      lastComputedRef.current = null;
      hasFittedBoundsForModeRef.current = null;
      onRouteMetricsChange(null);
      return;
    }

    const prev = lastComputedRef.current;
    const movedKm = prev
      ? calculateDistanceKm(prev.lat, prev.lng, userCoords.lat, userCoords.lng)
      : Infinity;
    const directionChanged = !prev || prev.direction !== busDirection;
    const lineChanged = !prev || prev.busLine !== busLine;

    // Throttle Routes API calls unless direction/line changed or user moved >= 250m
    if (
      !directionChanged &&
      !lineChanged &&
      movedKm < 0.25 &&
      liveBusPolylinesRef.current.length > 0
    ) {
      return;
    }

    let cancelled = false;
    const origin = { lat: userCoords.lat, lng: userCoords.lng };
    const destination = { lat: destStation.lat, lng: destStation.lng };
    const aheadIntermediates = getAheadBusIntermediates(
      userCoords.lat,
      userCoords.lng,
      BUS_ROUTE_WAYPOINTS[busLine],
      busDirection
    );

    const drawFallbackPolyline = () => {
      clearLiveBusPolylines();
      const fallbackPath = [origin, ...aheadIntermediates, destination];
      const casing = new mapsLib.Polyline({
        path: fallbackPath,
        strokeColor: '#064e3b',
        strokeOpacity: 0.75,
        strokeWeight: 7,
        geodesic: true,
        zIndex: 40,
        map
      });
      const main = new mapsLib.Polyline({
        path: fallbackPath,
        strokeColor: '#10b981',
        strokeOpacity: 0.95,
        strokeWeight: 4.5,
        geodesic: true,
        zIndex: 45,
        map
      });
      liveBusPolylinesRef.current = [casing, main];
      onRouteMetricsChange({ isRoadRoute: false });
    };

    if (!routesLib?.Route?.computeRoutes) {
      drawFallbackPolyline();
      lastComputedRef.current = {
        lat: userCoords.lat,
        lng: userCoords.lng,
        direction: busDirection,
        busLine
      };
      return;
    }

    lastComputedRef.current = {
      lat: userCoords.lat,
      lng: userCoords.lng,
      direction: busDirection,
      busLine
    };

    const computeLiveBusRoute = async () => {
      try {
        const request: google.maps.routes.ComputeRoutesRequest = {
          origin,
          destination,
          ...(aheadIntermediates.length > 0
            ? {
                intermediates: aheadIntermediates.map((pt) => ({
                  location: pt,
                  via: true
                }))
              }
            : {}),
          travelMode: routesLib.TravelMode.DRIVING,
          fields: ['path', 'distanceMeters', 'durationMillis', 'viewport']
        };

        const { routes } = await routesLib.Route.computeRoutes(request);
        if (cancelled) return;

        const primaryRoute = routes?.[0];
        if (!primaryRoute) {
          drawFallbackPolyline();
          return;
        }

        clearLiveBusPolylines();

        const createdCasing = primaryRoute.createPolylines({
          polylineOptions: {
            strokeColor: '#064e3b',
            strokeOpacity: 0.85,
            strokeWeight: 9,
            zIndex: 40
          }
        });
        const createdMain = primaryRoute.createPolylines({
          polylineOptions: {
            strokeColor: '#10b981',
            strokeOpacity: 1,
            strokeWeight: 5.5,
            zIndex: 45
          }
        });

        createdCasing.forEach((p) => p.setMap(map));
        createdMain.forEach((p) => p.setMap(map));
        liveBusPolylinesRef.current = [...createdCasing, ...createdMain];

        // Fit viewport when entering live bus mode or switching destination/line
        const fitKey = `${busDirection}-${busLine}`;
        if (primaryRoute.viewport && hasFittedBoundsForModeRef.current !== fitKey) {
          map.fitBounds(primaryRoute.viewport, 48);
          hasFittedBoundsForModeRef.current = fitKey;
        }

        onRouteMetricsChange({
          distanceMeters: primaryRoute.distanceMeters,
          durationMillis: primaryRoute.durationMillis ?? undefined,
          isRoadRoute: true
        });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.includes('Quota')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        drawFallbackPolyline();
      }
    };

    void computeLiveBusRoute();

    return () => {
      cancelled = true;
    };
  }, [
    map,
    mapsLib,
    routesLib,
    isUserBusMode,
    userCoords,
    destStation,
    busDirection,
    busLine,
    clearLiveBusPolylines,
    onRouteMetricsChange
  ]);

  // Cleanup live polylines on unmount
  useEffect(() => {
    return () => {
      clearBaselineBusPolylines();
      clearLiveBusPolylines();
    };
  }, [clearBaselineBusPolylines, clearLiveBusPolylines]);

  // Toggle Google Maps Live Traffic Layer
  useEffect(() => {
    if (!map || !mapsLib || !showTraffic) return;
    const trafficLayer = new mapsLib.TrafficLayer();
    trafficLayer.setMap(map);
    return () => {
      trafficLayer.setMap(null);
    };
  }, [map, mapsLib, showTraffic]);

  // Toggle Google Maps Public Transit Layer
  useEffect(() => {
    if (!map || !mapsLib || !showTransit) return;
    const transitLayer = new mapsLib.TransitLayer();
    transitLayer.setMap(map);
    return () => {
      transitLayer.setMap(null);
    };
  }, [map, mapsLib, showTransit]);

  // Smooth pan/zoom when focusing on train or user GPS
  useEffect(() => {
    if (!map || !flyToTarget) return;
    map.panTo({ lat: flyToTarget.lat, lng: flyToTarget.lng });
    if (flyToTarget.zoom) {
      map.setZoom(flyToTarget.zoom);
    }
  }, [map, flyToTarget]);

  return null;
};

/**
 * Monitors API loading status and handles loading spinner / fallback notifications
 */
const GoogleMapsStatusWatcher: React.FC<{
  lang: Language;
  onFallbackToOffline?: () => void;
}> = ({ lang, onFallbackToOffline }) => {
  const t = TRANSLATIONS[lang];
  const status = useApiLoadingStatus();

  useEffect(() => {
    if (status === APILoadingStatus.AUTH_FAILURE) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      onFallbackToOffline?.();
    } else if (status === APILoadingStatus.FAILED) {
      onFallbackToOffline?.();
    }
  }, [status, onFallbackToOffline]);

  if (status === APILoadingStatus.LOADING || status === APILoadingStatus.NOT_LOADED) {
    return (
      <div className="absolute inset-0 z-30 bg-slate-100/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-slate-700">
        <Loader2 className="w-7 h-7 text-orange-600 animate-spin" />
        <span className="text-xs font-bold">{t.mapLoadingLabel}</span>
      </div>
    );
  }

  return null;
};

export const GoogleLiveTrainMap: React.FC<GoogleLiveTrainMapProps> = ({
  apiKey,
  lang,
  currentTunisiaMinutes,
  currentDayOfWeek,
  isHoliday = false,
  onSelectStation,
  userCoords,
  focusedTrainNumber,
  activeBusRide,
  onUpdateBusRide,
  isWatchingGps = false,
  onStartGpsWatch,
  onFallbackToOffline
}) => {
  const t = TRANSLATIONS[lang];

  // Time simulation & controls state
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [scrubbedMinutes, setScrubbedMinutes] = useState<number>(currentTunisiaMinutes);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Local fallback state for User-As-Bus mode (synced with activeBusRide)
  const [localBusMode, setLocalBusMode] = useState<boolean>(Boolean(activeBusRide?.isUserOnBoard));
  const [localBusDirection, setLocalBusDirection] = useState<'tebourba_to_gobaa' | 'gobaa_to_tebourba'>(
    activeBusRide?.direction ?? 'tebourba_to_gobaa'
  );
  const [localBusLine, setLocalBusLine] = useState<'42' | '116'>(activeBusRide?.line ?? '42');
  const [roadRouteMetrics, setRoadRouteMetrics] = useState<RoadRouteMetrics | null>(null);

  useEffect(() => {
    if (activeBusRide) {
      setLocalBusMode(activeBusRide.isUserOnBoard);
      setLocalBusDirection(activeBusRide.direction);
      setLocalBusLine(activeBusRide.line);
    } else {
      setLocalBusMode(false);
    }
  }, [activeBusRide]);

  const isUserBusMode = activeBusRide ? activeBusRide.isUserOnBoard : localBusMode;
  const busDirection = activeBusRide?.direction ?? localBusDirection;
  const busLineLabel: '42' | '116' = activeBusRide?.line ?? localBusLine;

  // Map type & layers
  const [mapTypeId, setMapTypeId] = useState<MapTypeOption>('roadmap');
  const [showTraffic, setShowTraffic] = useState<boolean>(true);
  const [showTransit, setShowTransit] = useState<boolean>(false);

  // Selection states
  const [selectedTrain, setSelectedTrain] = useState<LiveTrainPosition | null>(null);
  const [selectedBus, setSelectedBus] = useState<LiveBusPosition | null>(null);
  const [selectedStationInfo, setSelectedStationInfo] = useState<{
    station: Station;
    marker: google.maps.marker.AdvancedMarkerElement;
  } | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    seq: number;
  } | null>(null);

  const triggerFlyTo = useCallback((lat: number, lng: number, zoom?: number) => {
    setFlyToTarget((prev) => ({ lat, lng, zoom, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  const effectiveMinutes = isLiveMode ? currentTunisiaMinutes : scrubbedMinutes;

  useEffect(() => {
    if (isLiveMode) {
      setScrubbedMinutes(currentTunisiaMinutes);
    }
  }, [currentTunisiaMinutes, isLiveMode]);

  const snapshot: LiveTransitSnapshot = useMemo(() => {
    return getLiveTransitPositions(effectiveMinutes, currentDayOfWeek, isHoliday);
  }, [effectiveMinutes, currentDayOfWeek, isHoliday]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setScrubbedMinutes((prev) => {
        setIsLiveMode(false);
        const next = prev + 1;
        return next > 1350 ? 270 : next;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Focus on requested train
  useEffect(() => {
    if (focusedTrainNumber) {
      const target = snapshot.activeTrains.find((tr) => tr.trainNumber === focusedTrainNumber);
      if (target) {
        setSelectedTrain(target);
        setSelectedBus(null);
        triggerFlyTo(target.currentLat, target.currentLng, 14);
      }
    }
  }, [focusedTrainNumber, snapshot.activeTrains, triggerFlyTo]);

  // Stations for User-As-Bus routing
  const gobaaStation = useMemo(() => findStationById('gobaa') || TEBOURBA_BUS_STATION, []);
  const originStation = busDirection === 'tebourba_to_gobaa' ? TEBOURBA_BUS_STATION : gobaaStation;
  const destStation = busDirection === 'tebourba_to_gobaa' ? gobaaStation : TEBOURBA_BUS_STATION;

  // Toggle "My location = Bus" mode
  const handleToggleUserBusMode = useCallback(() => {
    if (!isUserBusMode) {
      setSelectedTrain(null);
      setSelectedBus(null);
      setSelectedStationInfo(null);
      setLocalBusMode(true);
      onStartGpsWatch?.();
      onUpdateBusRide?.({
        busId: activeBusRide?.busId ?? 'user-live-bus',
        line: busLineLabel,
        direction: busDirection,
        departureTime: activeBusRide?.departureTime ?? formatMinutesToTime(currentTunisiaMinutes),
        isUserOnBoard: true
      });
      if (userCoords) {
        triggerFlyTo(userCoords.lat, userCoords.lng, 13);
      }
    } else {
      setLocalBusMode(false);
      onUpdateBusRide?.(null);
      setRoadRouteMetrics(null);
    }
  }, [
    isUserBusMode,
    activeBusRide,
    busLineLabel,
    busDirection,
    currentTunisiaMinutes,
    userCoords,
    onStartGpsWatch,
    onUpdateBusRide,
    triggerFlyTo
  ]);

  // Switch destination between Gobâa and Tebourba
  const handleSwitchBusDestination = useCallback(() => {
    const nextDir: 'tebourba_to_gobaa' | 'gobaa_to_tebourba' =
      busDirection === 'tebourba_to_gobaa' ? 'gobaa_to_tebourba' : 'tebourba_to_gobaa';
    setLocalBusDirection(nextDir);
    onUpdateBusRide?.({
      busId: activeBusRide?.busId ?? 'user-live-bus',
      line: busLineLabel,
      direction: nextDir,
      departureTime: activeBusRide?.departureTime ?? formatMinutesToTime(currentTunisiaMinutes),
      isUserOnBoard: true
    });
  }, [busDirection, activeBusRide, busLineLabel, currentTunisiaMinutes, onUpdateBusRide]);

  // Switch feeder bus line between 42 (via El Battan) and 116 (via Ed Dhehiba)
  const handleSwitchBusLine = useCallback(
    (nextLine: '42' | '116') => {
      setLocalBusLine(nextLine);
      if (activeBusRide || isUserBusMode) {
        onUpdateBusRide?.({
          busId: activeBusRide?.busId ?? 'user-live-bus',
          line: nextLine,
          direction: busDirection,
          departureTime: activeBusRide?.departureTime ?? formatMinutesToTime(currentTunisiaMinutes),
          isUserOnBoard: isUserBusMode
        });
      }
    },
    [activeBusRide, isUserBusMode, busDirection, currentTunisiaMinutes, onUpdateBusRide]
  );

  // Line D station coordinates path
  const lineDStations = LINES.D.stations;
  const lineDPath: google.maps.LatLngLiteral[] = useMemo(() => {
    return lineDStations
      .filter(
        (s): s is Station & { lat: number; lng: number } =>
          typeof s.lat === 'number' && typeof s.lng === 'number'
      )
      .map((s) => ({ lat: s.lat, lng: s.lng }));
  }, [lineDStations]);

  // Feeder bus verified corridor path (Line 42 via El Battan / Line 116 via Ed Dhehiba)
  const busPath: google.maps.LatLngLiteral[] = useMemo(() => {
    return BUS_ROUTE_WAYPOINTS[busLineLabel].map((p) => ({ lat: p.lat, lng: p.lng }));
  }, [busLineLabel]);

  const busCorridorStops = useMemo(() => {
    return BUS_ROUTE_WAYPOINTS[busLineLabel].slice(1, -1);
  }, [busLineLabel]);

  // Compute live GPS progress & ETA toward destStation
  const gpsProgress = useMemo(() => {
    if (
      !userCoords ||
      typeof originStation.lat !== 'number' ||
      typeof originStation.lng !== 'number' ||
      typeof destStation.lat !== 'number' ||
      typeof destStation.lng !== 'number'
    ) {
      return null;
    }

    return calculateRouteProgressAndEta(
      userCoords.lat,
      userCoords.lng,
      originStation.lat,
      originStation.lng,
      destStation.lat,
      destStation.lng,
      userCoords.speed,
      lang
    );
  }, [userCoords, originStation, destStation, lang]);

  // Combined displayed metrics (prefers real Routes API road distance & duration when available)
  const displayedBusMetrics = useMemo(() => {
    if (!gpsProgress) return null;

    const hasRoadDist =
      typeof roadRouteMetrics?.distanceMeters === 'number' && roadRouteMetrics.distanceMeters >= 0;
    const distanceKm = hasRoadDist
      ? Math.round((roadRouteMetrics!.distanceMeters! / 1000) * 100) / 100
      : gpsProgress.distanceToDestKm;

    const arrived = gpsProgress.arrived || distanceKm <= 0.15;

    const hasRoadDuration =
      typeof roadRouteMetrics?.durationMillis === 'number' &&
      Number.isFinite(roadRouteMetrics.durationMillis) &&
      roadRouteMetrics.durationMillis > 0;

    const etaMinutes = arrived
      ? 0
      : hasRoadDuration
      ? Math.max(1, Math.round(roadRouteMetrics!.durationMillis! / 60000))
      : gpsProgress.etaMinutes;

    const expectedClock = formatMinutesToTime((currentTunisiaMinutes + etaMinutes) % 1440);

    return {
      arrived,
      distanceLabel: formatDistance(distanceKm, lang),
      etaMinutes,
      etaLabel: arrived
        ? lang === 'ar'
          ? 'وصلت المحطة!'
          : lang === 'fr'
          ? 'Arrivé !'
          : 'Arrived!'
        : formatMinutesLabel(etaMinutes, lang),
      expectedClock,
      speedKmh: gpsProgress.speedKmh,
      isLiveSpeed: gpsProgress.isLiveSpeed,
      isRoadRoute: Boolean(roadRouteMetrics?.isRoadRoute && hasRoadDist),
      progressPercent: arrived ? 100 : gpsProgress.progressPercent
    };
  }, [gpsProgress, roadRouteMetrics, currentTunisiaMinutes, lang]);

  // Suppress simulated ghost buses going in the same direction when user's live GPS IS the bus
  const displayedBuses = useMemo(() => {
    if (isUserBusMode && userCoords) {
      return snapshot.activeBuses.filter((b) => b.direction !== busDirection);
    }
    return snapshot.activeBuses;
  }, [snapshot.activeBuses, isUserBusMode, userCoords, busDirection]);

  const gobaaDistLabel = useMemo(() => {
    if (!userCoords) return null;
    if (typeof destStation.lat === 'number' && typeof destStation.lng === 'number') {
      return formatDistance(
        calculateDistanceKm(userCoords.lat, userCoords.lng, destStation.lat, destStation.lng),
        lang
      );
    }
    return null;
  }, [userCoords, destStation, lang]);

  const formattedScrubbedTime = formatMinutesToTime(effectiveMinutes);

  return (
    <div className="space-y-4">
      {/* Map Header Card */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-xl shadow-xs border border-white/20">
              🗺️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black">{t.liveTrainMap}</h3>
                <span className="bg-white/20 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-white/25">
                  {t.googleMapsBadge}
                </span>
                {isLiveMode && (
                  <span className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    {t.live}
                  </span>
                )}
              </div>
              <p className="text-xs text-orange-100 mt-0.5">
                {isUserBusMode
                  ? t.userAsBusActiveBadge
                  : lang === 'ar'
                  ? 'خريطة Google Maps تفاعلية مع مواقع القطارات والحافلات وحالة حركة المرور الحية'
                  : 'Google Maps interactive avec positions des trains, bus et trafic en direct'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isLiveMode && (
              <button
                type="button"
                onClick={() => {
                  setIsLiveMode(true);
                  setIsPlaying(false);
                  setScrubbedMinutes(currentTunisiaMinutes);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-orange-800 hover:bg-orange-50 font-bold text-xs shadow-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
                <span>{t.resetToLiveTime}</span>
              </button>
            )}

            <div
              className="px-3 py-1.5 rounded-xl bg-black/25 backdrop-blur-sm border border-white/15 text-white font-mono font-bold text-xs flex items-center gap-1.5"
              dir="ltr"
            >
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>{formattedScrubbedTime}</span>
            </div>
          </div>
        </div>

        {/* Stats, User-As-Bus Toggle & Google Maps Layer Toggles */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleToggleUserBusMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs border transition-all active:scale-95 ${
                isUserBusMode
                  ? 'bg-emerald-400 text-slate-950 border-white shadow-md ring-2 ring-emerald-200/70'
                  : 'bg-white/15 hover:bg-white/25 text-white border-white/25'
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              <span>{t.userAsBusModeBtn}</span>
              {isUserBusMode && <Radio className="w-3 h-3 animate-pulse text-emerald-950" />}
            </button>

            <div className="flex items-center bg-black/20 p-0.5 rounded-xl border border-white/15">
              {(['42', '116'] as const).map((ln) => (
                <button
                  key={ln}
                  type="button"
                  onClick={() => handleSwitchBusLine(ln)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors ${
                    busLineLabel === ln
                      ? 'bg-emerald-400 text-slate-950 shadow-xs'
                      : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  {lang === 'ar' ? `حافلة ${ln}` : `Bus ${ln}`}
                </button>
              ))}
            </div>

            <div className="bg-white/15 backdrop-blur-sm px-3 py-1 rounded-xl flex items-center gap-1.5 font-bold">
              <Train className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {snapshot.activeTrains.length > 0
                  ? `${snapshot.activeTrains.length} ${t.trainsInTransit}`
                  : t.noTrainsInTransit}
              </span>
            </div>

            {displayedBuses.length > 0 && (
              <div className="bg-emerald-500/30 backdrop-blur-sm px-3 py-1 rounded-xl flex items-center gap-1.5 font-bold text-emerald-100 border border-emerald-400/30">
                <Bus className="w-3.5 h-3.5 text-emerald-300" />
                <span>
                  {displayedBuses.length} {t.busesInTransit}
                </span>
              </div>
            )}
          </div>

          {/* Map Type & Traffic/Transit Layer Switchers */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center bg-black/20 p-0.5 rounded-xl border border-white/15">
              {(
                [
                  { id: 'roadmap', label: t.mapTypeRoadmap },
                  { id: 'hybrid', label: t.mapTypeHybrid },
                  { id: 'terrain', label: t.mapTypeTerrain }
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMapTypeId(item.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    mapTypeId === item.id
                      ? 'bg-white text-orange-800 shadow-xs'
                      : 'text-orange-100 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowTraffic((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors ${
                showTraffic
                  ? 'bg-emerald-500 text-white border-emerald-300 shadow-xs'
                  : 'bg-black/20 text-orange-100 border-white/15 hover:bg-black/30'
              }`}
            >
              <Car className="w-3 h-3" />
              <span>{t.trafficLayerLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTransit((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors ${
                showTransit
                  ? 'bg-blue-500 text-white border-blue-300 shadow-xs'
                  : 'bg-black/20 text-orange-100 border-white/15 hover:bg-black/30'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>{t.transitLayerLabel}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Real Google Maps Container (Explicit height per CF2) */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-slate-100 h-[420px] sm:h-[480px]">
        <APIProvider
          apiKey={apiKey}
          libraries={['marker', 'maps', 'routes']}
          language={lang}
          region="TN"
        >
          <GoogleMapsStatusWatcher lang={lang} onFallbackToOffline={onFallbackToOffline} />

          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={{ lat: 36.812, lng: 10.04 }}
            defaultZoom={11}
            mapTypeId={mapTypeId}
            gestureHandling="greedy"
            streetViewControl={true}
            mapTypeControl={false}
            fullscreenControl={true}
            zoomControl={true}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
            onClick={() => {
              setSelectedStationInfo(null);
            }}
          >
            <GoogleMapLayersAndRoutes
              lineDPath={lineDPath}
              busPath={busPath}
              busLine={busLineLabel}
              showTraffic={showTraffic}
              showTransit={showTransit}
              flyToTarget={flyToTarget}
              isUserBusMode={isUserBusMode}
              userCoords={userCoords}
              destStation={destStation}
              busDirection={busDirection}
              onRouteMetricsChange={setRoadRouteMetrics}
            />

            {/* Intermediate Feeder Bus Stops along verified corridor */}
            {busCorridorStops.map((stop) => (
              <AdvancedMarker
                key={`${busLineLabel}-${stop.nameFr}`}
                position={{ lat: stop.lat, lng: stop.lng }}
                title={lang === 'ar' ? stop.nameAr : stop.nameFr}
                zIndex={15}
                collisionBehavior={CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY}
              >
                <div className="flex flex-col items-center pointer-events-none">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shadow-sm" />
                  <span className="mt-0.5 px-1.5 py-0.2 rounded bg-emerald-900/85 text-white text-[8px] font-bold shadow-xs whitespace-nowrap">
                    {lang === 'ar' ? stop.nameAr : stop.nameFr}
                  </span>
                </div>
              </AdvancedMarker>
            ))}

            {/* Line D Stations */}
            {lineDStations.map((station, index) => (
              <StationAdvancedMarker
                key={station.id}
                station={station}
                isTerminal={index === 0 || index === lineDStations.length - 1}
                isHub={station.id === TUNIS_CENTRAL_ID || station.id === 'gobaa'}
                lang={lang}
                onSelectMarker={(st, marker) => {
                  setSelectedStationInfo({ station: st, marker });
                }}
              />
            ))}

            {/* Tebourba Bus Hub Marker */}
            <StationAdvancedMarker
              station={TEBOURBA_BUS_STATION}
              isTerminal={true}
              isHub={true}
              isBusHub={true}
              lang={lang}
              onSelectMarker={(st, marker) => {
                setSelectedStationInfo({ station: st, marker });
              }}
            />

            {/* Station InfoWindow */}
            {selectedStationInfo && (
              <InfoWindow
                anchor={selectedStationInfo.marker}
                pixelOffset={[0, -10]}
                onCloseClick={() => setSelectedStationInfo(null)}
              >
                <div
                  className="p-1 max-w-[220px] text-slate-900 space-y-2"
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                >
                  <div>
                    <h4 className="font-black text-xs text-slate-900">
                      {lang === 'ar'
                        ? selectedStationInfo.station.nameAr
                        : selectedStationInfo.station.nameFr}
                    </h4>
                    {selectedStationInfo.station.connections &&
                      selectedStationInfo.station.connections.length > 0 && (
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          {selectedStationInfo.station.connections.join(' · ')}
                        </p>
                      )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {onSelectStation && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectStation('D', selectedStationInfo.station.id, 'from');
                          setSelectedStationInfo(null);
                        }}
                        className="px-2 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold"
                      >
                        {t.setAsDepartureStation}
                      </button>
                    )}

                    {typeof selectedStationInfo.station.lat === 'number' &&
                      typeof selectedStationInfo.station.lng === 'number' && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${selectedStationInfo.station.lat},${selectedStationInfo.station.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-semibold"
                        >
                          <span>{t.openInGoogleMaps}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                  </div>
                </div>
              </InfoWindow>
            )}

            {/* User Live GPS Marker (Renders AS the active Bus Marker when isUserBusMode is active) */}
            {userCoords && (
              <AdvancedMarker
                position={{ lat: userCoords.lat, lng: userCoords.lng }}
                zIndex={1050}
                title={isUserBusMode ? t.myBusLocationLabel : t.yourLocation}
                onClick={() => {
                  if (isUserBusMode) {
                    setSelectedTrain(null);
                    setSelectedBus(null);
                  }
                }}
              >
                {isUserBusMode ? (
                  <div className="flex flex-col items-center cursor-pointer">
                    <div className="relative flex items-center justify-center">
                      <span className="absolute -inset-2.5 rounded-full bg-emerald-500/45 animate-ping" />
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-2 border-white ring-4 ring-emerald-400/70 shadow-xl flex items-center justify-center text-base font-black">
                        🚌
                      </div>
                    </div>
                    <div className="mt-1 bg-emerald-950 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg border border-emerald-400 whitespace-nowrap flex items-center gap-1">
                      <span>{t.myBusLocationLabel}</span>
                      {activeBusRide?.line && (
                        <span className="bg-emerald-500 text-slate-950 px-1 rounded text-[9px]">
                          {activeBusRide.line}
                        </span>
                      )}
                      {displayedBusMetrics && (
                        <span className="text-amber-300 font-mono" dir="ltr">
                          {displayedBusMetrics.speedKmh} km/h
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center">
                    <span className="absolute w-7 h-7 rounded-full bg-blue-500/35 animate-ping" />
                    <span className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg" />
                  </div>
                )}
              </AdvancedMarker>
            )}

            {/* Live Active Trains */}
            {snapshot.activeTrains.map((train) => {
              const isSelected = selectedTrain?.trainNumber === train.trainNumber;
              const directionArrow =
                train.direction === 'outbound'
                  ? lang === 'ar'
                    ? '⬅ تونس'
                    : 'Tunis ➔'
                  : lang === 'ar'
                  ? 'القباعة ➔'
                  : 'Gobâa ➔';

              return (
                <AdvancedMarker
                  key={train.trainNumber}
                  position={{ lat: train.currentLat, lng: train.currentLng }}
                  zIndex={isSelected ? 1000 : 600}
                  onClick={() => {
                    setSelectedTrain(train);
                    setSelectedBus(null);
                    setSelectedStationInfo(null);
                  }}
                >
                  <div className="flex flex-col items-center cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <span className="absolute -inset-2 rounded-full bg-orange-500/40 animate-ping" />
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white border-2 shadow-lg flex items-center justify-center text-xs font-black transition-transform ${
                          isSelected
                            ? 'border-white ring-4 ring-orange-500 scale-125'
                            : 'border-white ring-2 ring-orange-300 group-hover:scale-110'
                        }`}
                      >
                        🚆
                      </div>
                    </div>
                    <div className="mt-1 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-slate-700 whitespace-nowrap">
                      <span>{train.trainNumber}</span>
                      <span className="text-[8px] text-orange-300">{directionArrow}</span>
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Next Upcoming Train if none active */}
            {snapshot.activeTrains.length === 0 && snapshot.nextUpcomingTrain && (
              <AdvancedMarker
                position={{
                  lat: snapshot.nextUpcomingTrain.currentLat,
                  lng: snapshot.nextUpcomingTrain.currentLng
                }}
                zIndex={500}
                onClick={() => {
                  setSelectedTrain(snapshot.nextUpcomingTrain);
                  setSelectedBus(null);
                }}
              >
                <div className="flex flex-col items-center cursor-pointer">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white border-2 border-amber-400 shadow-md flex items-center justify-center text-xs">
                    🚆
                  </div>
                  <div className="mt-1 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-md shadow whitespace-nowrap">
                    {snapshot.nextUpcomingTrain.trainNumber} (
                    {snapshot.nextUpcomingTrain.departureTime})
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {/* Live Active Feeder Buses */}
            {displayedBuses.map((bus) => {
              const isSelected = selectedBus?.busId === bus.busId;
              return (
                <AdvancedMarker
                  key={bus.busId}
                  position={{ lat: bus.currentLat, lng: bus.currentLng }}
                  zIndex={isSelected ? 950 : 550}
                  onClick={() => {
                    setSelectedBus(bus);
                    setSelectedTrain(null);
                    setSelectedStationInfo(null);
                  }}
                >
                  <div className="flex flex-col items-center cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <span className="absolute -inset-1.5 rounded-full bg-emerald-500/40 animate-ping" />
                      <div
                        className={`w-7 h-7 rounded-full bg-emerald-600 text-white border-2 shadow-md flex items-center justify-center text-xs font-bold transition-transform ${
                          isSelected
                            ? 'border-white ring-4 ring-emerald-500 scale-125'
                            : 'border-white ring-2 ring-emerald-300 group-hover:scale-110'
                        }`}
                      >
                        🚌
                      </div>
                    </div>
                    <div className="mt-0.5 bg-emerald-950 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow border border-emerald-700 whitespace-nowrap">
                      {lang === 'ar' ? `خط ${bus.line}` : `Bus ${bus.line}`}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}
          </GoogleMap>
        </APIProvider>

        {/* Floating Quick Legend & Live User GPS HUD */}
        <div className="absolute top-3 right-3 rtl:right-3 rtl:left-auto ltr:left-auto ltr:right-3 z-10 flex flex-col items-end gap-2 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-md border border-slate-200 text-[10px] space-y-1.5 pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-orange-600 rounded" />
              <span className="font-bold text-slate-800">
                {lang === 'ar' ? 'الخط D (تونس ⇄ القباعة)' : 'Ligne D (Tunis ⇄ Gobâa)'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-emerald-500 rounded" />
              <span className="font-semibold text-emerald-800">
                {isUserBusMode
                  ? lang === 'ar'
                    ? `مسار الحافلة ${busLineLabel} الحي ➔ المحطة`
                    : `Trajet réel Bus ${busLineLabel}`
                  : lang === 'ar'
                  ? busLineLabel === '42'
                    ? 'خط 42 (طبربة ➔ البطان ➔ الجديدة ➔ القباعة)'
                    : 'خط 116 (طبربة ➔ الذنيبة ➔ الجديدة ➔ القباعة)'
                  : busLineLabel === '42'
                  ? 'Ligne 42 (via El Battan ➔ Jedeida ➔ Gobâa)'
                  : 'Ligne 116 (via Ed Dhehiba ➔ Jedeida ➔ Gobâa)'}
              </span>
            </div>
          </div>

          {userCoords && (
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {gobaaDistLabel && (
                <div className="bg-slate-900/90 text-white backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-md border border-emerald-500/50 text-[10px] font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    {busDirection === 'tebourba_to_gobaa'
                      ? lang === 'ar'
                        ? `القباعة: ${displayedBusMetrics?.distanceLabel ?? gobaaDistLabel}`
                        : `Gobâa : ${displayedBusMetrics?.distanceLabel ?? gobaaDistLabel}`
                      : lang === 'ar'
                      ? `طبربة: ${displayedBusMetrics?.distanceLabel ?? gobaaDistLabel}`
                      : `Tébourba : ${displayedBusMetrics?.distanceLabel ?? gobaaDistLabel}`}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => triggerFlyTo(userCoords.lat, userCoords.lng, 14)}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-2.5 py-1.5 rounded-xl shadow-md text-[10px] font-bold flex items-center gap-1 transition-all"
              >
                <Navigation className="w-3 h-3" />
                <span>
                  {isUserBusMode
                    ? t.myBusLocationLabel
                    : lang === 'ar'
                    ? 'موقعي'
                    : lang === 'fr'
                    ? 'Ma position'
                    : 'My location'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* User-As-Bus Live On-Board Route Floating HUD */}
        {isUserBusMode && !selectedTrain && !selectedBus && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-6 sm:right-6 z-20 bg-slate-950/95 text-white backdrop-blur-md rounded-2xl p-3.5 sm:p-4 shadow-2xl border border-emerald-500/50 space-y-2.5">
            {!userCoords ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white">
                      {t.myBusLocationLabel} · {t.detectingLocation}
                    </h4>
                    <p className="text-[11px] text-emerald-200/80">{t.userAsBusActiveBadge}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!isWatchingGps && (
                    <button
                      type="button"
                      onClick={() => onStartGpsWatch?.()}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs"
                    >
                      {t.startGpsTracking}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleToggleUserBusMode}
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold"
                    aria-label="Close bus mode"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-base shadow-sm shrink-0">
                      🚌
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-black text-white">
                          {busDirection === 'tebourba_to_gobaa'
                            ? t.busRouteToGobaa
                            : t.busRouteToTebourba}
                        </h4>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
                          {t.busLine} {busLineLabel}
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-200/85 mt-0.5">
                        {t.userAsBusActiveBadge}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleUserBusMode}
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold shrink-0"
                    aria-label="Close bus mode"
                  >
                    ✕
                  </button>
                </div>

                {displayedBusMetrics && (
                  <>
                    {displayedBusMetrics.arrived && (
                      <div className="bg-emerald-500 text-slate-950 rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs font-black">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          {busDirection === 'tebourba_to_gobaa'
                            ? t.arrivedAtStationMsg
                            : t.arrivedAtTebourbaMsg}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                        <span className="text-[9px] text-emerald-200/80 block">
                          {displayedBusMetrics.isRoadRoute
                            ? t.roadDistanceRemaining
                            : t.remainingDistanceToStation}
                        </span>
                        <span className="text-sm font-black text-white font-mono">
                          {displayedBusMetrics.distanceLabel}
                        </span>
                      </div>

                      <div className="bg-emerald-500/20 rounded-xl p-2 border border-emerald-400/35">
                        <span className="text-[9px] text-emerald-200 block">
                          {displayedBusMetrics.isRoadRoute
                            ? t.roadEtaRemaining
                            : t.remainingTimeToStation}
                        </span>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-sm font-black text-emerald-300">
                            {displayedBusMetrics.etaLabel}
                          </span>
                          <span className="text-[10px] font-mono text-amber-300" dir="ltr">
                            ({displayedBusMetrics.expectedClock})
                          </span>
                        </div>
                      </div>

                      <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                        <span className="text-[9px] text-emerald-200/80 block">
                          {t.currentSpeedLabel}
                        </span>
                        <span className="text-sm font-black text-white font-mono" dir="ltr">
                          {displayedBusMetrics.speedKmh} km/h
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center bg-white/10 p-0.5 rounded-lg border border-white/15">
                          {(['42', '116'] as const).map((ln) => (
                            <button
                              key={ln}
                              type="button"
                              onClick={() => handleSwitchBusLine(ln)}
                              className={`px-2 py-0.5 rounded text-[10px] font-black transition-colors ${
                                busLineLabel === ln
                                  ? 'bg-emerald-400 text-slate-950'
                                  : 'text-emerald-200 hover:text-white'
                              }`}
                            >
                              {ln}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleSwitchBusDestination}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold border border-white/15"
                        >
                          <ArrowLeftRight className="w-3 h-3 text-emerald-300" />
                          <span>{t.switchBusDestination}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => triggerFlyTo(userCoords.lat, userCoords.lng, 14)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>{lang === 'ar' ? 'تركيز' : 'Center'}</span>
                        </button>
                      </div>

                      {typeof destStation.lat === 'number' &&
                        typeof destStation.lng === 'number' &&
                        (() => {
                          const ahead = getAheadBusIntermediates(
                            userCoords.lat,
                            userCoords.lng,
                            BUS_ROUTE_WAYPOINTS[busLineLabel],
                            busDirection
                          );
                          const waypointsParam =
                            ahead.length > 0
                              ? `&waypoints=${encodeURIComponent(
                                  ahead.map((p) => `${p.lat},${p.lng}`).join('|')
                                )}`
                              : '';
                          return (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${destStation.lat},${destStation.lng}${waypointsParam}&travelmode=driving`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 text-[11px] font-semibold"
                            >
                              <span>{t.openInGoogleMaps}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          );
                        })()}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Selected Train Detailed Floating HUD */}
        {selectedTrain && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-6 sm:right-6 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 shadow-xl border border-orange-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  🚆
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900">
                      {lang === 'ar'
                        ? `قطار رقم ${selectedTrain.trainNumber}`
                        : `Train n° ${selectedTrain.trainNumber}`}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                      {selectedTrain.direction === 'outbound'
                        ? '➔ تونس (برشلونة)'
                        : '➔ القباعة المدينة'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-orange-700 mt-0.5">
                    {lang === 'ar' ? selectedTrain.statusLabelAr : selectedTrain.statusLabelFr}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {selectedTrain.estimatedSpeedKmh > 0 && (
                  <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                    <Gauge className="w-3.5 h-3.5 text-slate-500" />
                    <span>~{selectedTrain.estimatedSpeedKmh} كم/س</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedTrain(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold"
                  aria-label="Close details"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                <span>
                  {lang === 'ar'
                    ? selectedTrain.originStation.nameAr
                    : selectedTrain.originStation.nameFr}{' '}
                  ({selectedTrain.departureTime})
                </span>
                <span>
                  {lang === 'ar'
                    ? selectedTrain.destinationStation.nameAr
                    : selectedTrain.destinationStation.nameFr}{' '}
                  ({selectedTrain.arrivalTime})
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round(selectedTrain.totalTripProgress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Selected Bus Detailed Floating HUD */}
        {selectedBus && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-6 sm:right-6 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 shadow-xl border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  🚌
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900">
                      {lang === 'ar'
                        ? `حافلة ترابط الخط ${selectedBus.line}`
                        : `Bus Ligne ${selectedBus.line}`}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {selectedBus.direction === 'tebourba_to_gobaa' ? '➔ محطة القباعة' : '➔ طبربة'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-emerald-800 mt-0.5">
                    {lang === 'ar' ? selectedBus.statusLabelAr : selectedBus.statusLabelFr}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBus(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold"
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.round(selectedBus.progress * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Interactive Time Slider & Motion Scrubber */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-600" />
              <span>{t.timeSimulationSlider}</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              04:30 ➔ 22:30
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsPlaying(!isPlaying);
                if (isLiveMode) setIsLiveMode(false);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors shadow-xs ${
                isPlaying
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? t.pauseSimulation : t.playSimulation}</span>
            </button>

            <span
              className="text-base font-black text-orange-700 font-mono tabular-nums px-2.5 py-1 rounded-xl bg-orange-50 border border-orange-200"
              dir="ltr"
            >
              {formattedScrubbedTime}
            </span>
          </div>
        </div>

        <div className="relative pt-1">
          <input
            type="range"
            min={270}
            max={1350}
            step={1}
            value={effectiveMinutes}
            onChange={(e) => {
              setIsLiveMode(false);
              setIsPlaying(false);
              setScrubbedMinutes(Number(e.target.value));
            }}
            className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-semibold mt-1">
            <span>04:30 (أول قطار)</span>
            <span>07:30 (ذروة الصباح)</span>
            <span>13:00 (منتصف النهار)</span>
            <span>17:30 (ذروة المساء)</span>
            <span>22:30 (آخر قطار)</span>
          </div>
        </div>

        {snapshot.activeTrains.length > 0 && (
          <div className="pt-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap shrink-0">
              {t.centerOnTrain}:
            </span>
            {snapshot.activeTrains.map((train) => (
              <button
                key={train.trainNumber}
                type="button"
                onClick={() => {
                  setSelectedTrain(train);
                  setSelectedBus(null);
                  triggerFlyTo(train.currentLat, train.currentLng, 14);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  selectedTrain?.trainNumber === train.trainNumber
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>🚆 قطار {train.trainNumber}</span>
                <span className="text-[10px] opacity-80">
                  ({train.direction === 'outbound' ? '⬅ تونس' : 'القباعة ➔'})
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
