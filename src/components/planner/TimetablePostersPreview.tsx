import React from 'react';
import { TRANSLATIONS, Language } from '../../data/translations';

interface TimetablePostersPreviewProps {
  lang: Language;
  onOpenPosters: (lineId: string) => void;
}

export const TimetablePostersPreview: React.FC<TimetablePostersPreviewProps> = ({
  lang,
  onOpenPosters
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 space-y-4">
      <h3 className="text-base font-bold text-slate-900">{t.downloadTimetables}</h3>

      <div className="space-y-3">
        {/* Line A */}
        <div
          onClick={() => onOpenPosters('A')}
          className="p-4 rounded-2xl border border-blue-200/80 bg-blue-50/30 hover:bg-blue-50/60 cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
              A
            </span>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                {t.lineATimetable}
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">1.1 MB · WEBP / PDF</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600 group-hover:border-blue-500 transition-colors">
            ➔
          </div>
        </div>

        {/* Line D */}
        <div
          onClick={() => onOpenPosters('D')}
          className="p-4 rounded-2xl border border-orange-200/80 bg-orange-50/30 hover:bg-orange-50/60 cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-sm shadow-xs">
              D
            </span>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-orange-700 transition-colors">
                {t.lineDTimetable}
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">633 KB · WEBP / PDF</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-orange-600 group-hover:border-orange-500 transition-colors">
            ➔
          </div>
        </div>

        {/* Line E */}
        <div
          onClick={() => onOpenPosters('E')}
          className="p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/30 hover:bg-emerald-50/60 cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
              E
            </span>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                {t.lineETimetable}
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">629 KB · WEBP / PDF</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-emerald-600 group-hover:border-emerald-500 transition-colors">
            ➔
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
        Source: official SNCFT posters. Unofficial app, not affiliated with SNCFT.
      </p>
    </div>
  );
};
