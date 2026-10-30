import React, { useState } from 'react';
import { LINES, Station, TEBOURBA_BUS_STATION, TUNIS_CENTRAL_ID } from '../data/rfrData';
import { TRANSLATIONS, Language } from '../data/translations';
import { calculateStationProximities, StationProximity, WALKING_SPEED_KMH, DRIVING_SPEED_KMH } from '../utils/geo';
import { LiveTrainMap } from './map/LiveTrainMap';
import {
  Navigation,
  Loader2,
  Footprints,
  Car,
  ExternalLink,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Gauge,
  Map as MapIcon,
  GitCommit
} from 'lucide-react';

interface NetworkMapProps {
  lang: Language;
  onSelectStation: (lineId: string, stationId: string, role: 'from' | 'to') => void;
  selectedStationId?: string;
  currentTunisiaMinutes?: number;
  currentDayOfWeek?: number;
  isHoliday?: boolean;
  isSimulated?: boolean;
  focusedTrainNumber?: string | null;
}

export const NetworkMap: React.FC<NetworkMapProps> = ({
  lang,
  onSelectStation,
  selectedStationId,
  currentTunisiaMinutes = 480, // 08:00 default fallback
  currentDayOfWeek = 1,
  isHoliday = false,
  focusedTrainNumber
}) => {
  const t = TRANSLATIONS[lang];

  // Map view toggle: 'live_map' (geospatial with animated trains) vs 'schematic' (clean line diagram)
  const [viewMode, setViewMode] = useState<'live_map' | 'schematic'>('live_map');

  // Geolocation state
  const [isLocating, setIsLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // All network stations with coordinates
  const allStations: Station[] = [...LINES.D.stations, TEBOURBA_BUS_STATION];

  // Proximities sorted by distance if coordinates available
  const proximities: StationProximity[] = userCoords
    ? calculateStationProximities(userCoords.lat, userCoords.lng, allStations, lang)
    : [];

  const nearestStation = proximities.length > 0 ? proximities[0] : null;

  const handleLocateMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError(t.locationPermissionError);
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
      },
      (err) => {
        setIsLocating(false);
        setGeoError(t.locationPermissionError);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* View Mode Switcher Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setViewMode('live_map')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'live_map'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>{t.liveTrainMap}</span>
          </button>

          <button
            onClick={() => setViewMode('schematic')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'schematic'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitCommit className="w-4 h-4" />
            <span>{t.schematicMap}</span>
          </button>
        </div>

        {/* Locate Me Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-200 active:scale-95 text-orange-800 font-bold text-xs shadow-xs transition-all disabled:opacity-50"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
          ) : (
            <Navigation className="w-4 h-4 text-orange-600" />
          )}
          <span>{isLocating ? t.detectingLocation : t.locateNearestStation}</span>
        </button>
      </div>

      {/* Main View Content: Live Train Map or Schematic Diagram */}
      {viewMode === 'live_map' ? (
        <LiveTrainMap
          lang={lang}
          currentTunisiaMinutes={currentTunisiaMinutes}
          currentDayOfWeek={currentDayOfWeek}
          isHoliday={isHoliday}
          onSelectStation={onSelectStation}
          userCoords={userCoords}
          focusedTrainNumber={focusedTrainNumber}
        />
      ) : (
        /* Schematic Diagram View */
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">{t.networkMapTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'ar'
                ? 'انقر على أي محطة لتعيينها كمحطة انطلاق في المخطط'
                : 'Cliquez sur une station pour la sélectionner comme départ'}
            </p>
          </div>

          <div className="relative overflow-x-auto py-2">
            <div className="min-w-[680px] p-2 flex flex-col gap-6">
              {/* Feeder Bus RN7 */}
              <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">🚌</span>
                    {lang === 'ar'
                      ? 'خط ترابط الحافلات (42 و 116): طبربة ⇄ محطة قطار القباعة فقط'
                      : 'Bus de rabattement (42 & 116) : Tébourba ⇄ Gare RFR Gobâa uniquement'}
                  </span>
                  <span className="text-[11px] text-emerald-700/80 font-medium">~40 min · الطريق الوطنية 7</span>
                </div>

                <div className="flex items-center justify-between px-6 py-2 bg-white rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onSelectStation('D', 'tebourba_bus', 'from')}
                      className="w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-200"
                      title="Tébourba"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {lang === 'ar' ? TEBOURBA_BUS_STATION.nameAr : TEBOURBA_BUS_STATION.nameFr}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">حافلة 42 و 116</span>
                    </div>
                  </div>

                  <div className="flex-1 mx-6 border-t-2 border-dashed border-emerald-400 relative">
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[10px] font-bold text-emerald-700">
                      ترابط حصري ⇄
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right rtl:text-right ltr:text-left">
                      <span className="text-xs font-bold text-slate-900 block">
                        {lang === 'ar' ? 'محطة قطار القباعة (RFR)' : 'Gare RFR Gobâa'}
                      </span>
                      <span className="text-[10px] text-orange-600 font-semibold">نقطة الالتقاء والتبديل</span>
                    </div>
                    <button
                      onClick={() => onSelectStation('D', 'gobaa', 'from')}
                      className="w-4 h-4 rounded-full bg-orange-600 ring-4 ring-orange-200"
                      title="Gobaa"
                    />
                  </div>
                </div>
              </div>

              {/* Line D (Orange) */}
              <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-orange-700">
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px]">D</span>
                    {lang === 'ar' ? 'الخط D : القباعة المدينة ⇄ تونس (ساحة برشلونة)' : 'Ligne D : Gobaa Ville ⇄ Tunis Barcelone'}
                  </span>
                  <span className="text-[11px] text-orange-600/80 font-medium">10 Stations · 26-30 min</span>
                </div>
                <div className="relative flex items-center justify-between pt-4 pb-2">
                  <div className="absolute top-6 left-4 right-4 h-1.5 bg-orange-400 -translate-y-1/2 rounded-full z-0" />
                  {LINES.D.stations.map((st, i) => {
                    const isSelected = selectedStationId === st.id;
                    const isTerminal = i === 0 || i === LINES.D.stations.length - 1;

                    return (
                      <div key={st.id} className="relative z-10 flex flex-col items-center group">
                        <button
                          onClick={() => onSelectStation('D', st.id, 'from')}
                          className={`w-4 h-4 rounded-full border-2 transition-transform duration-200 group-hover:scale-125 ${
                            isSelected
                              ? 'bg-orange-600 border-white ring-4 ring-orange-400 scale-110'
                              : isTerminal
                              ? 'bg-white border-orange-600 ring-2 ring-orange-200'
                              : 'bg-white border-orange-400'
                          }`}
                          title={st.nameFr}
                        />
                        <span className="text-[10px] text-slate-700 font-medium mt-2 max-w-[62px] text-center leading-tight whitespace-normal">
                          {lang === 'ar' ? st.nameAr : st.nameFr}
                        </span>
                        {st.connections && st.connections.length > 0 && (
                          <span className="text-[8px] text-orange-600 font-bold bg-orange-100 px-1 rounded mt-0.5">
                            {st.connections[0]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Central Interchange Card - Tunis Barcelona */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-black border border-white/20">
                    🚆
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{t.hubBarcelona}</h3>
                    <p className="text-xs text-slate-300">
                      {lang === 'ar'
                        ? 'محطة تونس المركزية: ربط مباشر مع مترو تونس (الخطوط 1 إلى 6) وقطارات SNCFT والحافلات'
                        : 'Pôle central d\'échange : Métro Léger 1 à 6, SNCFT et bus'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'TGM'].map((m) => (
                    <span key={m} className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/15 text-white">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Geolocation Proximity Panel (Shared across both modes) */}
      {userCoords && nearestStation && (
        <div className="bg-gradient-to-br from-orange-50 via-white to-amber-50 border border-orange-200 rounded-3xl p-4 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                <Navigation className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider block">
                  {t.nearestStationToYou}
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {lang === 'ar' ? nearestStation.station.nameAr : nearestStation.station.nameFr}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onSelectStation('D', nearestStation.station.id, 'from')}
                className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-colors shadow-xs"
              >
                {t.setAsOrigin}
              </button>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${nearestStation.station.lat},${nearestStation.station.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1"
              >
                <span>{t.viewOnMap}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Speed & Distance Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="bg-white/80 border border-orange-100 rounded-2xl p-3 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                📍
              </span>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block">{t.distanceLabel}</span>
                <span className="text-sm font-black text-slate-900">{nearestStation.formattedDistance}</span>
              </div>
            </div>

            <div className="bg-white/80 border border-orange-100 rounded-2xl p-3 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                <Footprints className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block">
                  {t.walkEstimate} (~{WALKING_SPEED_KMH} كم/س)
                </span>
                <span className="text-sm font-black text-emerald-800">{nearestStation.formattedWalk}</span>
              </div>
            </div>

            <div className="bg-white/80 border border-orange-100 rounded-2xl p-3 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                <Car className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block">
                  {t.driveEstimate} (~{DRIVING_SPEED_KMH} كم/س)
                </span>
                <span className="text-sm font-black text-blue-800">{nearestStation.formattedDrive}</span>
              </div>
            </div>
          </div>

          {/* Stations by Distance Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">{t.yourLocation}</span>
              <span className="text-[10px] text-slate-500">{t.speedFormulaNote}</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto rounded-2xl bg-white border border-slate-200">
              {proximities.map((item, idx) => {
                const isClosest = idx === 0;
                return (
                  <div
                    key={item.station.id}
                    className={`p-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors ${
                      isClosest ? 'bg-orange-50/40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isClosest ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {lang === 'ar' ? item.station.nameAr : item.station.nameFr}
                          </span>
                          {isClosest && (
                            <span className="bg-orange-100 text-orange-800 text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                              ⭐ {t.nearestStationToYou}
                            </span>
                          )}
                          {item.station.id === 'tebourba_bus' && (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                              🚌 حافلة 42/116
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="font-semibold text-orange-700">{item.formattedDistance}</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Footprints className="w-2.5 h-2.5 text-slate-400" />
                            {item.formattedWalk}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Car className="w-2.5 h-2.5 text-slate-400" />
                            {item.formattedDrive}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onSelectStation('D', item.station.id, 'from')}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-700 font-bold text-[11px] transition-colors"
                      >
                        {t.setAsOrigin}
                      </button>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${item.station.lat},${item.station.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                        title={t.viewOnMap}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Geolocation Error Alert */}
      {geoError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 flex items-center gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{geoError}</span>
        </div>
      )}
    </div>
  );
};
