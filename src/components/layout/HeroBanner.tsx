import React from 'react';
import { TunisiaTimeInfo } from '../../utils/tunisiaTime';
import { TRANSLATIONS, Language } from '../../data/translations';
import { Train, Sliders, RefreshCw, Sparkles } from 'lucide-react';
import heroTrainWebp from '../../assets/images/hero_tunis_rfr_train.webp';
import heroTrainWebpMobile from '../../assets/images/hero_tunis_rfr_train_mobile.webp';

interface HeroBannerProps {
  lang: Language;
  tunisiaTimeInfo: TunisiaTimeInfo;
  formattedDateStr: string;
  isSimulated: boolean;
  onResetSimulation: () => void;
  onOpenTimeModal: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  lang,
  tunisiaTimeInfo,
  formattedDateStr,
  isSimulated,
  onResetSimulation,
  onOpenTimeModal
}) => {
  const t = TRANSLATIONS[lang];

  const holidayName =
    tunisiaTimeInfo.holiday &&
    (lang === 'ar'
      ? tunisiaTimeInfo.holiday.nameAr
      : lang === 'fr'
      ? tunisiaTimeInfo.holiday.nameFr
      : tunisiaTimeInfo.holiday.nameEn);

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-xs border border-slate-200 bg-slate-900 min-h-[200px] sm:min-h-[220px] flex flex-col justify-end p-5 sm:p-7 text-white">
      <picture className="absolute inset-0 w-full h-full">
        <source media="(max-width: 640px)" srcSet={heroTrainWebpMobile} type="image/webp" />
        <source srcSet={heroTrainWebp} type="image/webp" />
        <img
          src={heroTrainWebp}
          alt="Modern Tunis RFR Commuter Train"
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover object-center opacity-70"
        />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/20" />

      {/* Hero Content */}
      <div className="relative z-10 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-600/90 text-white flex items-center justify-center">
            <Train className="w-4 h-4" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {t.appTitle}
          </h1>
        </div>

        <p className="text-xs sm:text-sm text-slate-200 max-w-xl font-medium">
          {t.subtitle}
        </p>

        {/* Time & Day Indicator Bar */}
        <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white font-mono tabular-nums">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t.tunisiaTime}</span>
            <span className="text-slate-300">·</span>
            <span className="font-sans">{formattedDateStr}</span>
            <span className="text-slate-300">·</span>
            <span className="font-bold text-amber-300">{tunisiaTimeInfo.formattedTime}</span>
            {isSimulated && (
              <span className="text-[10px] bg-amber-500/80 text-black px-1.5 py-0.2 rounded font-sans font-bold">
                محاكاة
              </span>
            )}
          </div>

          {/* Holiday Notice Pill if today is a public holiday */}
          {tunisiaTimeInfo.isHoliday && holidayName && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/30 backdrop-blur-md border border-amber-400/40 text-amber-200 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{holidayName}</span>
            </div>
          )}

          {isSimulated ? (
            <button
              onClick={onResetSimulation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600/80 hover:bg-red-600 text-white font-bold transition text-xs"
              title={t.resetToLive}
            >
              <RefreshCw className="w-3 h-3" />
              <span>{t.resetToLive}</span>
            </button>
          ) : (
            <button
              onClick={onOpenTimeModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold transition text-xs"
              title={t.timeSimulator}
            >
              <Sliders className="w-3 h-3" />
              <span>{t.timeSimulator}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
