/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { TRANSLATIONS, Language } from './data/translations';
import { LINES, Station, formatMinutesToTime } from './data/rfrData';
import { TripPlanner } from './components/TripPlanner';
import { FullTimetable } from './components/FullTimetable';
import { NetworkMap } from './components/NetworkMap';
import { FaresCalculator } from './components/FaresCalculator';
import { OfficialPostersModal } from './components/OfficialPostersModal';
import { StationModal } from './components/StationModal';
import {
  Train,
  Clock,
  Calendar,
  Map,
  Ticket,
  Sliders,
  Globe,
  RefreshCw,
  X,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

// Hero image generated for Tunis RFR
import heroTrainImage from './assets/images/hero_tunis_rfr_train_1792429855777.jpg';

export default function App() {
  const [lang, setLang] = useState<Language>('ar');
  const [activeTab, setActiveTab] = useState<'planner' | 'table' | 'map' | 'fares'>('planner');

  // Time simulation state (null = live Tunisia time)
  // Default to 18:08 (like user screenshot) or live time!
  const [simulatedMinutes, setSimulatedMinutes] = useState<number | null>(null);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);

  // Modals
  const [posterModalLine, setPosterModalLine] = useState<string | null>(null);
  const [inspectedStation, setInspectedStation] = useState<Station | null>(null);

  const t = TRANSLATIONS[lang];

  // Sync HTML lang and dir attribute
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Live ticking clock in Tunisia timezone (UTC+1)
  const [nowDate, setNowDate] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNowDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute current Tunisia time
  const currentTunisiaDate = useMemo(() => {
    const utcTime = nowDate.getTime() + nowDate.getTimezoneOffset() * 60000;
    return new Date(utcTime + 3600000 * 1);
  }, [nowDate]);

  const liveMinutes = currentTunisiaDate.getHours() * 60 + currentTunisiaDate.getMinutes();
  const effectiveMinutes = simulatedMinutes !== null ? simulatedMinutes : liveMinutes;

  const formattedClockTime = useMemo(() => {
    const h = Math.floor(effectiveMinutes / 60).toString().padStart(2, '0');
    const m = (effectiveMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }, [effectiveMinutes]);

  const formattedDateStr = useMemo(() => {
    // e.g. Mon 19 Oct
    return currentTunisiaDate.toLocaleDateString(lang === 'ar' ? 'ar-TN' : lang === 'fr' ? 'fr-TN' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }, [currentTunisiaDate, lang]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-24 md:pb-12">
      
      {/* TOP BAR CONTRACT: Single text Brand Wordmark | 4 nav links | 1 primary action */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
              <Train className="w-5 h-5" />
            </div>
            <button
              onClick={() => setActiveTab('planner')}
              className="text-lg font-black tracking-tight text-slate-900 hover:text-orange-600 transition-colors whitespace-nowrap"
            >
              {lang === 'ar' ? 'قطار التالي · RFR تونس' : 'Next Train · RFR Tunis'}
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab('planner')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap pb-1 ${
                activeTab === 'planner' ? 'text-orange-600 border-b-2 border-orange-500' : ''
              }`}
            >
              {t.plannerTab}
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap pb-1 ${
                activeTab === 'table' ? 'text-orange-600 border-b-2 border-orange-500' : ''
              }`}
            >
              {t.tableTab}
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap pb-1 ${
                activeTab === 'map' ? 'text-orange-600 border-b-2 border-orange-500' : ''
              }`}
            >
              {t.mapTab}
            </button>
            <button
              onClick={() => setActiveTab('fares')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap pb-1 ${
                activeTab === 'fares' ? 'text-orange-600 border-b-2 border-orange-500' : ''
              }`}
            >
              {t.faresTab}
            </button>
          </nav>

          {/* Zone 3: Language & Download Action */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Download Project ZIP */}
            <a
              href="/tunis-rfr-timetables.zip"
              download="tunis-rfr-timetables.zip"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
              title={lang === 'ar' ? 'تحميل كامل المشروع كملف ZIP' : 'Télécharger le code source (ZIP)'}
            >
              <span>{lang === 'ar' ? 'تحميل المشروع (ZIP)' : 'Code ZIP'}</span>
            </a>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
              <button
                onClick={() => setLang('ar')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                  lang === 'ar' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                عربي
              </button>
              <button
                onClick={() => setLang('fr')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                  lang === 'fr' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                FR
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                  lang === 'en' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 space-y-6">

        {/* HERO BANNER (Matches user screenshot 5 aesthetic with real Tunis RFR photography) */}
        <div className="relative rounded-3xl overflow-hidden shadow-sm border border-slate-200 bg-slate-900 min-h-[200px] sm:min-h-[220px] flex flex-col justify-end p-5 sm:p-7 text-white">
          {/* Background Image with Fallback */}
          <img
            src={heroTrainImage}
            alt="Modern Tunis RFR Commuter Train"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-70"
          />
          {/* Gradient Scrim */}
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

            {/* Time Indicator & Simulator Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white font-mono tabular-nums">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{t.tunisiaTime}</span>
                <span className="text-slate-300">·</span>
                <span className="font-sans">{formattedDateStr}</span>
                <span className="text-slate-300">·</span>
                <span className="font-bold text-amber-300">{formattedClockTime}</span>
              </div>

              {simulatedMinutes !== null ? (
                <button
                  onClick={() => setSimulatedMinutes(null)}
                  className="px-2.5 py-1 rounded-full bg-orange-500/80 hover:bg-orange-500 text-white font-sans text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  {lang === 'ar' ? 'الرجوع للتوقيت الفعلي' : 'Retour à l\'heure réelle'}
                </button>
              ) : (
                <button
                  onClick={() => setIsTimeModalOpen(true)}
                  className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white font-sans text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <Clock className="w-3 h-3" />
                  {t.customTimeBtn}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* View Switcher Tabs (Desktop / Tablet) */}
        <div className="hidden md:flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setActiveTab('planner')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'planner'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Train className="w-4 h-4" />
            {t.plannerTab}
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'table'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            {t.tableTab}
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'map'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Map className="w-4 h-4" />
            {t.mapTab}
          </button>
          <button
            onClick={() => setActiveTab('fares')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'fares'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Ticket className="w-4 h-4" />
            {t.faresTab}
          </button>
        </div>

        {/* Active Tab View */}
        {activeTab === 'planner' && (
          <TripPlanner
            lang={lang}
            onOpenPosters={(line) => setPosterModalLine(line)}
            onSelectStationModal={(station) => setInspectedStation(station)}
            simulatedTimeMinutes={simulatedMinutes}
            onResetToLiveTime={() => setSimulatedMinutes(null)}
            onSetSimulatedTime={(m) => setSimulatedMinutes(m)}
          />
        )}

        {activeTab === 'table' && (
          <FullTimetable lang={lang} />
        )}

        {activeTab === 'map' && (
          <NetworkMap
            lang={lang}
            onSelectStation={(lineId, stationId, role) => {
              setActiveTab('planner');
            }}
          />
        )}

        {activeTab === 'fares' && (
          <FaresCalculator lang={lang} />
        )}

        {/* Footer Note */}
        <footer className="text-center text-xs text-slate-500 py-6 px-4 space-y-2 border-t border-slate-200/60 mt-12">
          <p className="max-w-xl mx-auto leading-relaxed">
            {t.unofficialNotice}
          </p>
          <p className="text-[11px] text-slate-400">
            Réseau Ferroviaire Rapide de Tunis (RFR) · Société Nationale des Chemins de Fer Tunisiens (SNCFT) · 2026–2027
          </p>
        </footer>

      </main>

      {/* MOBILE FIXED BOTTOM TAB BAR (Pattern 1 from mobile touch guidelines) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-4 items-center h-16 px-1">
        <button
          onClick={() => setActiveTab('planner')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'planner' ? 'text-orange-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Train className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">{lang === 'ar' ? 'الرحلات' : 'Trajets'}</span>
        </button>

        <button
          onClick={() => setActiveTab('table')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'table' ? 'text-orange-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">{lang === 'ar' ? 'الجداول' : 'Horaires'}</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'map' ? 'text-orange-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Map className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">{lang === 'ar' ? 'المخطط' : 'Plan'}</span>
        </button>

        <button
          onClick={() => setActiveTab('fares')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'fares' ? 'text-orange-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Ticket className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">{lang === 'ar' ? 'الأسعار' : 'Tarifs'}</span>
        </button>
      </div>

      {/* MODAL: Official Posters Reproduction */}
      <OfficialPostersModal
        isOpen={posterModalLine !== null}
        onClose={() => setPosterModalLine(null)}
        lang={lang}
        defaultLine={posterModalLine || 'D'}
      />

      {/* MODAL: Station Inspection */}
      <StationModal
        station={inspectedStation}
        onClose={() => setInspectedStation(null)}
        lang={lang}
        onSetAsOrigin={(st) => {
          // Handled inside planner
        }}
        onSetAsDestination={(st) => {
          // Handled inside planner
        }}
      />

      {/* MODAL: Time Simulation Modal */}
      {isTimeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                {t.selectTime}
              </h3>
              <button
                onClick={() => setIsTimeModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {lang === 'ar'
                ? 'يمكنك اختبار التطبيق وتصفح الرحلات في أي ساعة من اليوم (مثلاً 18:08 كالصورة التوضيحية أو 07:30 لساعات الذروة الصباحية).'
                : 'Simulez les départs à toute heure de la journée (ex: 18:08 ou heure de pointe 07:30).'}
            </p>

            {/* Quick time buttons */}
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <button
                onClick={() => {
                  setSimulatedMinutes(18 * 60 + 8); // 18:08 (like screenshot!)
                  setIsTimeModalOpen(false);
                }}
                className="p-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-bold hover:bg-amber-100"
              >
                18:08 (مثال)
              </button>
              <button
                onClick={() => {
                  setSimulatedMinutes(7 * 60 + 30); // 07:30 Morning rush
                  setIsTimeModalOpen(false);
                }}
                className="p-2 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200"
              >
                07:30
              </button>
              <button
                onClick={() => {
                  setSimulatedMinutes(12 * 60 + 15); // 12:15 Noon
                  setIsTimeModalOpen(false);
                }}
                className="p-2 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200"
              >
                12:15
              </button>
            </div>

            {/* Custom Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                {lang === 'ar' ? 'أو أدخل وقتاً محدداً :' : 'Ou entrez une heure précise :'}
              </label>
              <input
                type="time"
                defaultValue={formatMinutesToTime(effectiveMinutes)}
                onChange={(e) => {
                  if (e.target.value) {
                    const [h, m] = e.target.value.split(':').map(Number);
                    setSimulatedMinutes(h * 60 + m);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center font-mono font-bold text-base focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  setSimulatedMinutes(null);
                  setIsTimeModalOpen(false);
                }}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
              >
                {t.nowTimeBtn}
              </button>
              <button
                onClick={() => setIsTimeModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white transition-colors"
              >
                {lang === 'ar' ? 'تطبيق' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
