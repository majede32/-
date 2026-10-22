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
  ArrowRight,
  ArrowLeft,
  Clock,
  ExternalLink,
  Filter,
  CheckCircle2,
  Calendar,
  Volume2,
  Share2,
  FileText,
  X,
  Compass,
  AlertCircle
} from 'lucide-react';
import { playRailwayChime } from '../utils/sound';

interface BusConnectionViewProps {
  lang: Language;
  currentTunisiaMinutes: number;
  currentDayOfWeek: number;
}

export const BusConnectionView: React.FC<BusConnectionViewProps> = ({
  lang,
  currentTunisiaMinutes,
  currentDayOfWeek
}) => {
  const t = TRANSLATIONS[lang];
  const [direction, setDirection] = useState<'tebourba_to_gobaa' | 'gobaa_to_tebourba'>('tebourba_to_gobaa');
  const [selectedLine, setSelectedLine] = useState<'all' | '42' | '116'>('all');
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);
  const [copiedTripId, setCopiedTripId] = useState<string | null>(null);

  const activeLineFilter = selectedLine === 'all' ? undefined : selectedLine;

  const connections: SynchronizedBusTrainConnection[] = useMemo(() => {
    if (direction === 'tebourba_to_gobaa') {
      return getSynchronizedDeparturesFromTebourba(currentTunisiaMinutes, activeLineFilter);
    } else {
      return getSynchronizedReturnsFromGobaa(currentTunisiaMinutes, activeLineFilter);
    }
  }, [direction, activeLineFilter, currentTunisiaMinutes]);

  // Next upcoming bus from current time
  const upcomingConnections = useMemo(() => {
    return connections.filter((c) => !c.isPassed);
  }, [connections]);

  const nextBus = upcomingConnections[0] || connections[0];

  const announceBusVoice = (conn: SynchronizedBusTrainConnection) => {
    playRailwayChime();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const dirText = conn.direction === 'to_gobaa'
          ? `Feeder bus line ${conn.busLine} to Gobaa station will depart from Tebourba at ${conn.busDeparture}. Transfer to RFR train at Gobaa.`
          : `Return bus line ${conn.busLine} to Tebourba will depart from Gobaa station at ${conn.busDeparture}.`;
        const utterance = new SpeechSynthesisUtterance(dirText);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
  };

  const handleShareBusTrip = (conn: SynchronizedBusTrainConnection) => {
    const text = `🚌 حافلة الترابط (الخط ${conn.busLine})\n📍 ${conn.direction === 'to_gobaa' ? 'طبربة ➔ محطة قطار القباعة ➔ تونس' : 'محطة قطار القباعة ➔ طبربة (عودة)'}\n⏰ انطلاق الحافلة: ${conn.busDeparture}\n🚆 القطار المترابط: ${conn.trainSchedule ? `قطار ${conn.trainSchedule.trainNumber} (${conn.trainDeparture})` : 'متوفر'}\n⏱️ المدة الإجمالية: ${conn.totalDurationMins} دقيقة`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedTripId(conn.busDeparture);
      setTimeout(() => setCopiedTripId(null), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-emerald-800 to-teal-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 end-0 -mt-8 -me-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-bold flex items-center gap-1.5">
                <Bus className="w-3.5 h-3.5" />
                <span>ولاية منوبة · معتمدية طبربة</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-semibold">
                الخط 42 و 116
              </span>
            </div>

            <button
              onClick={() => setIsPosterModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 border border-white/20"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-300" />
              <span>{t.viewBusOfficialDocument}</span>
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {t.busConnectionHeader}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl leading-relaxed">
            {t.busSubtitle} — خدمة نقل مدمجة تربط أهالي طبربة بوسط العاصمة تونس ومحطات منوبة وباردو عبر محطة قطار القباعة (الخط D).
          </p>
        </div>
      </div>

      {/* Direction & Line Selectors */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-4">
        {/* Direction Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setDirection('tebourba_to_gobaa')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              direction === 'tebourba_to_gobaa'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-4 h-4 text-emerald-600" />
            <span>{t.busDepartures}</span>
          </button>

          <button
            onClick={() => setDirection('gobaa_to_tebourba')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              direction === 'gobaa_to_tebourba'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bus className="w-4 h-4 text-teal-600" />
            <span>{t.busReturns}</span>
          </button>
        </div>

        {/* Line Filter */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>تصفية الخط:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedLine('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedLine === 'all'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل (24 سفرة)
            </button>
            <button
              onClick={() => setSelectedLine('42')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedLine === '42'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الخط 42
            </button>
            <button
              onClick={() => setSelectedLine('116')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedLine === '116'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الخط 116
            </button>
          </div>
        </div>
      </div>

      {/* Hero Next Bus Card */}
      {nextBus && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border-2 border-emerald-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                {nextBus.busLine}
              </span>
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  {direction === 'tebourba_to_gobaa' ? 'السفرة القادمة من طبربة' : 'سفرة العودة القادمة من القباعة'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  حافلة الخط {nextBus.busLine} (من الإثنين إلى السبت)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => announceBusVoice(nextBus)}
                title="إعلان صوتي"
                aria-label="إعلان صوتي للسفرة"
                className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors active:scale-95"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleShareBusTrip(nextBus)}
                title="مشاركة الموعد"
                aria-label="مشاركة الموعد"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors active:scale-95"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="py-4 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <span className="text-xs text-slate-500 block mb-1">
                {direction === 'tebourba_to_gobaa' ? 'انطلاق الحافلة من طبربة' : 'انطلاق حافلة العودة من القباعة'}
              </span>
              <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight" dir="ltr">
                {nextBus.busDeparture}
              </span>
            </div>

            <div className="text-end">
              <span className="text-xs text-slate-500 block mb-1">الوقت المتبقي</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
                {nextBus.remainingMinutesFromNow <= 0
                  ? 'تنطلق الآن!'
                  : `${Math.floor(nextBus.remainingMinutesFromNow / 60) > 0 ? `${Math.floor(nextBus.remainingMinutesFromNow / 60)} س ` : ''}${nextBus.remainingMinutesFromNow % 60} دق`}
              </span>
            </div>
          </div>

          {/* Synchronized Train Connection */}
          <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Train className="w-4 h-4 text-orange-600" />
                <span>{t.connectingTrainHeading}</span>
              </span>
              <span className="text-slate-500">
                المدة الإجمالية للرحلة: <strong>{nextBus.totalDurationMins} دق</strong>
              </span>
            </div>

            {nextBus.trainSchedule ? (
              <div className="flex items-center justify-between text-xs sm:text-sm font-mono font-bold text-slate-800 pt-1 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 font-sans text-[11px] block">
                    {direction === 'tebourba_to_gobaa' ? 'انطلاق القطار من القباعة' : 'انطلاق القطار من تونس'}
                  </span>
                  <span>{nextBus.trainDeparture}</span>
                  <span className="text-slate-500 font-sans text-xs ms-1">
                    (قطار {nextBus.trainSchedule.trainNumber})
                  </span>
                </div>

                <div className="text-center text-slate-400 font-sans text-xs">
                  {lang === 'ar' ? '⬅ تبديل بالرصيف 6 دق ⬅' : '➔ Transfer 6m ➔'}
                </div>

                <div className="text-end">
                  <span className="text-slate-400 font-sans text-[11px] block">
                    {direction === 'tebourba_to_gobaa' ? 'الوصول لتونس برشلونة' : 'الوصول للقباعة'}
                  </span>
                  <span>{nextBus.trainArrival}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                يصل الركاب لمحطة القباعة الساعة <strong>{nextBus.busArrival}</strong> ويكون الربط متاحاً مع رحلات القطار المتتالية.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Schedule List */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <span>
              {direction === 'tebourba_to_gobaa'
                ? 'جدول كافة سفرات الذهاب (طبربة ➔ القباعة)'
                : 'جدول كافة سفرات العودة (القباعة ➔ طبربة)'}
            </span>
          </h3>

          <span className="text-xs text-slate-500 font-semibold">
            {connections.length} سفرة
          </span>
        </div>

        <div className="space-y-2.5">
          {connections.map((c, idx) => (
            <div
              key={`${c.busLine}-${c.busDeparture}-${idx}`}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                c.isPassed
                  ? 'bg-slate-50/60 border-slate-200 text-slate-400 opacity-70'
                  : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                  c.busLine === '42'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-teal-100 text-teal-800'
                }`}>
                  الخط {c.busLine}
                </span>

                <div>
                  <div className="flex items-center gap-2 text-sm sm:text-base font-black font-mono">
                    <span dir="ltr">{c.busDeparture}</span>
                    <span className="text-slate-400 font-sans text-xs">
                      {lang === 'ar' ? '⬅ وصول' : '➔'}
                    </span>
                    <span dir="ltr">{c.busArrival}</span>
                  </div>

                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {c.direction === 'to_gobaa'
                      ? 'انطلاق من طبربة ➔ وصول محطة القباعة'
                      : 'انطلاق من محطة القباعة ➔ وصول طبربة'}
                  </span>
                </div>
              </div>

              {/* Connecting Train Info */}
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                {c.trainSchedule ? (
                  <div className="text-end">
                    <span className="text-[11px] text-slate-500 block">
                      قطار {c.trainSchedule.trainNumber} (الخط D)
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-orange-600" dir="ltr">
                      {c.trainDeparture} ➔ {c.trainArrival}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">قطار متوفر</span>
                )}

                <div className="text-end shrink-0">
                  <span className="text-xs font-bold text-slate-700 font-mono block">
                    {c.totalDurationMins} دق
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {c.isPassed ? 'مضت' : `بعد ${c.remainingMinutesFromNow} دق`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notice Card */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-800">{t.busNotice}</p>
          <p className="text-slate-500 leading-relaxed">
            تعمل هذه السفرات من يوم الإثنين إلى يوم السبت بنظام التنسيق المباشر مع محطة قطار RFR بالقباعة لتمكين المواطنين والطلبة من الوصول السريع والمريح.
          </p>
        </div>
      </div>

      {/* Official Poster Modal */}
      {isPosterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm sm:text-base font-bold text-white">
                  الجدول الرسمي الصادر عن معتمدية طبربة (خطوط 42 و 116)
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
