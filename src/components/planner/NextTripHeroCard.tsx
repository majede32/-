import React from 'react';
import { AnyTrip } from '../../types/trips';
import { Station } from '../../data/rfrData';
import { TRANSLATIONS, Language } from '../../data/translations';
import { getDaysBadgeInfo } from '../../services/tripSearchEngine';
import { announceTripStationVoice } from '../../utils/sound';
import { TripTimeline } from './TripTimeline';
import { InterlineTransferCard } from './InterlineTransferCard';
import { Calendar, Volume2, Bell, Share2 } from 'lucide-react';

interface NextTripHeroCardProps {
  trip: AnyTrip;
  lang: Language;
  showStops: boolean;
  onToggleStops: () => void;
  onSetReminder: (trip: AnyTrip) => void;
  onShareTrip: (trip: AnyTrip) => void;
  onSelectStationModal: (station: Station) => void;
}

export const NextTripHeroCard: React.FC<NextTripHeroCardProps> = ({
  trip,
  lang,
  showStops,
  onToggleStops,
  onSetReminder,
  onShareTrip,
  onSelectStationModal
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-7 shadow-xs border border-slate-200 space-y-4 sm:space-y-5">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 shrink-0">
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
            {t.winterTimetable}
          </span>
          {trip.isNextDay && (
            <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white shrink-0">
              {t.firstTrainTomorrow} <span dir="ltr">{trip.departureTime}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => announceTripStationVoice(trip, lang)}
            title={lang === 'ar' ? 'إعلان صوتي للرحلة (جرس وصوت نسائي)' : 'Annonce sonore du train'}
            aria-label={lang === 'ar' ? 'إعلان صوتي للرحلة (جرس وصوت نسائي)' : 'Station voice announcement'}
            className="w-8 h-8 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 flex items-center justify-center transition-colors shadow-xs active:scale-95"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSetReminder(trip)}
            title={t.remindMe}
            aria-label={t.remindMe}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors active:scale-95"
          >
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={() => onShareTrip(trip)}
            title={t.shareTrip}
            aria-label={t.shareTrip}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors active:scale-95"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Huge Countdown Display */}
      <div aria-live="polite" aria-atomic="true">
        <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest block">
          {t.nextTrain}
        </span>
        <div className="mt-1 flex items-baseline gap-2 flex-wrap">
          <span className="text-xs sm:text-sm font-semibold text-slate-600">{t.departsIn}</span>
          <span className="text-2xl sm:text-5xl font-black text-amber-700 tracking-tight font-mono tabular-nums">
            {trip.remainingMinutes <= 0
              ? t.departsNow
              : lang === 'ar'
              ? trip.remainingMinutes < 60
                ? `${trip.remainingMinutes} دقيقة`
                : `${Math.floor(trip.remainingMinutes / 60)} س و ${trip.remainingMinutes % 60} دق`
              : trip.remainingMinutes < 60
              ? `${trip.remainingMinutes} min`
              : `${Math.floor(trip.remainingMinutes / 60)} h ${trip.remainingMinutes % 60} min`}
          </span>
        </div>
      </div>

      {/* Time & Route Banner Card */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-100/80">
        <div className="flex items-center justify-between gap-2 sm:gap-6">
          <div className="flex-1 min-w-0">
            <span dir="ltr" className="text-xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums block text-start">
              {trip.departureTime}
            </span>
            <span className="text-xs font-bold text-slate-600 mt-0.5 block truncate">
              {lang === 'ar' ? trip.originStation.nameAr : trip.originStation.nameFr}
            </span>
          </div>

          <div className="text-amber-700 font-black text-lg sm:text-xl px-1 shrink-0">
            {lang === 'ar' ? '⬅' : '➔'}
          </div>

          <div className="flex-1 min-w-0 text-end">
            <span dir="ltr" className="text-xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums block text-end">
              {trip.arrivalTime}
            </span>
            <span className="text-xs font-bold text-slate-600 mt-0.5 block truncate">
              {lang === 'ar' ? trip.destinationStation.nameAr : trip.destinationStation.nameFr}
            </span>
          </div>
        </div>
      </div>

      {/* Direct vs Interline Layout */}
      {trip.type === 'direct' ? (
        <>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-b border-slate-100 pb-3 sm:pb-4 gap-2">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span>{t.duration}</span>
              <strong className="text-slate-900 font-bold font-mono tabular-nums">
                {trip.durationMinutes} {lang === 'ar' ? 'دق' : 'min'}
              </strong>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              <span>{t.train}</span>
              <strong className="text-slate-900 font-bold font-mono">
                {trip.schedule.trainNumber}
              </strong>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 bg-slate-50 text-slate-700 whitespace-nowrap">
                {getDaysBadgeInfo(trip.schedule.days, lang).short}
              </span>
            </div>
          </div>

          {/* Stops Timeline */}
          <TripTimeline
            trip={trip}
            lang={lang}
            showStops={showStops}
            onToggleStops={onToggleStops}
            onSelectStationModal={onSelectStationModal}
          />
        </>
      ) : (
        <InterlineTransferCard trip={trip} lang={lang} />
      )}
    </div>
  );
};
