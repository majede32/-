import React, { useState, useMemo } from 'react';
import { TRANSLATIONS, Language } from '../data/translations';
import {
  getSynchronizedDeparturesFromTebourba,
  getSynchronizedReturnsFromGobaa,
  SynchronizedBusTrainConnection
} from '../services/busTrainSyncService';
import {
  Bus,
  Train,
  Clock,
  Filter,
  Volume2,
  Share2,
  FileText,
  X,
  Compass,
  AlertCircle,
  Calendar,
  Info
} from 'lucide-react';
import { playRailwayChime, announceCustomStationVoice } from '../utils/sound';

interface BusConnectionViewProps {
  lang: Language;
  currentTunisiaMinutes: number;
  currentDayOfWeek: number;
  isHoliday?: boolean;
  isTomorrowHoliday?: boolean;
  isMondayHoliday?: boolean;
}

export const BusConnectionView: React.FC<BusConnectionViewProps> = ({
  lang,
  currentTunisiaMinutes,
  currentDayOfWeek,
  isHoliday = false,
  isTomorrowHoliday = false,
  isMondayHoliday = false
}) => {
  const t = TRANSLATIONS[lang];
  const [direction, setDirection] = useState<'tebourba_to_gobaa' | 'gobaa_to_tebourba'>('tebourba_to_gobaa');
  const [selectedLine, setSelectedLine] = useState<'all' | '42' | '116'>('all');
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);
  const [copiedTripId, setCopiedTripId] = useState<string | null>(null);

  const activeLineFilter = selectedLine === 'all' ? undefined : selectedLine;

  const isSunday = currentDayOfWeek === 0;

  // Use the authoritative synchronization engine with full day-of-week and holiday context
  const connections: SynchronizedBusTrainConnection[] = useMemo(() => {
    if (direction === 'tebourba_to_gobaa') {
      return getSynchronizedDeparturesFromTebourba(
        currentTunisiaMinutes,
        currentDayOfWeek,
        isHoliday,
        isTomorrowHoliday,
        isMondayHoliday,
        activeLineFilter
      );
    } else {
      return getSynchronizedReturnsFromGobaa(
        currentTunisiaMinutes,
        currentDayOfWeek,
        isHoliday,
        isTomorrowHoliday,
        isMondayHoliday,
        activeLineFilter
      );
    }
  }, [direction, activeLineFilter, currentTunisiaMinutes, currentDayOfWeek, isHoliday, isTomorrowHoliday, isMondayHoliday]);

  // Next upcoming trip from current time
  const upcomingConnections = useMemo(() => {
    return connections.filter((c) => !c.isPassed);
  }, [connections]);

  const nextBus = upcomingConnections[0] || connections[0];

  const announceBusVoice = (conn: SynchronizedBusTrainConnection) => {
    let announcementText = '';
    const langCode = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr-FR' : 'en-US';
    if (lang === 'ar') {
      if (conn.direction === 'to_gobaa') {
        announcementText = `حافلة الخط ${conn.busLine} تنطلق من طبربة الساعة ${conn.busDeparture} مع تبديل لقطار RFR بمحطة القباعة.`;
      } else {
        announcementText = conn.hasConnectingTrain
          ? `رحلة العودة لطبربة: قطار الخط D ينطلق من تونس الساعة ${conn.trainDeparture} ثم حافلة ${conn.busLine} من القباعة الساعة ${conn.busDeparture}.`
          : `حافلة العودة الخط ${conn.busLine} تنطلق من القباعة الساعة ${conn.busDeparture}.`;
      }
    } else if (lang === 'fr') {
      if (conn.direction === 'to_gobaa') {
        announcementText = `Bus ligne ${conn.busLine} au départ de Tébourba à ${conn.busDeparture}. Correspondance train RFR à Gobâa.`;
      } else {
        announcementText = conn.hasConnectingTrain
          ? `Retour à Tébourba : départ du train de Tunis à ${conn.trainDeparture}, puis bus ${conn.busLine} à Gobâa à ${conn.busDeparture}.`
          : `Bus retour ligne ${conn.busLine} au départ de Gobâa à ${conn.busDeparture}.`;
      }
    } else {
      if (conn.direction === 'to_gobaa') {
        announcementText = `Feeder bus line ${conn.busLine} leaves Tebourba at ${conn.busDeparture}. Transfer to RFR train at Gobaa.`;
      } else {
        announcementText = conn.hasConnectingTrain
          ? `Return to Tebourba: train departs Tunis at ${conn.trainDeparture}, connecting to bus ${conn.busLine} at Gobaa at ${conn.busDeparture}.`
          : `Return bus line ${conn.busLine} leaves Gobaa at ${conn.busDeparture}.`;
      }
    }

    announceCustomStationVoice(announcementText, langCode, 950);
  };

  const handleShareBusTrip = (conn: SynchronizedBusTrainConnection) => {
    const text = direction === 'tebourba_to_gobaa'
      ? `🚌 ${t.busTab} (${t.line} ${conn.busLine})\n📍 ${t.busDepartureFromTebourba}: ${conn.busDeparture}\n🚆 ${t.connectingTrainHeading}: ${conn.hasConnectingTrain ? `${t.trainNumberLabel} ${conn.trainSchedule?.trainNumber} (${conn.trainDeparture})` : t.noConnectingTrainForEarlyBus}\n⏱️ ${t.totalDurationLabel} ${conn.totalDurationMins} ${t.minutes}`
      : `🚌 ${t.busTab} (${t.line} ${conn.busLine} - عودة)\n🚆 ${t.trainDepartureFromTunis}: ${conn.trainDeparture || '—'}\n📍 ${t.busDepartureFromGobaa}: ${conn.busDeparture}\n⏱️ ${t.totalDurationLabel} ${conn.totalDurationMins} ${t.minutes}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedTripId(conn.id);
      setTimeout(() => setCopiedTripId(null), 2500);
    }
  };

  // Safe formatting helper to prevent RTL text reversals (e.g. "h 10 min 7" -> "7h 10m" or "7 س و10 دق")
  const renderRemainingTime = (mins: number) => {
    if (mins <= 0) {
      return <span>{t.departsNow}</span>;
    }
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) {
      return (
        <span className="inline-flex items-baseline gap-1" dir="ltr">
          <span className="font-mono">{h}</span>
          <span className="text-xs font-sans">{t.hours}</span>
          {m > 0 && (
            <>
              <span className="font-mono ms-1">{m}</span>
              <span className="text-xs font-sans">{t.minutes}</span>
            </>
          )}
        </span>
      );
    }
    return (
      <span className="inline-flex items-baseline gap-1" dir="ltr">
        <span className="font-mono">{m}</span>
        <span className="text-xs font-sans">{t.minutes}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-emerald-800 to-teal-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 end-0 -mt-8 -me-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-bold flex items-center gap-1.5">
                <Bus className="w-3.5 h-3.5 shrink-0" />
                <span>ولاية منوبة · معتمدية طبربة</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-semibold">
                {t.allTripsCount}
              </span>
            </div>

            <button
              onClick={() => setIsPosterModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 border border-white/20 shrink-0"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-300" />
              <span>{t.viewBusOfficialDocument}</span>
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {t.busConnectionHeader}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl leading-relaxed">
            {t.busSubtitle}
          </p>

          {/* Official Document Validity Badge */}
          <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-emerald-200/90">
            <Calendar className="w-3.5 h-3.5 shrink-0 text-emerald-300" />
            <span>{t.busPosterValidityNotice}</span>
          </div>
        </div>
      </div>

      {/* Sunday Service Alert Banner */}
      {isSunday && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-bold text-amber-900">
              {t.busNoSundayService}
            </p>
            <p className="text-amber-700 leading-relaxed">
              {t.nextMondayBus}
            </p>
          </div>
        </div>
      )}

      {/* Engineering Estimates Disclosure Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-slate-600">
          {t.busEstimatedDisclaimer}
        </p>
      </div>

      {/* Direction & Line Selectors */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-4">
        {/* Direction Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setDirection('tebourba_to_gobaa')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              direction === 'tebourba_to_gobaa'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">{t.busDepartures}</span>
          </button>

          <button
            onClick={() => setDirection('gobaa_to_tebourba')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              direction === 'gobaa_to_tebourba'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bus className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="truncate">{t.busReturns}</span>
          </button>
        </div>

        {/* Line Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>{t.filterLine}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedLine('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedLine === 'all'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.allTripsCount}
            </button>
            <button
              onClick={() => setSelectedLine('42')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedLine === '42'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.line42Only}
            </button>
            <button
              onClick={() => setSelectedLine('116')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedLine === '116'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.line116Only}
            </button>
          </div>
        </div>
      </div>

      {/* Hero Next Trip Card */}
      {nextBus && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border-2 border-emerald-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
                {nextBus.busLine}
              </span>
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  {direction === 'tebourba_to_gobaa'
                    ? t.nextBusDepartingFromTebourba
                    : t.nextBusDepartingFromGobaa}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {t.busLine} {nextBus.busLine} ({t.operatingDaysNotice})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => announceBusVoice(nextBus)}
                title={t.voiceAnnouncementTitle}
                aria-label={t.voiceAnnouncementTitle}
                className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors active:scale-95"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleShareBusTrip(nextBus)}
                title={t.shareBusTripTitle}
                aria-label={t.shareBusTripTitle}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors active:scale-95 relative"
              >
                <Share2 className="w-4 h-4" />
                {copiedTripId === nextBus.id && (
                  <span className="absolute -top-7 start-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap z-20">
                    {t.tripCopied}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Time & Countdown Section */}
          <div className="py-4 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <span className="text-xs text-slate-500 block mb-1">
                {direction === 'tebourba_to_gobaa'
                  ? t.busDepartureFromTebourba
                  : (nextBus.hasConnectingTrain ? t.trainDepartureFromTunis : t.busDepartureFromGobaa)}
              </span>
              <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight" dir="ltr">
                <bdi>{nextBus.firstLegDepartureTime}</bdi>
              </span>
              {direction === 'gobaa_to_tebourba' && nextBus.hasConnectingTrain && (
                <span className="text-[11px] text-slate-500 block mt-1">
                  {t.busDepartureFromGobaa}: <strong className="font-mono" dir="ltr">{nextBus.busDeparture}</strong>
                </span>
              )}
            </div>

            <div className="text-end">
              <span className="text-xs text-slate-500 block mb-1">{t.departsIn}</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700">
                {renderRemainingTime(nextBus.remainingMinutesFromNow)}
              </span>
              {nextBus.isNextDay && (
                <span className="text-[11px] text-amber-700 font-semibold block mt-0.5">
                  ({nextBus.isTomorrow && !isSunday ? t.tomorrow : t.nextMondayBus})
                </span>
              )}
            </div>
          </div>

          {/* Synchronized Train Connection Card */}
          <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between text-xs gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Train className="w-4 h-4 text-orange-600 shrink-0" />
                <span>{t.connectingTrainHeading}</span>
              </span>
              <span className="text-slate-500">
                {t.totalDurationLabel} <strong className="text-slate-800 font-mono" dir="ltr">{nextBus.totalDurationMins} {t.minutes}</strong>
              </span>
            </div>

            {nextBus.hasConnectingTrain && nextBus.trainSchedule ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm font-mono font-bold text-slate-800 pt-2 border-t border-slate-200 gap-2">
                <div>
                  <span className="text-slate-400 font-sans text-[11px] block">
                    {direction === 'tebourba_to_gobaa' ? t.trainDepartureFromGobaa : t.trainDepartureFromTunis}
                  </span>
                  <span dir="ltr"><bdi>{nextBus.trainDeparture}</bdi></span>
                  <span className="text-slate-500 font-sans text-xs ms-1">
                    ({t.trainNumberLabel} {nextBus.trainSchedule.trainNumber})
                  </span>
                </div>

                <div className="text-center text-slate-400 font-sans text-xs py-1 sm:py-0">
                  {lang === 'ar' ? '⬅ تبديل بالرصيف 6 دق ⬅' : '➔ Transfer 6m ➔'}
                </div>

                <div className="sm:text-end">
                  <span className="text-slate-400 font-sans text-[11px] block">
                    {direction === 'tebourba_to_gobaa' ? t.trainArrivalAtTunis : t.trainArrivalAtGobaa}
                  </span>
                  <span dir="ltr"><bdi>{nextBus.trainArrival}</bdi></span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-800 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80 leading-relaxed">
                {t.noConnectingTrainForEarlyBus}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Schedule List */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              {direction === 'tebourba_to_gobaa'
                ? t.scheduleDeparturesHeading
                : t.scheduleReturnsHeading}
            </span>
          </h3>

          <span className="text-xs text-slate-500 font-semibold">
            {connections.length} {t.tripsCount}
          </span>
        </div>

        <div className="space-y-2.5">
          {connections.map((c) => (
            <div
              key={c.id}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                c.isPassed
                  ? 'bg-slate-50/60 border-slate-200 text-slate-400 opacity-70'
                  : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 ${
                  c.busLine === '42'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-teal-100 text-teal-800'
                }`}>
                  {t.busLine} {c.busLine}
                </span>

                <div>
                  <div className="flex items-center gap-2 text-sm sm:text-base font-black font-mono">
                    <span dir="ltr"><bdi>{c.busDeparture}</bdi></span>
                    <span className="text-slate-400 font-sans text-xs">
                      {lang === 'ar' ? '⬅ وصول' : '➔'}
                    </span>
                    <span dir="ltr"><bdi>{c.busArrival}</bdi></span>
                  </div>

                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {c.direction === 'to_gobaa'
                      ? `${t.busDepartureFromTebourba} ➔ ${t.busArrivalAtGobaa}`
                      : `${t.busDepartureFromGobaa} ➔ ${t.busArrivalAtTebourba}`}
                  </span>
                </div>
              </div>

              {/* Connecting Train Info */}
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                {c.hasConnectingTrain && c.trainSchedule ? (
                  <div className="text-end">
                    <span className="text-[11px] text-slate-500 block">
                      {t.trainNumberLabel} {c.trainSchedule.trainNumber} ({t.lineDLabel})
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-orange-600" dir="ltr">
                      <bdi>{c.trainDeparture} ➔ {c.trainArrival}</bdi>
                    </span>
                  </div>
                ) : (
                  <div className="text-end">
                    <span className="text-[11px] text-slate-400 block italic">
                      {c.direction === 'return_to_tebourba' ? 'دون قطار متصل من تونس' : 'حافلة مباشرة'}
                    </span>
                  </div>
                )}

                <div className="text-end shrink-0">
                  <span className="text-xs font-bold text-slate-700 font-mono block" dir="ltr">
                    {c.totalDurationMins} {t.minutes}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {c.isPassed ? 'مضت' : renderRemainingTime(c.remainingMinutesFromNow)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official Poster Modal */}
      {isPosterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                <h4 className="text-sm sm:text-base font-bold text-white">
                  {t.officialPosterModalTitle}
                </h4>
              </div>
              <button
                onClick={() => setIsPosterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto flex flex-col items-center justify-center bg-slate-100">
              <img
                src="/assets/aistudio/FB_IMG_1756806164028_e8c7ff15.jpg"
                alt="تواقيت سفرات خط الترابط طبربة – القباعة الحافلات 42 و 116"
                className="max-w-full rounded-2xl shadow-lg border border-slate-300"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
