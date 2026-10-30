import React, { useState } from 'react';
import { LINES, TUNIS_CENTRAL_ID, Station, TEBOURBA_BUS_STATION } from '../../data/rfrData';
import { TRANSLATIONS, Language } from '../../data/translations';
import { findNearestStation, StationProximity } from '../../utils/geo';
import {
  ArrowUpDown,
  ChevronDown,
  Star,
  Navigation,
  Loader2,
  Footprints,
  Car,
  AlertCircle,
  X
} from 'lucide-react';

interface StationSelectorsProps {
  lang: Language;
  selectedLineId: string;
  onSelectLine: (lineId: string) => void;
  fromStationId: string;
  toStationId: string;
  onSelectFrom: (stationId: string) => void;
  onSelectTo: (stationId: string) => void;
  onSwap: () => void;
  fromStation?: Station;
  toStation?: Station;
  isCrossLine: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export const StationSelectors: React.FC<StationSelectorsProps> = ({
  lang,
  selectedLineId,
  onSelectLine,
  fromStationId,
  toStationId,
  onSelectFrom,
  onSelectTo,
  onSwap,
  fromStation,
  toStation,
  isCrossLine,
  isFavorite,
  onToggleFavorite
}) => {
  const t = TRANSLATIONS[lang];
  const [isLocating, setIsLocating] = useState(false);
  const [detectedProximity, setDetectedProximity] = useState<StationProximity | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // All valid stations for proximity calculations
  const allStations = [...LINES.D.stations, TEBOURBA_BUS_STATION];

  // Handler for GPS nearest station detection
  const handleLocateNearest = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError(t.locationPermissionError);
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const nearest = findNearestStation(
          pos.coords.latitude,
          pos.coords.longitude,
          allStations,
          lang
        );
        if (nearest) {
          setDetectedProximity(nearest);
          onSelectFrom(nearest.station.id);

          // If the nearest station is Tebourba bus station, target is strictly Gobaa
          if (nearest.station.id === 'tebourba_bus') {
            onSelectTo('gobaa');
          } else if (toStationId === nearest.station.id) {
            // Avoid same origin and destination
            onSelectTo(nearest.station.id === TUNIS_CENTRAL_ID ? 'gobaa' : TUNIS_CENTRAL_ID);
          }
        }
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

  // Safe origin change enforcing strict Tebourba ⇄ Gobâa pairing
  const handleFromChange = (newFromId: string) => {
    if (newFromId === 'tebourba_bus') {
      onSelectFrom('tebourba_bus');
      onSelectTo('gobaa');
      return;
    }
    if (toStationId === 'tebourba_bus' && newFromId !== 'gobaa') {
      onSelectTo(TUNIS_CENTRAL_ID);
    }
    onSelectFrom(newFromId);
  };

  // Safe destination change enforcing strict Tebourba ⇄ Gobâa pairing
  const handleToChange = (newToId: string) => {
    if (newToId === 'tebourba_bus') {
      onSelectTo('tebourba_bus');
      onSelectFrom('gobaa');
      return;
    }
    if (fromStationId === 'tebourba_bus' && newToId !== 'gobaa') {
      onSelectFrom('gobaa');
    }
    onSelectTo(newToId);
  };

  const isTebourbaFrom = fromStationId === 'tebourba_bus';
  const isTebourbaTo = toStationId === 'tebourba_bus';

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-7 shadow-xs border border-slate-200 space-y-4 sm:space-y-6">
      {/* Line Selector Buttons */}
      <div>
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 sm:mb-2.5">
          {t.line}
        </span>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {Object.values(LINES).map((line) => {
            const isSelected = selectedLineId === line.id && !isCrossLine;
            return (
              <button
                key={line.id}
                onClick={() => {
                  onSelectLine(line.id);
                  onSelectFrom(line.stations[0].id);
                  onSelectTo(TUNIS_CENTRAL_ID);
                }}
                className={`p-2 sm:p-4 rounded-2xl border-2 transition-all text-center flex flex-col items-center justify-center gap-1 sm:gap-1.5 active:scale-95 ${
                  isSelected
                    ? `${line.activeBorder} bg-white shadow-md scale-[1.02]`
                    : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 text-slate-600'
                }`}
              >
                <span
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-white text-xs sm:text-sm shadow-xs"
                  style={{ backgroundColor: line.bgHex }}
                >
                  {line.code}
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-900 line-clamp-1">
                  {lang === 'ar' ? line.nameAr : line.nameFr}
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-600 font-semibold truncate max-w-full">
                  {lang === 'ar' ? line.terminusAr : line.terminusFr}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stations Dropdowns with Swap Button & Geolocation */}
      <div className="space-y-2.5 sm:space-y-3 relative">
        {/* Origin Station Dropdown with Nearest Station Button */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-slate-600">{t.from}</label>
              {fromStation && (
                <span className="text-[10px] font-semibold text-slate-500">
                  {lang === 'ar' ? LINES[fromStation.lineId]?.nameAr || 'ترابط حافلة' : LINES[fromStation.lineId]?.nameFr || 'Bus'}
                </span>
              )}
            </div>

            {/* GPS Nearest Station Quick Button */}
            <button
              type="button"
              onClick={handleLocateNearest}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition-colors disabled:opacity-50 active:scale-95"
              title={t.locateNearestStation}
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-orange-600" />
              )}
              <span>{isLocating ? t.detectingLocation : t.locateNearestStation}</span>
            </button>
          </div>

          <div className="relative">
            <select
              value={fromStationId}
              onChange={(e) => handleFromChange(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl py-2.5 px-3.5 sm:py-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
            >
              {isTebourbaTo ? (
                // When destination is Tebourba bus, origin is strictly Gobaa
                <optgroup label={lang === 'ar' ? 'محطة الانطلاق الحصرية للحافلة' : 'Gare de départ exclusive du bus'}>
                  <option value="gobaa">
                    {lang === 'ar' ? 'القباعة (محطة قطار RFR الترابطية)' : 'Gobâa (Gare de correspondance RFR)'}
                  </option>
                </optgroup>
              ) : (
                <>
                  <optgroup label={lang === 'ar' ? '🚌 حافلات الترابط (طبربة ⇄ محطة القباعة)' : '🚌 Bus de rabattement (Tébourba ⇄ Gare de Gobâa)'}>
                    <option value="tebourba_bus">
                      {lang === 'ar' ? 'طبربة (ترابط الحافلة 42/116 ⇄ محطة القباعة)' : 'Tébourba (Bus 42/116 ⇄ Gare de Gobâa)'}
                    </option>
                  </optgroup>
                  {Object.values(LINES).map((line) => (
                    <optgroup key={line.id} label={`${line.code} - ${lang === 'ar' ? line.nameAr : line.nameFr}`}>
                      {line.stations.map((st) => (
                        <option key={`${line.id}-${st.id}`} value={st.id}>
                          {st.id === 'gobaa'
                            ? (lang === 'ar' ? 'القباعة (محطة ترابط حافلات طبربة 42 و116)' : 'Gobâa (Gare de correspondance Bus 42/116)')
                            : (lang === 'ar' ? st.nameAr : st.nameFr)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </>
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto pointer-events-none" />
          </div>

          {/* GPS Proximity Badge if detected */}
          {detectedProximity && (
            <div className="mt-2 bg-orange-50/80 border border-orange-200 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-orange-900 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-orange-600" />
                  {t.nearestStationToYou}: {lang === 'ar' ? detectedProximity.station.nameAr : detectedProximity.station.nameFr}
                </span>
                <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                  {detectedProximity.formattedDistance}
                </span>
                <span className="text-slate-600 flex items-center gap-1 text-[11px]">
                  <Footprints className="w-3 h-3 text-slate-500" />
                  {detectedProximity.formattedWalk} {t.walkEstimate}
                </span>
                <span className="text-slate-600 flex items-center gap-1 text-[11px]">
                  <Car className="w-3 h-3 text-slate-500" />
                  {detectedProximity.formattedDrive} {t.driveEstimate}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetectedProximity(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Geo error banner */}
          {geoError && (
            <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-2.5 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{geoError}</span>
              <button
                type="button"
                onClick={() => setGeoError(null)}
                className="ml-auto text-amber-700 font-bold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Strict Notice when Tebourba is Departure */}
          {isTebourbaFrom && (
            <div className="mt-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50/90 border border-emerald-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <span>🚌</span>
              <span>{t.tebourbaOnlyGobaaNotice}</span>
            </div>
          )}
        </div>

        {/* Swap Button */}
        <div className="flex justify-end -my-2 relative z-10 px-4">
          <button
            onClick={onSwap}
            aria-label={t.swap}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 shadow-md hover:shadow-lg hover:border-orange-500 hover:text-orange-600 flex items-center justify-center text-slate-600 transition-all duration-200 active:scale-90"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {/* Destination Station Dropdown */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-600">{t.to}</label>
            {toStation && (
              <span className="text-[10px] font-semibold text-slate-500">
                {lang === 'ar' ? LINES[toStation.lineId]?.nameAr || 'ترابط حافلة' : LINES[toStation.lineId]?.nameFr || 'Bus'}
              </span>
            )}
          </div>
          <div className="relative">
            <select
              value={toStationId}
              onChange={(e) => handleToChange(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl py-2.5 px-3.5 sm:py-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
            >
              {isTebourbaFrom ? (
                // When origin is Tebourba bus, destination is strictly Gobaa
                <optgroup label={lang === 'ar' ? 'محطة الوصول الحصرية للحافلة' : 'Destination exclusive du bus'}>
                  <option value="gobaa">
                    {lang === 'ar' ? 'القباعة (محطة قطار RFR الترابطية)' : 'Gobâa (Gare de correspondance RFR)'}
                  </option>
                </optgroup>
              ) : (
                <>
                  <optgroup label={lang === 'ar' ? '🚌 حافلات الترابط (طبربة ⇄ محطة القباعة)' : '🚌 Bus de rabattement (Tébourba ⇄ Gare de Gobâa)'}>
                    <option value="tebourba_bus">
                      {lang === 'ar' ? 'طبربة (ترابط الحافلة 42/116 ⇄ محطة القباعة)' : 'Tébourba (Bus 42/116 ⇄ Gare de Gobâa)'}
                    </option>
                  </optgroup>
                  {Object.values(LINES).map((line) => (
                    <optgroup key={line.id} label={`${line.code} - ${lang === 'ar' ? line.nameAr : line.nameFr}`}>
                      {line.stations.map((st) => (
                        <option key={`${line.id}-${st.id}`} value={st.id}>
                          {st.id === 'gobaa'
                            ? (lang === 'ar' ? 'القباعة (محطة ترابط حافلات طبربة 42 و116)' : 'Gobâa (Gare de correspondance Bus 42/116)')
                            : (lang === 'ar' ? st.nameAr : st.nameFr)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </>
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto pointer-events-none" />
          </div>

          {/* Strict Notice when Tebourba is Destination */}
          {isTebourbaTo && (
            <div className="mt-1.5 text-[11px] font-semibold text-teal-800 bg-teal-50/90 border border-teal-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <span>🚌</span>
              <span>{t.tebourbaOnlyGobaaNotice}</span>
            </div>
          )}
        </div>

        {/* Quick Route Shortcuts & Favorites */}
        <div className="flex items-center gap-2 pt-2">
          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => {
                onSelectLine('D');
                handleFromChange('gobaa');
                handleToChange(TUNIS_CENTRAL_ID);
              }}
              className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              القباعة ➔ تونس
            </button>
            <button
              onClick={() => {
                onSelectLine('D');
                handleFromChange('tebourba_bus');
                handleToChange('gobaa');
              }}
              className="text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <span>🚌 طبربة ➔ القباعة</span>
            </button>
            <button
              onClick={() => {
                onSelectLine('D');
                handleFromChange('gobaa');
                handleToChange('tebourba_bus');
              }}
              className="text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <span>🚌 القباعة ➔ طبربة</span>
            </button>
            <button
              onClick={() => {
                onSelectLine('D');
                handleFromChange('manouba');
                handleToChange(TUNIS_CENTRAL_ID);
              }}
              className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              منوبة ➔ تونس
            </button>
          </div>

          <button
            onClick={onToggleFavorite}
            aria-label={isFavorite ? t.savedFavorite : t.saveFavorite}
            className={`p-2 rounded-xl border transition-colors flex items-center gap-1 text-xs font-semibold shrink-0 ${
              isFavorite
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
            <span className="hidden sm:inline">{isFavorite ? t.savedFavorite : t.saveFavorite}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
