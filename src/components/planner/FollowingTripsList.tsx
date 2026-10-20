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
              className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-slate-900 font-mono tabular-nums">
                  <span>{ft.departureTime}</span>
                  <span className="text-slate-400 font-sans">➔</span>
                  <span>{ft.arrivalTime}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>
                    {t.train} {trainLabel}
                  </span>
                  <span>·</span>
                  <span>{duration} min</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-bold text-amber-700 block font-mono tabular-nums">
                  {t.in} {formatRemainingTime(ft.remainingMinutes, lang)}
                </span>
                {ft.type === 'direct' && (
                  <span className="text-[10px] text-slate-500">
                    {getDaysBadgeInfo(ft.schedule.days, lang).full}
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
