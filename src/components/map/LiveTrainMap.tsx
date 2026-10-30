import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LINES, Station, TEBOURBA_BUS_STATION, TUNIS_CENTRAL_ID, formatMinutesToTime, parseTimeToMinutes, findStationById } from '../../data/rfrData';
import { TRANSLATIONS, Language } from '../../data/translations';
import { getLiveTransitPositions, LiveTrainPosition, LiveBusPosition, LiveTransitSnapshot } from '../../services/liveTrainTracker';
import { announceTripStationVoice } from '../../utils/sound';
import {
  Play,
  Pause,
  RotateCcw,
  Navigation,
  Train,
  Bus,
  Clock,
  Gauge,
  ArrowRight,
  ArrowLeft,
  Volume2,
  MapPin,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';

interface LiveTrainMapProps {
  lang: Language;
  currentTunisiaMinutes: number;
  currentDayOfWeek: number;
  isHoliday?: boolean;
  onSelectStation?: (lineId: string, stationId: string, role: 'from' | 'to') => void;
  userCoords?: { lat: number; lng: number } | null;
  focusedTrainNumber?: string | null;
}

export const LiveTrainMap: React.FC<LiveTrainMapProps> = ({
  lang,
  currentTunisiaMinutes,
  currentDayOfWeek,
  isHoliday = false,
  onSelectStation,
  userCoords,
  focusedTrainNumber
}) => {
  const t = TRANSLATIONS[lang];

  // Map DOM container ref
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const trainMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const busMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Time controller state
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [scrubbedMinutes, setScrubbedMinutes] = useState<number>(currentTunisiaMinutes);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedTrain, setSelectedTrain] = useState<LiveTrainPosition | null>(null);
  const [selectedBus, setSelectedBus] = useState<LiveBusPosition | null>(null);

  // Effective time evaluated for live positions
  const effectiveMinutes = isLiveMode ? currentTunisiaMinutes : scrubbedMinutes;

  // Sync live mode with prop updates
  useEffect(() => {
    if (isLiveMode) {
      setScrubbedMinutes(currentTunisiaMinutes);
    }
  }, [currentTunisiaMinutes, isLiveMode]);

  // Compute live transit snapshot
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
        // Loop within operational hours (04:30 to 22:30 = 270 to 1350)
        return next > 1350 ? 270 : next;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // If focusedTrainNumber is provided from outside, select it
  useEffect(() => {
    if (focusedTrainNumber) {
      const target = snapshot.activeTrains.find((t) => t.trainNumber === focusedTrainNumber);
      if (target) {
        setSelectedTrain(target);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([target.currentLat, target.currentLng], 14, { duration: 1 });
        }
      }
    }
  }, [focusedTrainNumber, snapshot.activeTrains]);

  // Station coordinates for railway polyline
  const lineDStations = LINES.D.stations;
  const lineDPolylineCoords: [number, number][] = useMemo(() => {
    return lineDStations
      .filter((s): s is Station & { lat: number; lng: number } => typeof s.lat === 'number' && typeof s.lng === 'number')
      .map((s) => [s.lat, s.lng]);
  }, [lineDStations]);

  // Feeder bus RN7 polyline coords (Gobaa -> Tebourba)
  const busPolylineCoords: [number, number][] = useMemo(() => {
    const gobaa = findStationById('gobaa');
    const tebourba = TEBOURBA_BUS_STATION;
    if (gobaa?.lat && gobaa?.lng && tebourba.lat && tebourba.lng) {
      // Intermediate route checkpoints via Route Nationale 7 (RN7)
      return [
        [gobaa.lat, gobaa.lng],
        [36.8285, 10.0050], // RN7 interchange near Jedaida
        [36.8320, 9.9210],  // RN7 midpoint
        [tebourba.lat, tebourba.lng]
      ];
    }
    return [];
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Line D corridor (between Tunis and Gobaa)
    const initialCenter: [number, number] = [36.808, 10.120];
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 12,
      minZoom: 10,
      maxZoom: 17,
      zoomControl: true,
      attributionControl: false
    });

    // Tile Layer: CartoDB Positron (High-contrast, elegant transit map, ultra-clean)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    // Feeder Bus Track (dashed emerald)
    if (busPolylineCoords.length > 0) {
      L.polyline(busPolylineCoords, {
        color: '#059669',
        weight: 3.5,
        dashArray: '6, 8',
        opacity: 0.8
      }).addTo(map);
    }

    // Line D Railway Casing (dark border for track realism)
    L.polyline(lineDPolylineCoords, {
      color: '#9a3412',
      weight: 6,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Line D Railway Main Track (vibrant orange with railroad style)
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

      const tebourbaMarker = L.marker([TEBOURBA_BUS_STATION.lat, TEBOURBA_BUS_STATION.lng], { icon: busHubIcon }).addTo(map);
      tebourbaMarker.on('click', () => {
        if (onSelectStation) {
          onSelectStation('D', 'tebourba_bus', 'from');
        }
      });
    }

    // Dynamic layer groups for real-time trains & buses
    trainMarkersLayerRef.current = L.layerGroup().addTo(map);
    busMarkersLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update User GPS Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (userCoords && typeof userCoords.lat === 'number' && typeof userCoords.lng === 'number') {
      if (!userMarkerRef.current) {
        const userIcon = L.divIcon({
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

        userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(mapInstanceRef.current);
      } else {
        userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [userCoords]);

  // Update Live Train Markers on the Map
  useEffect(() => {
    if (!mapInstanceRef.current || !trainMarkersLayerRef.current) return;

    trainMarkersLayerRef.current.clearLayers();

    // Render each active train
    snapshot.activeTrains.forEach((train) => {
      const isSelected = selectedTrain?.trainNumber === train.trainNumber;
      const directionArrow = train.direction === 'outbound' ? (lang === 'ar' ? '⬅ تونس' : 'Tunis ➔') : (lang === 'ar' ? 'القباعة ➔' : 'Gobâa ➔');

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

    // If no trains are in transit, show the next upcoming train at its departure station
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

  // Update Live Feeder Bus Markers on the Map
  useEffect(() => {
    if (!mapInstanceRef.current || !busMarkersLayerRef.current) return;

    busMarkersLayerRef.current.clearLayers();

    snapshot.activeBuses.forEach((bus) => {
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
              خط ${bus.line}
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
  }, [snapshot.activeBuses, selectedBus, lang]);

  // Time format helper for slider (from minutes 270..1350 to HH:MM)
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
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black">{t.liveTrainMap}</h3>
                {isLiveMode && (
                  <span className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    {t.live}
                  </span>
                )}
              </div>
              <p className="text-xs text-orange-100">
                {lang === 'ar'
                  ? 'مواقع القطارات وحافلات الترابط الحية محسوبة ومحاكاة بدقة حسب جدول المواعيد الرسمي'
                  : 'Positions réelles et simulées des trains et bus de rabattement selon la grille officielle'}
              </p>
            </div>
          </div>

          {/* Live vs Simulation Reset Button */}
          <div className="flex items-center gap-2">
            {!isLiveMode && (
              <button
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

            <div className="px-3 py-1.5 rounded-xl bg-black/25 backdrop-blur-sm border border-white/15 text-white font-mono font-bold text-xs flex items-center gap-1.5" dir="ltr">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>{formattedScrubbedTime}</span>
            </div>
          </div>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          <div className="bg-white/15 backdrop-blur-sm px-3 py-1 rounded-xl flex items-center gap-1.5 font-bold">
            <Train className="w-3.5 h-3.5 text-amber-300" />
            <span>
              {snapshot.activeTrains.length > 0
                ? `${snapshot.activeTrains.length} ${t.trainsInTransit}`
                : t.noTrainsInTransit}
            </span>
          </div>

          {snapshot.activeBuses.length > 0 && (
            <div className="bg-emerald-500/30 backdrop-blur-sm px-3 py-1 rounded-xl flex items-center gap-1.5 font-bold text-emerald-100 border border-emerald-400/30">
              <Bus className="w-3.5 h-3.5 text-emerald-300" />
              <span>{snapshot.activeBuses.length} {t.busesInTransit}</span>
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

        {/* Floating Quick Legend in Map Corner */}
        <div className="absolute top-3 right-3 rtl:right-3 rtl:left-auto ltr:left-auto ltr:right-3 z-10 bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-md border border-slate-200 text-[10px] space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-orange-600 rounded"></span>
            <span className="font-bold text-slate-800">الخط D (تونس ⇄ القباعة)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-emerald-600"></span>
            <span className="font-semibold text-emerald-800">حافلات طبربة (42 و 116)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>🚆</span>
            <span>انقر على أي قطار لمعرفة سرعته ومحطاته</span>
          </div>
        </div>

        {/* Selected Train / Bus Detailed Floating HUD */}
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
                      {lang === 'ar' ? `قطار رقم ${selectedTrain.trainNumber}` : `Train n° ${selectedTrain.trainNumber}`}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                      {selectedTrain.direction === 'outbound' ? '➔ تونس (برشلونة)' : '➔ القباعة المدينة'}
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
                  onClick={() => setSelectedTrain(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold"
                  aria-label="Close details"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Journey Segment Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                <span>{lang === 'ar' ? selectedTrain.originStation.nameAr : selectedTrain.originStation.nameFr} ({selectedTrain.departureTime})</span>
                <span>{lang === 'ar' ? selectedTrain.destinationStation.nameAr : selectedTrain.destinationStation.nameFr} ({selectedTrain.arrivalTime})</span>
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
                      {lang === 'ar' ? `حافلة ترابط الخط ${selectedBus.line}` : `Bus Ligne ${selectedBus.line}`}
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
            {/* Play / Pause Animation Button */}
            <button
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

            {/* Time Display Badge */}
            <span className="text-base font-black text-orange-700 font-mono tabular-nums px-2.5 py-1 rounded-xl bg-orange-50 border border-orange-200" dir="ltr">
              {formattedScrubbedTime}
            </span>
          </div>
        </div>

        {/* Time Scrubber Slider */}
        <div className="relative pt-1">
          <input
            type="range"
            min={270} // 04:30
            max={1350} // 22:30
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

        {/* Quick Active Trains Chips for this time */}
        {snapshot.activeTrains.length > 0 && (
          <div className="pt-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap shrink-0">
              {t.centerOnTrain}:
            </span>
            {snapshot.activeTrains.map((train) => (
              <button
                key={train.trainNumber}
                onClick={() => {
                  setSelectedTrain(train);
                  setSelectedBus(null);
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([train.currentLat, train.currentLng], 14, { duration: 0.8 });
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
