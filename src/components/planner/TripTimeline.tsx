import React from 'react';
import { DirectTrip } from '../../types/trips';
import { LINES, Station } from '../../data/rfrData';
import { TRANSLATIONS, Language } from '../../data/translations';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TripTimelineProps {
  trip: DirectTrip;
  lang: Language;
  showStops: boolean;
  onToggleStops: () => void;
  onSelectStationModal: (station: Station) => void;
}

export const TripTimeline: React.FC<TripTimelineProps> = ({
  trip,
  lang,
  showStops,
  onToggleStops,
  onSelectStationModal
}) => {
  const t = TRANSLATIONS[lang];
  const activeLine = LINES[trip.schedule.lineId] || LINES.D;

  return (
    <div>
      <button
        onClick={onToggleStops}
        className="w-full flex items-center justify-between py-1 text-xs font-bold text-slate-800 hover:text-orange-600 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {showStops ? (
            <ChevronUp className="w-4 h-4 text-orange-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-orange-600" />
          )}
          {t.stopsOnThisTrip} ({trip.intermediateStops.length})
        </span>
        <span className="text-[11px] text-slate-600 font-semibold font-mono">
          {trip.departureTime} ➔ {trip.arrivalTime}
        </span>
      </button>

      {showStops && (
        <div className="mt-4 pr-3 pl-1 py-1 space-y-0 relative">
          <div
            className="absolute top-3 bottom-3 right-[18px] w-0.5 border-r-2 border-dashed"
            style={{ borderColor: activeLine.bgHex }}
          />

          {trip.intermediateStops.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === trip.intermediateStops.length - 1;

            return (
              <div
                key={item.station.id}
                className="relative flex items-center justify-between py-2.5 z-10 hover:bg-slate-50/60 rounded-xl px-2 transition-colors cursor-pointer"
                onClick={() => onSelectStationModal(item.station)}
              >
                <div className="flex items-center gap-3">
                  {isFirst || isLast ? (
                    <div
                      className="w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center shrink-0"
                      style={{ borderColor: activeLine.bgHex }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: activeLine.bgHex }}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-3 h-3 rounded-full shrink-0 mx-0.5"
                      style={{ backgroundColor: activeLine.bgHex }}
                    />
                  )}

                  <span
                    className={`text-xs ${
                      isFirst || isLast
                        ? 'font-black text-slate-900 text-sm'
                        : 'font-semibold text-slate-700'
                    }`}
                  >
                    {lang === 'ar' ? item.station.nameAr : item.station.nameFr}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {item.station.connections && item.station.connections.length > 0 && (
                    <span className="hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.station.connections[0]}
                    </span>
                  )}
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      isFirst || isLast ? 'font-black text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    {item.time}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
