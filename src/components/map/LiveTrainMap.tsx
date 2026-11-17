import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
  ArrowLeftRight,
  Radio,
  Loader2,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface LiveTrainMapProps {
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
}

export const LiveTrainMap: React.FC<LiveTrainMapProps> = ({
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
  onStartGpsWatch
}) => {
  const t = TRANSLATIONS[lang];

  // Map DOM container & layer refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const trainMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const busMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const busCorridorLayerRef = useRef<L.LayerGroup | null>(null);
  const liveBusRouteLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Time controller state
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [scrubbedMinutes, setScrubbedMinutes] = useState<number>(currentTunisiaMinutes);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedTrain, setSelectedTrain] = useState<LiveTrainPosition | null>(null);
  const [selectedBus, setSelectedBus] = useState<LiveBusPosition | null>(null);

  // Local fallback state for User-As-Bus mode (synced with activeBusRide)
  const [localBusMode, setLocalBusMode] = useState<boolean>(Boolean(activeBusRide?.isUserOnBoard));
  const [localBusDirection, setLocalBusDirection] = useState<'tebourba_to_gobaa' | 'gobaa_to_tebourba'>(
    activeBusRide?.direction ?? 'tebourba_to_gobaa'
  );
  const [localBusLine, setLocalBusLine] = useState<'42' | '116'>(activeBusRide?.line ?? '42');

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

  // Effective time evaluated for live positions
  const effectiveMinutes = isLiveMode ? currentTunisiaMinutes : scrubbedMinutes;

  useEffect(() => {
    if (isLiveMode) {
      setScrubbedMinutes(currentTunisiaMinutes);
    }
  }, [currentTunisiaMinutes, isLiveMode]);

  const snapshot: LiveTransitSnapshot = useMemo(() => {
    return getLiveTransitPositions(effectiveMinutes, currentDayOfWeek, isHoliday);
  }, [effectiveMinutes, currentDayOfWeek, isHoliday]);

  // Animation player loop (1 minute every 250ms when playing)
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
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([target.currentLat, target.currentLng], 14, { duration: 1 });
        }
      }
    }
  }, [focusedTrainNumber, snapshot.activeTrains]);

  // Stations for User-As-Bus routing
  const gobaaStation = useMemo(() => findStationById('gobaa') || TEBOURBA_BUS_STATION, []);
  const originStation = busDirection === 'tebourba_to_gobaa' ? TEBOURBA_BUS_STATION : gobaaStation;
  const destStation = busDirection === 'tebourba_to_gobaa' ? gobaaStation : TEBOURBA_BUS_STATION;

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

  const expectedArrivalClock = useMemo(() => {
    if (!gpsProgress) return formatMinutesToTime(currentTunisiaMinutes);
    return formatMinutesToTime((currentTunisiaMinutes + gpsProgress.etaMinutes) % 1440);
  }, [gpsProgress, currentTunisiaMinutes]);

  const handleToggleUserBusMode = useCallback(() => {
    if (!isUserBusMode) {
      setSelectedTrain(null);
      setSelectedBus(null);
      setLocalBusMode(true);
      onStartGpsWatch?.();
      onUpdateBusRide?.({
        busId: activeBusRide?.busId ?? 'user-live-bus',
        line: busLineLabel,
        direction: busDirection,
        departureTime: activeBusRide?.departureTime ?? formatMinutesToTime(currentTunisiaMinutes),
        isUserOnBoard: true
      });
      if (userCoords && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([userCoords.lat, userCoords.lng], 13, { duration: 0.8 });
      }
    } else {
      setLocalBusMode(false);
      onUpdateBusRide?.(null);
    }
  }, [
    isUserBusMode,
    activeBusRide,
    busLineLabel,
    busDirection,
    currentTunisiaMinutes,
    userCoords,
    onStartGpsWatch,
    onUpdateBusRide
  ]);

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

  // Station coordinates for railway polyline
  const lineDStations = LINES.D.stations;
  const lineDPolylineCoords: [number, number][] = useMemo(() => {
    return lineDStations
      .filter(
        (s): s is Station & { lat: number; lng: number } =>
          typeof s.lat === 'number' && typeof s.lng === 'number'
      )
      .map((s) => [s.lat, s.lng]);
  }, [lineDStations]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = [36.808, 10.12];
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 12,
      minZoom: 10,
      maxZoom: 17,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    busCorridorLayerRef.current = L.layerGroup().addTo(map);

    L.polyline(lineDPolylineCoords, {
      color: '#9a3412',
      weight: 6,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    L.polyline(lineDPolylineCoords, {
      color: '#ea580c',
      weight: 4,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Station Markers
    lineDStations.forEach((station, index) => {
      if (typeof station.lat !== 'number' || typeof station.lng !== 'number') return;

      const isTerminal = index === 0 || index === lineDStations.length - 1;
      const isHub = station.id === TUNIS_CENTRAL_ID || station.id === 'gobaa';

      const stationIcon = L.divIcon({
        className: 'custom-station-icon',
        html: `
          <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -50%);">
            <div class="w-4 h-4 rounded-full border-2 ${
              isTerminal
                ? 'bg-white border-orange-600 ring-4 ring-orange-200'
                : isHub
                ? 'bg-orange-500 border-white ring-2 ring-orange-400'
                : 'bg-white border-orange-500'
            } shadow-md flex items-center justify-center transition-transform hover:scale-125">
              ${isTerminal ? '<div class="w-1.5 h-1.5 bg-orange-600 rounded-full"></div>' : ''}
            </div>
            <div class="absolute -bottom-5 bg-slate-900/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none">
              ${lang === 'ar' ? station.nameAr : station.nameFr}
            </div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([station.lat, station.lng], { icon: stationIcon }).addTo(map);

      marker.on('click', () => {
        if (onSelectStation) {
          onSelectStation('D', station.id, 'from');
        }
      });
    });

    // Tebourba Bus Hub Marker
    if (TEBOURBA_BUS_STATION.lat && TEBOURBA_BUS_STATION.lng) {
      const busHubIcon = L.divIcon({
        className: 'custom-tebourba-icon',
        html: `
          <div class="relative flex flex-col items-center cursor-pointer" style="transform: translate(-50%, -50%);">
            <div class="w-5 h-5 rounded-full bg-emerald-600 text-white border-2 border-white ring-4 ring-emerald-200 shadow-md flex items-center justify-center text-[10px] font-bold">
              🚌
            </div>
            <div class="absolute -bottom-5 bg-emerald-950/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none">
              ${lang === 'ar' ? 'طبربة' : 'Tébourba'}
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const tebourbaMarker = L.marker([TEBOURBA_BUS_STATION.lat, TEBOURBA_BUS_STATION.lng], {
        icon: busHubIcon
      }).addTo(map);
      tebourbaMarker.on('click', () => {
        if (onSelectStation) {
          onSelectStation('D', 'tebourba_bus', 'from');
        }
      });
    }

    liveBusRouteLayerRef.current = L.layerGroup().addTo(map);
    trainMarkersLayerRef.current = L.layerGroup().addTo(map);
    busMarkersLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update User GPS Marker (as blue dot normally, or animated Bus Marker in isUserBusMode)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (userCoords && typeof userCoords.lat === 'number' && typeof userCoords.lng === 'number') {
      const icon = isUserBusMode
        ? L.divIcon({
            className: 'custom-user-bus-icon',
            html: `
              <div class="relative flex flex-col items-center cursor-pointer" style="transform: translate(-50%, -50%);">
                <div class="relative flex items-center justify-center">
                  <span class="absolute -inset-2.5 rounded-full bg-emerald-500/45 animate-ping"></span>
                  <div class="w-9 h-9 rounded-full bg-emerald-600 text-white border-2 border-white ring-4 ring-emerald-300 shadow-xl flex items-center justify-center text-sm font-black">
                    🚌
                  </div>
                </div>
                <div class="mt-1 bg-emerald-950 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow border border-emerald-400 whitespace-nowrap">
                  ${t.myBusLocationLabel} ${busLineLabel}
                </div>
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          })
        : L.divIcon({
            className: 'custom-user-icon',
            html: `
              <div class="relative flex items-center justify-center" style="transform: translate(-50%, -50%);">
                <span class="absolute w-6 h-6 rounded-full bg-blue-500/30 animate-ping"></span>
                <span class="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-md"></span>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], {
          icon,
          zIndexOffset: 1050
        }).addTo(mapInstanceRef.current);
      } else {
        userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
        userMarkerRef.current.setIcon(icon);
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [userCoords, isUserBusMode, busLineLabel, t.myBusLocationLabel]);

  // Render verified TRANSTU feeder bus corridor polyline & intermediate stops for Line 42 / 116
  useEffect(() => {
    if (!mapInstanceRef.current || !busCorridorLayerRef.current) return;

    busCorridorLayerRef.current.clearLayers();
    const waypoints = BUS_ROUTE_WAYPOINTS[busLineLabel];
    const corridorCoords: [number, number][] = waypoints.map((p) => [p.lat, p.lng]);

    L.polyline(corridorCoords, {
      color: '#059669',
      weight: 4,
      dashArray: '6, 8',
      opacity: isUserBusMode && userCoords ? 0.3 : 0.85,
      lineJoin: 'round'
    }).addTo(busCorridorLayerRef.current);

    waypoints.slice(1, -1).forEach((stop) => {
      const marker = L.circleMarker([stop.lat, stop.lng], {
        radius: 4.5,
        color: '#ffffff',
        weight: 1.5,
        fillColor: '#10b981',
        fillOpacity: 0.95
      });
      marker.bindTooltip(lang === 'ar' ? stop.nameAr : stop.nameFr, {
        direction: 'top',
        offset: [0, -4]
      });
      marker.addTo(busCorridorLayerRef.current!);
    });
  }, [busLineLabel, isUserBusMode, userCoords, lang]);

  // Update Live Bus Route Polyline from User GPS (= Bus) -> Destination Station along verified road stops
  useEffect(() => {
    if (!mapInstanceRef.current || !liveBusRouteLayerRef.current) return;

    liveBusRouteLayerRef.current.clearLayers();

    if (
      isUserBusMode &&
      userCoords &&
      typeof destStation.lat === 'number' &&
      typeof destStation.lng === 'number'
    ) {
      const ahead = getAheadBusIntermediates(
        userCoords.lat,
        userCoords.lng,
        BUS_ROUTE_WAYPOINTS[busLineLabel],
        busDirection
      );
      const coords: [number, number][] = [
        [userCoords.lat, userCoords.lng],
        ...ahead.map((p): [number, number] => [p.lat, p.lng]),
        [destStation.lat, destStation.lng]
      ];
      L.polyline(coords, {
        color: '#064e3b',
        weight: 8,
        opacity: 0.75,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(liveBusRouteLayerRef.current);

      L.polyline(coords, {
        color: '#10b981',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(liveBusRouteLayerRef.current);
    }
  }, [isUserBusMode, userCoords, destStation, busLineLabel, busDirection]);

  // Update Live Train Markers on the Map
  useEffect(() => {
    if (!mapInstanceRef.current || !trainMarkersLayerRef.current) return;

    trainMarkersLayerRef.current.clearLayers();

    snapshot.activeTrains.forEach((train) => {
      const isSelected = selectedTrain?.trainNumber === train.trainNumber;
      const directionArrow =
        train.direction === 'outbound'
          ? lang === 'ar'
            ? '⬅ تونس'
            : 'Tunis ➔'
          : lang === 'ar'
          ? 'القباعة ➔'
          : 'Gobâa ➔';

      const trainIcon = L.divIcon({
        className: 'custom-train-marker',
        html: `
          <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -50%);">
            <div class="relative flex items-center justify-center">
              <span class="absolute -inset-2 rounded-full bg-orange-500/40 animate-ping"></span>
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white border-2 ${
                isSelected ? 'border-white ring-4 ring-orange-500 scale-125' : 'border-white ring-2 ring-orange-300'
              } shadow-lg flex items-center justify-center text-xs font-black transition-all">
                🚆
              </div>
            </div>
            <div class="mt-1 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-slate-700 whitespace-nowrap">
              <span>${train.trainNumber}</span>
              <span class="text-[8px] text-orange-300">${directionArrow}</span>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([train.currentLat, train.currentLng], {
        icon: trainIcon,
        zIndexOffset: isSelected ? 1000 : 500
      });

      marker.on('click', () => {
        setSelectedTrain(train);
        setSelectedBus(null);
      });

      marker.addTo(trainMarkersLayerRef.current!);
    });

    if (snapshot.activeTrains.length === 0 && snapshot.nextUpcomingTrain) {
      const upcoming = snapshot.nextUpcomingTrain;
      const upcomingIcon = L.divIcon({
        className: 'custom-upcoming-train-marker',
        html: `
          <div class="relative flex flex-col items-center cursor-pointer" style="transform: translate(-50%, -50%);">
            <div class="w-7 h-7 rounded-full bg-slate-800 text-white border-2 border-amber-400 shadow-md flex items-center justify-center text-xs">
              🚆
            </div>
            <div class="mt-1 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-md shadow whitespace-nowrap">
              ${upcoming.trainNumber} (${upcoming.departureTime})
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([upcoming.currentLat, upcoming.currentLng], {
        icon: upcomingIcon,
        zIndexOffset: 400
      });

      marker.on('click', () => {
        setSelectedTrain(upcoming);
        setSelectedBus(null);
      });

      marker.addTo(trainMarkersLayerRef.current!);
    }
  }, [snapshot.activeTrains, snapshot.nextUpcomingTrain, selectedTrain, lang]);

  // Suppress duplicate ghost buses going in the same direction when user's live GPS IS the bus
  const displayedBuses = useMemo(() => {
    if (isUserBusMode && userCoords) {
      return snapshot.activeBuses.filter((b) => b.direction !== busDirection);
    }
    return snapshot.activeBuses;
  }, [snapshot.activeBuses, isUserBusMode, userCoords, busDirection]);

  // Update Live Feeder Bus Markers on the Map
  useEffect(() => {
    if (!mapInstanceRef.current || !busMarkersLayerRef.current) return;

    busMarkersLayerRef.current.clearLayers();

    displayedBuses.forEach((bus) => {
      const isSelected = selectedBus?.busId === bus.busId;
      const busIcon = L.divIcon({
        className: 'custom-bus-marker',
        html: `
          <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -50%);">
            <div class="relative flex items-center justify-center">
              <span class="absolute -inset-1.5 rounded-full bg-emerald-500/40 animate-ping"></span>
              <div class="w-7 h-7 rounded-full bg-emerald-600 text-white border-2 ${
                isSelected ? 'border-white ring-4 ring-emerald-500 scale-125' : 'border-white ring-2 ring-emerald-300'
              } shadow-md flex items-center justify-center text-xs font-bold transition-all">
                🚌
              </div>
            </div>
            <div class="mt-0.5 bg-emerald-950 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow border border-emerald-700 whitespace-nowrap">
              ${lang === 'ar' ? `خط ${bus.line}` : `Bus ${bus.line}`}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([bus.currentLat, bus.currentLng], {
        icon: busIcon,
        zIndexOffset: isSelected ? 900 : 450
      });

      marker.on('click', () => {
        setSelectedBus(bus);
        setSelectedTrain(null);
      });

      marker.addTo(busMarkersLayerRef.current!);
    });
  }, [displayedBuses, selectedBus, lang]);

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
                  {t.offlineMapFallbackBadge}
                </span>
                {isLiveMode && (
                  <span className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    {t.live}
                  </span>
                )}
              </div>
              <p className="text-xs text-orange-100">
                {isUserBusMode
                  ? t.userAsBusActiveBadge
                  : lang === 'ar'
                  ? 'مواقع القطارات وحافلات الترابط الحية محسوبة ومحاكاة بدقة حسب جدول المواعيد الرسمي'
                  : 'Positions réelles et simulées des trains et bus de rabattement selon la grille officielle'}
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

        {/* Stats Badges & User-As-Bus Toggle */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
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

          <div className="bg-white/10 px-2.5 py-1 rounded-xl text-[11px] font-medium text-orange-100">
            {t.allStationsCount}
          </div>
        </div>
      </div>

      {/* Main Interactive Leaflet Map Container */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-slate-100">
        <div
          ref={mapContainerRef}
          className="w-full h-[400px] sm:h-[460px] z-0"
          style={{ minHeight: '380px' }}
        />

        {/* Floating Quick Legend & Live User GPS HUD in Map Corner */}
        <div className="absolute top-3 right-3 rtl:right-3 rtl:left-auto ltr:left-auto ltr:right-3 z-10 flex flex-col items-end gap-2">
          <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-md border border-slate-200 text-[10px] space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-orange-600 rounded" />
              <span className="font-bold text-slate-800">الخط D (تونس ⇄ القباعة)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-emerald-500 rounded" />
              <span className="font-semibold text-emerald-800">
                {isUserBusMode
                  ? lang === 'ar'
                    ? `مسار الحافلة ${busLineLabel} الحي ➔ المحطة`
                    : `Trajet Bus ${busLineLabel}`
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

          {userCoords &&
            (() => {
              const distLabel =
                typeof destStation.lat === 'number' && typeof destStation.lng === 'number'
                  ? formatDistance(
                      calculateDistanceKm(userCoords.lat, userCoords.lng, destStation.lat, destStation.lng),
                      lang
                    )
                  : null;
              return (
                <div className="flex items-center gap-1.5">
                  {distLabel && (
                    <div className="bg-slate-900/90 text-white backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-md border border-emerald-500/50 text-[10px] font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>
                        {busDirection === 'tebourba_to_gobaa'
                          ? lang === 'ar'
                            ? `القباعة: ${distLabel}`
                            : `Gobâa : ${distLabel}`
                          : lang === 'ar'
                          ? `طبربة: ${distLabel}`
                          : `Tébourba : ${distLabel}`}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo([userCoords.lat, userCoords.lng], 14, {
                          duration: 0.8
                        });
                      }
                    }}
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
              );
            })()}
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

                {gpsProgress && (
                  <>
                    {gpsProgress.arrived && (
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
                          {t.remainingDistanceToStation}
                        </span>
                        <span className="text-sm font-black text-white font-mono">
                          {gpsProgress.formattedDistanceToDest}
                        </span>
                      </div>

                      <div className="bg-emerald-500/20 rounded-xl p-2 border border-emerald-400/35">
                        <span className="text-[9px] text-emerald-200 block">
                          {t.remainingTimeToStation}
                        </span>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-sm font-black text-emerald-300">
                            {gpsProgress.formattedEta}
                          </span>
                          <span className="text-[10px] font-mono text-amber-300" dir="ltr">
                            ({expectedArrivalClock})
                          </span>
                        </div>
                      </div>

                      <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                        <span className="text-[9px] text-emerald-200/80 block">
                          {t.currentSpeedLabel}
                        </span>
                        <span className="text-sm font-black text-white font-mono" dir="ltr">
                          {gpsProgress.speedKmh} km/h
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
                          onClick={() => {
                            if (mapInstanceRef.current) {
                              mapInstanceRef.current.flyTo([userCoords.lat, userCoords.lng], 14, {
                                duration: 0.8
                              });
                            }
                          }}
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
          <div className="absolute bottom-3 left-3 right-3 sm:left-6 sm:right-6 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 shadow-xl border border-orange-200 space-y-2 animate-fadeIn">
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
          <div className="absolute bottom-3 left-3 right-3 sm:left-6 sm:right-6 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 shadow-xl border border-emerald-200 space-y-2 animate-fadeIn">
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
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([train.currentLat, train.currentLng], 14, {
                      duration: 0.8
                    });
                  }
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
