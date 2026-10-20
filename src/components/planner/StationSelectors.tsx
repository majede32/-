import React from 'react';
import { LINES, TUNIS_CENTRAL_ID, Station } from '../../data/rfrData';
import { TRANSLATIONS, Language } from '../../data/translations';
import { ArrowUpDown, ChevronDown, Star } from 'lucide-react';

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

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200 space-y-6">
      {/* Line Selector Buttons */}
      <div>
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
          {t.line}
        </span>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
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
                className={`p-3 sm:p-4 rounded-2xl border-2 transition-all text-center flex flex-col items-center justify-center gap-1.5 ${
                  isSelected
                    ? `${line.activeBorder} bg-white shadow-md scale-[1.02]`
                    : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 text-slate-600'
                }`}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm shadow-xs"
                  style={{ backgroundColor: line.bgHex }}
                >
                  {line.code}
                </span>
                <span className="text-xs font-bold text-slate-900 line-clamp-1">
                  {lang === 'ar' ? line.nameAr : line.nameFr}
                </span>
                <span className="text-[10px] text-slate-600 font-semibold truncate max-w-full">
                  {lang === 'ar' ? line.terminusAr : line.terminusFr}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stations Dropdowns with Swap Button */}
      <div className="space-y-3 relative">
        {/* Origin Station Dropdown */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-600">{t.from}</label>
            {fromStation && (
              <span className="text-[10px] font-semibold text-slate-500">
                {lang === 'ar' ? LINES[fromStation.lineId].nameAr : LINES[fromStation.lineId].nameFr}
              </span>
            )}
          </div>
          <div className="relative">
            <select
              value={fromStationId}
              onChange={(e) => onSelectFrom(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
            >
              {Object.values(LINES).map((line) => (
                <optgroup key={line.id} label={`${line.code} - ${lang === 'ar' ? line.nameAr : line.nameFr}`}>
                  {line.stations.map((st) => (
                    <option key={`${line.id}-${st.id}`} value={st.id}>
                      {lang === 'ar' ? st.nameAr : st.nameFr}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-4 pointer-events-none" />
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-end -my-2 relative z-10 px-4">
          <button
            onClick={onSwap}
            aria-label={t.swap}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md hover:shadow-lg hover:border-orange-500 hover:text-orange-600 flex items-center justify-center text-slate-600 transition-all duration-200 active:scale-90"
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
                {lang === 'ar' ? LINES[toStation.lineId].nameAr : LINES[toStation.lineId].nameFr}
              </span>
            )}
          </div>
          <div className="relative">
            <select
              value={toStationId}
              onChange={(e) => onSelectTo(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
            >
              {Object.values(LINES).map((line) => (
                <optgroup key={line.id} label={`${line.code} - ${lang === 'ar' ? line.nameAr : line.nameFr}`}>
                  {line.stations.map((st) => (
                    <option key={`${line.id}-${st.id}`} value={st.id}>
                      {lang === 'ar' ? st.nameAr : st.nameFr}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-4 pointer-events-none" />
          </div>
        </div>

        {/* Quick Route Shortcuts & Favorites */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                onSelectLine('D');
                onSelectFrom('gobaa');
                onSelectTo(TUNIS_CENTRAL_ID);
              }}
              className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
            >
              القباعة ➔ تونس (D)
            </button>
            <button
              onClick={() => {
                onSelectLine('E');
                onSelectFrom('bougatfa');
                onSelectTo(TUNIS_CENTRAL_ID);
              }}
              className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
            >
              بوقطفة ➔ تونس (E)
            </button>
            <button
              onClick={() => {
                onSelectFrom('gobaa');
                onSelectTo('hammam_lif');
              }}
              className="text-[11px] font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg transition-colors"
            >
              القباعة ➔ حمام الأنف (ترانزيت)
            </button>
          </div>

          <button
            onClick={onToggleFavorite}
            className={`p-2 rounded-xl border transition-colors flex items-center gap-1 text-xs font-semibold ${
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
