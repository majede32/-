import React from 'react';
import { LINES, Station } from '../data/rfrData';
import { TRANSLATIONS, Language } from '../data/translations';

interface NetworkMapProps {
  lang: Language;
  onSelectStation: (lineId: string, stationId: string, role: 'from' | 'to') => void;
  selectedStationId?: string;
}

export const NetworkMap: React.FC<NetworkMapProps> = ({
  lang,
  onSelectStation,
  selectedStationId
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.networkMapTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'ar'
              ? 'انقر على أي محطة لتعيينها كمحطة انطلاق أو وصول'
              : 'Cliquez sur une station pour la sélectionner comme départ ou arrivée'}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 ring-2 ring-blue-100 inline-block"></span>
            <span className="text-slate-700">Ligne A (الرياض)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 ring-2 ring-orange-100 inline-block"></span>
            <span className="text-slate-700">Ligne D (القباعة)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-100 inline-block"></span>
            <span className="text-slate-700">Ligne E (بوقطفة)</span>
          </div>
        </div>
      </div>

      {/* Schematic Diagram */}
      <div className="relative overflow-x-auto py-6">
        <div className="min-w-[680px] p-4 flex flex-col gap-8">

          {/* Line D (Orange) */}
          <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-orange-700">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px]">D</span>
                {lang === 'ar' ? 'الخط D : القباعة المدينة ⇄ تونس' : 'Ligne D : Gobaa Ville ⇄ Tunis'}
              </span>
              <span className="text-[11px] text-orange-600/80 font-medium">10 Stations · 26-30 min</span>
            </div>
            <div className="relative flex items-center justify-between">
              <div className="absolute top-1/2 left-4 right-4 h-1.5 bg-orange-400 -translate-y-1/2 rounded-full z-0" />
              {LINES.D.stations.map((st, i) => {
                const isSelected = selectedStationId === st.id;
                const isTerminal = i === 0 || i === LINES.D.stations.length - 1;
                return (
                  <div key={st.id} className="relative z-10 flex flex-col items-center group">
                    <button
                      onClick={() => onSelectStation('D', st.id, 'from')}
                      className={`w-4 h-4 rounded-full border-2 transition-transform duration-200 group-hover:scale-125 ${
                        isSelected
                          ? 'bg-orange-600 border-white ring-4 ring-orange-400'
                          : isTerminal
                          ? 'bg-white border-orange-600 ring-2 ring-orange-200'
                          : 'bg-white border-orange-400'
                      }`}
                      title={st.nameFr}
                    />
                    <span className="text-[10px] text-slate-700 font-medium mt-2 max-w-[62px] text-center leading-tight whitespace-normal">
                      {lang === 'ar' ? st.nameAr : st.nameFr}
                    </span>
                    {st.connections && st.connections.length > 0 && (
                      <span className="text-[8px] text-orange-600 font-bold bg-orange-100 px-1 rounded mt-0.5">
                        {st.connections[0]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Central Interchange Card - Tunis Barcelona */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-black border border-white/20">
                🚆
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t.hubBarcelona}</h3>
                <p className="text-xs text-slate-300">
                  {lang === 'ar'
                    ? 'تقاطع الخطوط الثلاثة A و D و E + ربط فوري بمحطات مترو تونس الكبرى'
                    : 'Pôle central d\'échange A, D, E + Métro Léger 1 à 6'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'TGM'].map((m) => (
                <span key={m} className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/15 text-white">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Line E (Green) */}
          <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">E</span>
                {lang === 'ar' ? 'الخط E : بوقطفة ⇄ تونس' : 'Ligne E : Bougatfa ⇄ Tunis'}
              </span>
              <span className="text-[11px] text-emerald-700/80 font-medium">7 Stations · 15 min</span>
            </div>
            <div className="relative flex items-center justify-between">
              <div className="absolute top-1/2 left-4 right-4 h-1.5 bg-emerald-400 -translate-y-1/2 rounded-full z-0" />
              {LINES.E.stations.map((st, i) => {
                const isSelected = selectedStationId === st.id;
                const isTerminal = i === 0 || i === LINES.E.stations.length - 1;
                return (
                  <div key={st.id} className="relative z-10 flex flex-col items-center group">
                    <button
                      onClick={() => onSelectStation('E', st.id, 'from')}
                      className={`w-4 h-4 rounded-full border-2 transition-transform duration-200 group-hover:scale-125 ${
                        isSelected
                          ? 'bg-emerald-600 border-white ring-4 ring-emerald-400'
                          : isTerminal
                          ? 'bg-white border-emerald-700 ring-2 ring-emerald-200'
                          : 'bg-white border-emerald-400'
                      }`}
                      title={st.nameFr}
                    />
                    <span className="text-[10px] text-slate-700 font-medium mt-2 max-w-[70px] text-center leading-tight whitespace-normal">
                      {lang === 'ar' ? st.nameAr : st.nameFr}
                    </span>
                    {st.connections && st.connections.length > 0 && (
                      <span className="text-[8px] text-emerald-700 font-bold bg-emerald-100 px-1 rounded mt-0.5">
                        {st.connections[0]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Line A (Blue) */}
          <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-blue-800">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">A</span>
                {lang === 'ar' ? 'الخط A : تونس ⇄ الرياض (الضاحية الجنوبية)' : 'Ligne A : Tunis ⇄ Erriadh (Banlieue Sud)'}
              </span>
              <span className="text-[11px] text-blue-700/80 font-medium">17 Stations · 40-45 min</span>
            </div>
            <div className="relative flex items-center justify-between overflow-x-auto pb-2">
              <div className="absolute top-1/2 left-4 right-4 h-1.5 bg-blue-400 -translate-y-1/2 rounded-full z-0" />
              {LINES.A.stations.map((st, i) => {
                const isSelected = selectedStationId === st.id;
                const isTerminal = i === 0 || i === LINES.A.stations.length - 1;
                return (
                  <div key={st.id} className="relative z-10 flex flex-col items-center group px-1">
                    <button
                      onClick={() => onSelectStation('A', st.id, 'from')}
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-transform duration-200 group-hover:scale-125 ${
                        isSelected
                          ? 'bg-blue-600 border-white ring-4 ring-blue-400'
                          : isTerminal
                          ? 'bg-white border-blue-700 ring-2 ring-blue-200'
                          : 'bg-white border-blue-400'
                      }`}
                      title={st.nameFr}
                    />
                    <span className="text-[9px] text-slate-700 font-medium mt-2 max-w-[50px] text-center leading-tight whitespace-normal">
                      {lang === 'ar' ? st.nameAr : st.nameFr}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
