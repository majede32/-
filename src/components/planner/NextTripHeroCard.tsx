import React from 'react';
import { AnyTrip } from '../../types/trips';
import { Station } from '../../data/rfrData';
import { TRANSLATIONS, Language } from '../../data/translations';
import { getDaysBadgeInfo } from '../../services/tripSearchEngine';
import { playRailwayChime } from '../../utils/sound';
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
    <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200 space-y-5">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            {t.winterTimetable}
          </span>
          {trip.isNextDay && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
              {t.firstTrainTomorrow} {trip.departureTime}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={playRailwayChime}
            title="Play railway arrival chime"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSetReminder(trip)}
            title={t.remindMe}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={() => onShareTrip(trip)}
            title={t.shareTrip}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Huge Countdown Display */}
      <div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
          {t.nextTrain}
        </span>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-slate-600">{t.departsIn}</span>
          <span className="text-4xl sm:text-5xl font-black text-amber-700 tracking-tight font-mono tabular-nums">
            {trip.remainingMinutes <= 0
              ? t.departsNow
              : trip.remainingMinutes < 60
              ? `${trip.remainingMinutes} min`
              : `${Math.floor(trip.remainingMinutes / 60)} h ${trip.remainingMinutes % 60} min`}
          </span>
        </div>
      </div>

      {/* Time & Route Banner Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-100/80 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6">
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums block">
              {trip.departureTime}
            </span>
            <span className="text-xs font-bold text-slate-600 mt-0.5 block">
              {lang === 'ar' ? trip.originStation.nameAr : trip.originStation.nameFr}
            </span>
          </div>

          <div className="text-amber-700 font-black text-xl px-1">➔</div>

          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums block">
              {trip.arrivalTime}
            </span>
            <span className="text-xs font-bold text-slate-600 mt-0.5 block">
              {lang === 'ar' ? trip.destinationStation.nameAr : trip.destinationStation.nameFr}
            </span>
          </div>
        </div>
      </div>

      {/* Direct vs Interline Layout */}
      {trip.type === 'direct' ? (
        <>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-1.5">
              <span>{t.duration}</span>
              <strong className="text-slate-900 font-bold font-mono tabular-nums">
                {trip.durationMinutes} min
              </strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span>{t.train}</span>
              <strong className="text-slate-900 font-bold font-mono">
                {trip.schedule.trainNumber}
              </strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 bg-slate-50 text-slate-700">
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
