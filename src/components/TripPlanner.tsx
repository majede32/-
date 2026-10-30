import React from 'react';
import { Station } from '../data/rfrData';
import { TRANSLATIONS, Language } from '../data/translations';
import { useTripSearch } from '../hooks/useTripSearch';
import { StationSelectors } from './planner/StationSelectors';
import { NextTripHeroCard } from './planner/NextTripHeroCard';
import { FollowingTripsList } from './planner/FollowingTripsList';
import { TripTips } from './planner/TripTips';
import { TimetablePostersPreview } from './planner/TimetablePostersPreview';
import { Bell, Check, AlertCircle } from 'lucide-react';

interface TripPlannerProps {
  lang: Language;
  onOpenPosters: (lineId: string) => void;
  onSelectStationModal: (station: Station) => void;
  currentTunisiaMinutes: number;
  currentDayOfWeek: number;
  formattedDateStr: string;
  isSimulated: boolean;
  onOpenTimeModal: () => void;
  isHoliday?: boolean;
  isTomorrowHoliday?: boolean;
  routeOverride?: { from?: string; to?: string } | null;
  onTrackOnMap?: (trainNumber: string) => void;
}

export const TripPlanner: React.FC<TripPlannerProps> = ({
  lang,
  onOpenPosters,
  onSelectStationModal,
  currentTunisiaMinutes,
  currentDayOfWeek,
  isHoliday = false,
  isTomorrowHoliday = false,
  routeOverride,
  onTrackOnMap
}) => {
  const t = TRANSLATIONS[lang];

  const {
    selectedLineId,
    setSelectedLineId,
    fromStationId,
    setFromStationId,
    toStationId,
    setToStationId,
    fromStation,
    toStation,
    isCrossLine,
    nextTrip,
    followingTrips,
    isFavorite,
    toggleFavorite,
    handleSwapStations,
    showStops,
    setShowStops,
    reminderToast,
    copiedToast,
    handleSetReminder,
    handleShareTrip
  } = useTripSearch(currentTunisiaMinutes, currentDayOfWeek, lang, isHoliday, isTomorrowHoliday, routeOverride);

  return (
    <div className="space-y-6">
      {/* Toast Alert for Reminder */}
      {reminderToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 text-xs animate-bounce">
          <Bell className="w-4 h-4 text-orange-400" />
          <span>{reminderToast}</span>
        </div>
      )}

      {/* Toast Alert for Copied Share Link */}
      {copiedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-emerald-700 flex items-center gap-3 text-xs">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{t.tripCopied}</span>
        </div>
      )}

      {/* Station and Line Selectors Card */}
      <StationSelectors
        lang={lang}
        selectedLineId={selectedLineId}
        onSelectLine={setSelectedLineId}
        fromStationId={fromStationId}
        toStationId={toStationId}
        onSelectFrom={setFromStationId}
        onSelectTo={setToStationId}
        onSwap={handleSwapStations}
        fromStation={fromStation}
        toStation={toStation}
        isCrossLine={isCrossLine}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />

      {/* Main Next Trip Display or Empty State */}
      {nextTrip ? (
        <div className="space-y-5">
          <NextTripHeroCard
            trip={nextTrip}
            lang={lang}
            showStops={showStops}
            onToggleStops={() => setShowStops(!showStops)}
            onSetReminder={handleSetReminder}
            onShareTrip={handleShareTrip}
            onSelectStationModal={onSelectStationModal}
            onTrackOnMap={onTrackOnMap}
          />

          {/* Following Upcoming Departures */}
          <FollowingTripsList trips={followingTrips} lang={lang} />
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-3 shadow-xs">
          <AlertCircle className={`w-10 h-10 mx-auto ${fromStationId === 'tebourba_bus' || toStationId === 'tebourba_bus' ? 'text-amber-500' : 'text-slate-400'}`} />
          <h3 className="text-base font-bold text-slate-900">
            {fromStationId === 'tebourba_bus' || toStationId === 'tebourba_bus'
              ? (lang === 'ar' ? 'حافلات طبربة (42 و 116) ترتبط حصراً بمحطة القباعة' : 'Les bus de Tébourba (42 et 116) relient uniquement la Gare de Gobâa')
              : t.noMoreTrainsToday}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {fromStationId === 'tebourba_bus' || toStationId === 'tebourba_bus'
              ? (lang === 'ar'
                  ? 'خطوط الحافلات 42 و 116 مخصصة حصراً للربط بين معتمدية طبربة ومحطة قطار القباعة (ولا تخدم مباشرة المحطات الأخرى). يرجى اختيار محطة القباعة.'
                  : 'Les lignes 42 et 116 assurent exclusivement la liaison entre Tébourba et la Gare de Gobâa. Veuillez sélectionner la Gare de Gobâa.')
              : (lang === 'ar'
                  ? 'يرجى تغيير محطة الانطلاق أو الوصول، أو اختبار التوقيت عبر زر محاكاة الوقت.'
                  : 'Veuillez changer les stations ou simuler une autre heure.')}
          </p>
        </div>
      )}

      {/* Tips and Disclaimers */}
      <TripTips lang={lang} />

      {/* Official Poster Downloads Preview */}
      <TimetablePostersPreview lang={lang} onOpenPosters={onOpenPosters} />
    </div>
  );
};
