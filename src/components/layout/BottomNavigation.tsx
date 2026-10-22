import React from 'react';
import { TRANSLATIONS, Language } from '../../data/translations';
import { Train, Clock, Map, Ticket, Bus } from 'lucide-react';

interface BottomNavigationProps {
  lang: Language;
  activeTab: 'planner' | 'table' | 'buses' | 'map' | 'fares';
  onSelectTab: (tab: 'planner' | 'table' | 'buses' | 'map' | 'fares') => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  lang,
  activeTab,
  onSelectTab
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <nav aria-label="شريط التنقل السفلي" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 pt-2 safe-area-bottom flex items-center justify-around shadow-lg select-none">
      <button
        onClick={() => onSelectTab('planner')}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all active:scale-95 ${
          activeTab === 'planner' ? 'text-orange-600 font-bold' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Train className="w-5 h-5" />
        <span className="text-[10px]">{t.plannerTab}</span>
      </button>

      <button
        onClick={() => onSelectTab('buses')}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all active:scale-95 ${
          activeTab === 'buses' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Bus className="w-5 h-5" />
        <span className="text-[10px]">{t.busTab}</span>
      </button>

      <button
        onClick={() => onSelectTab('table')}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all active:scale-95 ${
          activeTab === 'table' ? 'text-orange-600 font-bold' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Clock className="w-5 h-5" />
        <span className="text-[10px]">{t.tableTab}</span>
      </button>

      <button
        onClick={() => onSelectTab('map')}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all active:scale-95 ${
          activeTab === 'map' ? 'text-orange-600 font-bold' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Map className="w-5 h-5" />
        <span className="text-[10px]">{t.mapTab}</span>
      </button>

      <button
        onClick={() => onSelectTab('fares')}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all active:scale-95 ${
          activeTab === 'fares' ? 'text-orange-600 font-bold' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Ticket className="w-5 h-5" />
        <span className="text-[10px]">{t.faresTab}</span>
      </button>
    </nav>
  );
};
