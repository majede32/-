import React, { useState } from 'react';
import { TRANSLATIONS, Language } from '../../data/translations';
import { formatMinutesToTime } from '../../data/rfrData';
import { X, Clock, Sliders, Check, RefreshCw } from 'lucide-react';

interface TimeSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currentSimulatedMinutes: number | null;
  currentSimulatedDayOfWeek: number | null;
  onApply: (minutes: number, dayOfWeek: number) => void;
  onReset: () => void;
}

export const TimeSimulatorModal: React.FC<TimeSimulatorModalProps> = ({
  isOpen,
  onClose,
  lang,
  currentSimulatedMinutes,
  currentSimulatedDayOfWeek,
  onApply,
  onReset
}) => {
  const t = TRANSLATIONS[lang];

  const [tempMinutes, setTempMinutes] = useState<number>(
    currentSimulatedMinutes ?? 480 // 08:00 default
  );
  const [tempDayOfWeek, setTempDayOfWeek] = useState<number>(
    currentSimulatedDayOfWeek ?? 1 // Monday default
  );

  if (!isOpen) return null;

  const quickPresets = [
    { labelAr: 'ذروة الصباح (07:30)', labelFr: 'Matin (07:30)', minutes: 450, day: 1 },
    { labelAr: 'منتصف النهار (12:30)', labelFr: 'Midi (12:30)', minutes: 750, day: 1 },
    { labelAr: 'ذروة المساء (17:45)', labelFr: 'Soir (17:45)', minutes: 1065, day: 1 },
    { labelAr: 'ليل السبت (23:15)', labelFr: 'Samedi nuit (23:15)', minutes: 1395, day: 6 },
    { labelAr: 'صباح الأحد (09:00)', labelFr: 'Dimanche (09:00)', minutes: 540, day: 0 }
  ];

  const daysLabels = [
    { id: 0, nameAr: 'الأحد (Dimanche)', nameFr: 'Dimanche' },
    { id: 1, nameAr: 'الاثنين (Lundi)', nameFr: 'Lundi' },
    { id: 2, nameAr: 'الثلاثاء (Mardi)', nameFr: 'Mardi' },
    { id: 3, nameAr: 'الأربعاء (Mercredi)', nameFr: 'Mercredi' },
    { id: 4, nameAr: 'الخميس (Jeudi)', nameFr: 'Jeudi' },
    { id: 5, nameAr: 'الجمعة (Vendredi)', nameFr: 'Vendredi' },
    { id: 6, nameAr: 'السبت (Samedi)', nameFr: 'Samedi' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.timeSimulator}</h3>
              <p className="text-[11px] text-slate-500">
                {lang === 'ar'
                  ? 'اختبر مواعيد القطارات في أي وقت وأي يوم من الأسبوع'
                  : 'Testez les horaires à n’importe quelle heure'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Time Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-600" />
              {lang === 'ar' ? 'الوقت المراد محاكاته:' : 'Heure simulée :'}
            </span>
            <span className="text-xl font-black text-orange-600 font-mono tabular-nums px-2.5 py-0.5 rounded-lg bg-orange-50 border border-orange-200">
              {formatMinutesToTime(tempMinutes)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1439}
            step={5}
            value={tempMinutes}
            onChange={(e) => setTempMinutes(parseInt(e.target.value, 10))}
            className="w-full accent-orange-600 cursor-pointer"
          />
        </div>

        {/* Day of Week Selector */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 block">
            {lang === 'ar' ? 'يوم الأسبوع (لاختبار رموز A و B و C و D):' : 'Jour de la semaine :'}
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {daysLabels.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setTempDayOfWeek(d.id)}
                className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition-all ${
                  tempDayOfWeek === d.id
                    ? 'bg-orange-600 border-orange-600 text-white shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {lang === 'ar' ? d.nameAr.split(' ')[0] : d.nameFr}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {lang === 'ar' ? 'أوقات شائعة للاختبار:' : 'Préréglages :'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickPresets.map((qp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setTempMinutes(qp.minutes);
                  setTempDayOfWeek(qp.day);
                }}
                className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
              >
                {lang === 'ar' ? qp.labelAr : qp.labelFr}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onReset();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.resetToLive}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onApply(tempMinutes, tempDayOfWeek);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تطبيق الوقت' : 'Appliquer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
