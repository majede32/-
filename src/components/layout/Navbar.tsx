import React from 'react';
import { TRANSLATIONS, Language } from '../../data/translations';
import { Train, Download, Smartphone } from 'lucide-react';

interface NavbarProps {
  lang: Language;
  onSetLang: (lang: Language) => void;
  activeTab: 'planner' | 'table' | 'map' | 'fares';
  onSelectTab: (tab: 'planner' | 'table' | 'map' | 'fares') => void;
  isInstallable: boolean;
  onInstall: () => void;
  onOpenDownloadModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onSetLang,
  activeTab,
  onSelectTab,
  isInstallable,
  onInstall,
  onOpenDownloadModal
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
            <Train className="w-5 h-5" />
          </div>
          <button
            onClick={() => onSelectTab('planner')}
            className="text-lg font-black tracking-tight text-slate-900 hover:text-orange-600 transition-colors whitespace-nowrap"
          >
            {lang === 'ar' ? 'قطار التالي · RFR تونس' : 'Next Train · RFR Tunis'}
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
          <button
            onClick={() => onSelectTab('planner')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap pb-1 ${
              activeTab === 'planner' ? 'text-orange-600 border-b-2 border-orange-500' : ''
            }`}
          >
            {t.plannerTab}
          </button>
          <button
            onClick={() => onSelectTab('table')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap pb-1 ${
              activeTab === 'table' ? 'text-orange-600 border-b-2 border-orange-500' : ''
            }`}
          >
            {t.tableTab}
          </button>
          <button
            onClick={() => onSelectTab('map')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap pb-1 ${
              activeTab === 'map' ? 'text-orange-600 border-b-2 border-orange-500' : ''
            }`}
          >
            {t.mapTab}
          </button>
          <button
            onClick={() => onSelectTab('fares')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap pb-1 ${
              activeTab === 'fares' ? 'text-orange-600 border-b-2 border-orange-500' : ''
            }`}
          >
            {t.faresTab}
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Install PWA Button if available */}
          {isInstallable && (
            <button
              onClick={onInstall}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
              title={t.installPWA}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تثبيت التطبيق' : 'Installer'}</span>
            </button>
          )}

          {/* Download Project ZIP */}
          <button
            onClick={onOpenDownloadModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
            title={lang === 'ar' ? 'تحميل كامل المشروع كملف ZIP' : 'Télécharger le code source (ZIP)'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'تحميل المشروع' : 'Code ZIP'}</span>
          </button>

          {/* Language Switcher */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            <button
              onClick={() => onSetLang('ar')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                lang === 'ar'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              عربي
            </button>
            <button
              onClick={() => onSetLang('fr')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                lang === 'fr'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              FR
            </button>
            <button
              onClick={() => onSetLang('en')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                lang === 'en'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
