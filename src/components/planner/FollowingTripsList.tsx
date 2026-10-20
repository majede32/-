import React from 'react';
import { AnyTrip } from '../../types/trips';
import { TRANSLATIONS, Language } from '../../data/translations';
import { getDaysBadgeInfo, formatRemainingTime } from '../../services/tripSearchEngine';

interface FollowingTripsListProps {
  trips: AnyTrip[];
  lang: Language;
}

export const FollowingTripsList: React.FC<FollowingTripsListProps> = ({ trips, lang }) => {
  const t = TRANSLATIONS[lang];

  if (!trips || trips.length === 0) return null;

  return (
    <div className="pt-4 border-t border-slate-100 space-y-3">
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
        {t.followingTrains}
      </span>

      <div className="space-y-2.5">
        {trips.map((ft, idx) => {
          const trainLabel =
            ft.type === 'direct'
              ? ft.schedule.trainNumber
              : `${ft.leg1.schedule.trainNumber} ➔ ${ft.leg2.schedule.trainNumber}`;
          const duration = ft.type === 'direct' ? ft.durationMinutes : ft.totalDurationMinutes;

          return (
            <div
              key={`${trainLabel}-${idx}`}
              className="p-3 sm:p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-900 font-mono tabular-nums">
                  <span dir="ltr">{ft.departureTime}</span>
                  <span className="text-slate-400 font-sans text-xs">{lang === 'ar' ? '⬅' : '➔'}</span>
                  <span dir="ltr">{ft.arrivalTime}</span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 truncate">
                  <span>
                    {t.train} {trainLabel}
                  </span>
                  <span>·</span>
                  <span>{duration} {lang === 'ar' ? 'دق' : 'min'}</span>
                </div>
              </div>

              <div className="text-end shrink-0">
                <span className="text-xs sm:text-sm font-bold text-amber-700 block font-mono tabular-nums">
                  {t.in} {formatRemainingTime(ft.remainingMinutes, lang)}
                </span>
                {ft.type === 'direct' && (
                  <span className="text-[9px] sm:text-[10px] text-slate-500 block truncate max-w-[120px]">
                    {getDaysBadgeInfo(ft.schedule.days, lang).short}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
