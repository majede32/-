import React from 'react';
import { InterlineTrip } from '../../types/trips';
import { LINES } from '../../data/rfrData';
import { TRANSLATIONS, Language } from '../../data/translations';
import { GitBranch } from 'lucide-react';

interface InterlineTransferCardProps {
  trip: InterlineTrip;
  lang: Language;
}

export const InterlineTransferCard: React.FC<InterlineTransferCardProps> = ({ trip, lang }) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="pt-2 border-t border-slate-100 space-y-3">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-blue-50 border border-orange-200 flex items-center gap-3 text-xs mb-3">
        <GitBranch className="w-5 h-5 text-orange-600 shrink-0" />
        <div className="space-y-0.5">
          <h4 className="font-bold text-slate-900">{t.interlineTrip}</h4>
          <p className="text-slate-600 text-[11px]">
            {t.transferAtTunis} ({trip.transferWaitMinutes} {t.minutes} {t.transferWait})
          </p>
        </div>
      </div>

      <h4 className="text-xs font-bold text-slate-800">{t.interlineTrip}:</h4>

      {/* Leg 1 */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
        <div className="min-w-0">
          <span className="font-bold text-slate-900 block truncate">
            {t.leg1} ({lang === 'ar' ? LINES[trip.leg1.schedule.lineId].nameAr : LINES[trip.leg1.schedule.lineId].nameFr})
          </span>
          <span className="text-[11px] text-slate-600 font-mono block truncate">
            {lang === 'ar' ? trip.originStation.nameAr : trip.originStation.nameFr} (<span dir="ltr">{trip.leg1.departureTime}</span>) {lang === 'ar' ? '⬅' : '➔'} تونس (<span dir="ltr">{trip.leg1.arrivalTime}</span>)
          </span>
        </div>
        <span className="font-bold font-mono text-slate-700 text-[11px] sm:text-xs shrink-0">
          {trip.leg1.durationMinutes} {lang === 'ar' ? 'دق' : 'min'} · {t.train} {trip.leg1.schedule.trainNumber}
        </span>
      </div>

      {/* Transfer Buffer */}
      <div className="px-3 sm:px-4 py-1.5 bg-orange-50 text-orange-800 rounded-lg text-[11px] font-semibold flex items-center justify-between border border-orange-200">
        <span>🔄 {t.transferAtTunis}</span>
        <span className="font-mono font-bold">~{trip.transferWaitMinutes} {lang === 'ar' ? 'دق' : 'min'}</span>
      </div>

      {/* Leg 2 */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
        <div className="min-w-0">
          <span className="font-bold text-slate-900 block truncate">
            {t.leg2} ({lang === 'ar' ? LINES[trip.leg2.schedule.lineId].nameAr : LINES[trip.leg2.schedule.lineId].nameFr})
          </span>
          <span className="text-[11px] text-slate-600 font-mono block truncate">
            تونس (<span dir="ltr">{trip.leg2.departureTime}</span>) {lang === 'ar' ? '⬅' : '➔'} {lang === 'ar' ? trip.destinationStation.nameAr : trip.destinationStation.nameFr} (<span dir="ltr">{trip.leg2.arrivalTime}</span>)
          </span>
        </div>
        <span className="font-bold font-mono text-slate-700 text-[11px] sm:text-xs shrink-0">
          {trip.leg2.durationMinutes} {lang === 'ar' ? 'دق' : 'min'} · {t.train} {trip.leg2.schedule.trainNumber}
        </span>
      </div>
    </div>
  );
};
