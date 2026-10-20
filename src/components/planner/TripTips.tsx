import React from 'react';
import { TRANSLATIONS, Language } from '../../data/translations';

interface TripTipsProps {
  lang: Language;
}

export const TripTips: React.FC<TripTipsProps> = ({ lang }) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="space-y-4">
      {/* Official Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed space-y-1">
        <p className="font-bold">{t.unofficialNotice}</p>
      </div>

      {/* Good to Know Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          {t.goodToKnow}
        </h3>

        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/50 flex items-center gap-3 text-xs font-bold text-amber-900">
          <span className="text-lg">ℹ️</span>
          <span>
            {lang === 'ar' ? 'رحلة مريحة وممتعة على متن قطارات RFR 🚆' : 'Have a nice trip 🚆'}
          </span>
        </div>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed pr-1">
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
            <span>{t.tip1}</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
            <span>{t.tip2}</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
            <span>{t.tip3}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
