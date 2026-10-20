import React from 'react';
import { TRANSLATIONS, Language } from '../../data/translations';
import { Train, Clock, Map, Ticket } from 'lucide-react';

interface BottomNavigationProps {
  lang: Language;
  activeTab: 'planner' | 'table' | 'map' | 'fares';
  onSelectTab: (tab: 'planner' | 'table' | 'map' | 'fares') => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  lang,
  activeTab,
  onSelectTab
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex items-center justify-around shadow-lg">
      <button
        onClick={() => onSelectTab('planner')}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
          activeTab === 'planner' ? 'text-orange-600 font-bold' : 'text-slate-500'
        }`}
      >
        <Train className="w-5 h-5" />
        <span className="text-[10px]">{t.plannerTab}</span>
      </button>

      <button
        onClick={() => onSelectTab('table')}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
          activeTab === 'table' ? 'text-orange-600 font-bold' : 'text-slate-500'
        }`}
      >
        <Clock className="w-5 h-5" />
        <span className="text-[10px]">{t.tableTab}</span>
      </button>

      <button
        onClick={() => onSelectTab('map')}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
          activeTab === 'map' ? 'text-orange-600 font-bold' : 'text-slate-500'
        }`}
      >
        <Map className="w-5 h-5" />
        <span className="text-[10px]">{t.mapTab}</span>
      </button>

      <button
        onClick={() => onSelectTab('fares')}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
          activeTab === 'fares' ? 'text-orange-600 font-bold' : 'text-slate-500'
        }`}
      >
        <Ticket className="w-5 h-5" />
        <span className="text-[10px]">{t.faresTab}</span>
      </button>
    </div>
  );
};
