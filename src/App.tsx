/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { TRANSLATIONS, Language } from './data/translations';
import { Station } from './data/rfrData';
import { TripPlanner } from './components/TripPlanner';
import { Navbar } from './components/layout/Navbar';
import { HeroBanner } from './components/layout/HeroBanner';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { TimeSimulatorModal } from './components/time/TimeSimulatorModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { getTunisiaTime, TunisiaTimeInfo } from './utils/tunisiaTime';
import { checkTunisianHoliday } from './utils/tunisianHolidays';
import { usePWAInstall, useOnlineStatus } from './hooks/usePWAInstall';
import { WifiOff, Loader2 } from 'lucide-react';

// Code Splitting / Lazy Loading for heavy views and modals
const FullTimetable = lazy(() =>
  import('./components/FullTimetable').then((m) => ({ default: m.FullTimetable }))
);
const NetworkMap = lazy(() =>
  import('./components/NetworkMap').then((m) => ({ default: m.NetworkMap }))
);
const FaresCalculator = lazy(() =>
  import('./components/FaresCalculator').then((m) => ({ default: m.FaresCalculator }))
);
const OfficialPostersModal = lazy(() =>
  import('./components/OfficialPostersModal').then((m) => ({ default: m.OfficialPostersModal }))
);
const StationModal = lazy(() =>
  import('./components/StationModal').then((m) => ({ default: m.StationModal }))
);
const DownloadModal = lazy(() =>
  import('./components/DownloadModal').then((m) => ({ default: m.DownloadModal }))
);
const BusConnectionView = lazy(() =>
  import('./components/BusConnectionView').then((m) => ({ default: m.BusConnectionView }))
);

const ViewLoadingFallback = () => (
  <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 flex flex-col items-center justify-center gap-3 shadow-xs">
    <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
    <span className="text-xs font-semibold text-slate-500">جاري التحميل...</span>
  </div>
);

export default function App() {
  const [lang, setLang] = useState<Language>('ar');
  const [activeTab, setActiveTab] = useState<'planner' | 'table' | 'buses' | 'map' | 'fares'>('planner');

  // Time and Day simulation state (null = live Tunisia time and actual day)
  const [simulatedMinutes, setSimulatedMinutes] = useState<number | null>(null);
  const [simulatedDayOfWeek, setSimulatedDayOfWeek] = useState<number | null>(null);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Modals state
  const [posterModalLine, setPosterModalLine] = useState<string | null>(null);
  const [inspectedStation, setInspectedStation] = useState<Station | null>(null);

  const t = TRANSLATIONS[lang];
  const isOnline = useOnlineStatus();
  const { isInstallable, install } = usePWAInstall();

  // Sync HTML lang and dir attribute
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Live ticking clock in Tunisia timezone
  const [ticker, setTicker] = useState<number>(0);
  useEffect(() => {
    const timer = setInterval(() => setTicker((c) => c + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute Tunisia Time using Intl.DateTimeFormat (Africa/Tunis) + Holiday calendar
  const tunisiaTimeInfo: TunisiaTimeInfo = useMemo(() => {
    return getTunisiaTime(simulatedMinutes, simulatedDayOfWeek);
  }, [ticker, simulatedMinutes, simulatedDayOfWeek]);

  const formattedDateStr = useMemo(() => {
    if (lang === 'ar') return tunisiaTimeInfo.formattedDateAr;
    if (lang === 'fr') return tunisiaTimeInfo.formattedDateFr;
    return tunisiaTimeInfo.formattedDateEn;
  }, [tunisiaTimeInfo, lang]);

  const isSimulated = simulatedMinutes !== null || simulatedDayOfWeek !== null;

  const isTomorrowHoliday = useMemo(() => {
    const tomorrow = new Date(tunisiaTimeInfo.year, tunisiaTimeInfo.month - 1, tunisiaTimeInfo.day + 1);
    const check = checkTunisianHoliday(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate());
    return check.isHoliday;
  }, [tunisiaTimeInfo.year, tunisiaTimeInfo.month, tunisiaTimeInfo.day]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-100/70 text-slate-900 pb-24 md:pb-12">
        {/* Offline Banner Indicator */}
        {!isOnline && (
          <div className="bg-amber-600 text-white text-xs py-2 px-4 text-center font-bold flex items-center justify-center gap-2 shadow-xs">
            <WifiOff className="w-4 h-4 animate-pulse" />
            <span>{t.offlineAlert}</span>
          </div>
        )}

        {/* Modular Top Navigation Bar */}
        <Navbar
          lang={lang}
          onSetLang={setLang}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isInstallable={isInstallable}
          onInstall={install}
          onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="w-full max-w-6xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4 space-y-4 sm:space-y-5 overflow-x-hidden">
          {/* Hero Banner with Live / Simulated Clock */}
          <HeroBanner
            lang={lang}
            tunisiaTimeInfo={tunisiaTimeInfo}
            formattedDateStr={formattedDateStr}
            isSimulated={isSimulated}
            onResetSimulation={() => {
              setSimulatedMinutes(null);
              setSimulatedDayOfWeek(null);
            }}
            onOpenTimeModal={() => setIsTimeModalOpen(true)}
          />

          {/* Tab Views with Suspense Lazy Loading */}
          {activeTab === 'planner' && (
            <TripPlanner
              lang={lang}
              onOpenPosters={(lineId) => setPosterModalLine(lineId)}
              onSelectStationModal={(station) => setInspectedStation(station)}
              currentTunisiaMinutes={tunisiaTimeInfo.totalMinutes}
              currentDayOfWeek={tunisiaTimeInfo.dayOfWeek}
              formattedDateStr={formattedDateStr}
              isSimulated={isSimulated}
              onOpenTimeModal={() => setIsTimeModalOpen(true)}
              isHoliday={tunisiaTimeInfo.isHoliday}
              isTomorrowHoliday={isTomorrowHoliday}
            />
          )}

          {activeTab === 'table' && (
            <Suspense fallback={<ViewLoadingFallback />}>
              <FullTimetable lang={lang} />
            </Suspense>
          )}

          {activeTab === 'buses' && (
            <Suspense fallback={<ViewLoadingFallback />}>
              <BusConnectionView
                lang={lang}
                currentTunisiaMinutes={tunisiaTimeInfo.totalMinutes}
                currentDayOfWeek={tunisiaTimeInfo.dayOfWeek}
                isHoliday={tunisiaTimeInfo.isHoliday}
                isTomorrowHoliday={isTomorrowHoliday}
              />
            </Suspense>
          )}

          {activeTab === 'map' && (
            <Suspense fallback={<ViewLoadingFallback />}>
              <NetworkMap
                lang={lang}
                onSelectStation={(_lineId, _stationId, _role) => {
                  setActiveTab('planner');
                }}
              />
            </Suspense>
          )}

          {activeTab === 'fares' && (
            <Suspense fallback={<ViewLoadingFallback />}>
              <FaresCalculator lang={lang} />
            </Suspense>
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNavigation lang={lang} activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Time Simulator Modal */}
        <TimeSimulatorModal
          isOpen={isTimeModalOpen}
          onClose={() => setIsTimeModalOpen(false)}
          lang={lang}
          currentSimulatedMinutes={simulatedMinutes}
          currentSimulatedDayOfWeek={simulatedDayOfWeek}
          onApply={(mins, dow) => {
            setSimulatedMinutes(mins);
            setSimulatedDayOfWeek(dow);
          }}
          onReset={() => {
            setSimulatedMinutes(null);
            setSimulatedDayOfWeek(null);
          }}
        />

        {/* Lazy Loaded Modals */}
        <Suspense fallback={null}>
          {posterModalLine && (
            <OfficialPostersModal
              isOpen={Boolean(posterModalLine)}
              onClose={() => setPosterModalLine(null)}
              defaultLine={posterModalLine}
              lang={lang}
            />
          )}

          {inspectedStation && (
            <StationModal
              station={inspectedStation}
              onClose={() => setInspectedStation(null)}
              lang={lang}
              onSetAsOrigin={(_st: Station) => {
                setInspectedStation(null);
                setActiveTab('planner');
              }}
              onSetAsDestination={(_st: Station) => {
                setInspectedStation(null);
                setActiveTab('planner');
              }}
            />
          )}

          {isDownloadModalOpen && (
            <DownloadModal
              isOpen={isDownloadModalOpen}
              onClose={() => setIsDownloadModalOpen(false)}
              lang={lang}
            />
          )}
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
