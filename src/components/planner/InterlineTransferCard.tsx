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
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-slate-900 block">
            {t.leg1} ({lang === 'ar' ? LINES[trip.leg1.schedule.lineId].nameAr : LINES[trip.leg1.schedule.lineId].nameFr})
          </span>
          <span className="text-[11px] text-slate-600 font-mono">
            {lang === 'ar' ? trip.originStation.nameAr : trip.originStation.nameFr} ({trip.leg1.departureTime}) ➔ تونس ({trip.leg1.arrivalTime})
          </span>
        </div>
        <span className="font-bold font-mono text-slate-700">
          {trip.leg1.durationMinutes} min · {t.train} {trip.leg1.schedule.trainNumber}
        </span>
      </div>

      {/* Transfer Buffer */}
      <div className="px-4 py-1.5 bg-orange-50 text-orange-800 rounded-lg text-[11px] font-semibold flex items-center justify-between border border-orange-200">
        <span>🔄 {t.transferAtTunis}</span>
        <span className="font-mono font-bold">~{trip.transferWaitMinutes} min</span>
      </div>

      {/* Leg 2 */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-slate-900 block">
            {t.leg2} ({lang === 'ar' ? LINES[trip.leg2.schedule.lineId].nameAr : LINES[trip.leg2.schedule.lineId].nameFr})
          </span>
          <span className="text-[11px] text-slate-600 font-mono">
            تونس ({trip.leg2.departureTime}) ➔ {lang === 'ar' ? trip.destinationStation.nameAr : trip.destinationStation.nameFr} ({trip.leg2.arrivalTime})
          </span>
        </div>
        <span className="font-bold font-mono text-slate-700">
          {trip.leg2.durationMinutes} min · {t.train} {trip.leg2.schedule.trainNumber}
        </span>
      </div>
    </div>
  );
};
