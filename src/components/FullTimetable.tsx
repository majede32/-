import React, { useState, useMemo } from 'react';
import { LINES, ALL_SCHEDULES, TrainSchedule, DaysType } from '../data/rfrData';
import { TRANSLATIONS, Language } from '../data/translations';
import { Search, Filter, Clock, Train as TrainIcon, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';

interface FullTimetableProps {
  lang: Language;
  initialLineId?: string;
}

export const FullTimetable: React.FC<FullTimetableProps> = ({ lang, initialLineId = 'D' }) => {
  const t = TRANSLATIONS[lang];
  const [selectedLine, setSelectedLine] = useState<string>(initialLineId);
  const [direction, setDirection] = useState<'outbound' | 'inbound'>('outbound');
  const [filterDays, setFilterDays] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentLine = LINES[selectedLine];

  const filteredSchedules = useMemo(() => {
    return ALL_SCHEDULES.filter((s) => {
      if (s.lineId !== selectedLine) return false;
      if (s.direction !== direction) return false;

      // Filter by days
      if (filterDays === 'weekdays') {
        if (s.days === 'B') return false; // B is Sunday/fêtes only
      } else if (filterDays === 'sundays') {
        if (s.days === 'A' || s.days === 'C' || s.days === 'D') return false;
      }

      // Filter by search query (train number)
      if (searchQuery.trim()) {
        return s.trainNumber.includes(searchQuery.trim());
      }

      return true;
    }).sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  }, [selectedLine, direction, filterDays, searchQuery]);

  const getDaysBadge = (days: DaysType) => {
    switch (days) {
      case '-':
        return { label: t.allDays, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'A':
        return { label: t.weekdaysOnly, bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'B':
        return { label: t.sundaysOnly, bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'C':
        return { label: t.exceptSatSun, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'D':
        return { label: t.exceptSat, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
      default:
        return { label: days, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  // Determine stations along this line and direction
  const displayStations = useMemo(() => {
    const list = [...currentLine.stations];
    return direction === 'outbound' ? list : list.reverse();
  }, [currentLine, direction]);

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-700" />
            {t.tableTab} · {lang === 'ar' ? currentLine.nameAr : currentLine.nameFr}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'جدول الشتاء الرسمي 2026-2027 الصادر عن الشركة الوطنية للسكك الحديدية التونسية'
              : 'Grille horaire officielle Hiver 2026-2027 (SNCFT / Banlieue de Tunis)'}
          </p>
        </div>

        {/* Line Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl self-start">
          {Object.values(LINES).map((line) => (
            <button
              key={line.id}
              onClick={() => setSelectedLine(line.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedLine === line.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: line.bgHex }}
              />
              {line.code} · {lang === 'ar' ? line.terminusAr : line.terminusFr}
            </button>
          ))}
        </div>
      </div>

      {/* Direction & Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Direction Switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setDirection('outbound')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              direction === 'outbound' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <span>{lang === 'ar' ? currentLine.terminusAr : currentLine.terminusFr}</span>
            {lang === 'ar' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            <span>تونس (Tunis)</span>
          </button>
          <button
            onClick={() => setDirection('inbound')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              direction === 'inbound' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <span>تونس (Tunis)</span>
            {lang === 'ar' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            <span>{lang === 'ar' ? currentLine.terminusAr : currentLine.terminusFr}</span>
          </button>
        </div>

        {/* Days Filter */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setFilterDays('all')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterDays === 'all' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
            }`}
          >
            {t.filterAll}
          </button>
          <button
            onClick={() => setFilterDays('weekdays')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterDays === 'weekdays' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
            }`}
          >
            {t.filterWeekdays}
          </button>
          <button
            onClick={() => setFilterDays('sundays')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterDays === 'sundays' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
            }`}
          >
            {t.filterSundays}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchTrainNum}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-3 pr-9 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>
      </div>

      {/* Summary count */}
      <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
        <span>
          {lang === 'ar'
            ? `عدد الرحلات المتاحة: ${filteredSchedules.length} قطار`
            : `${filteredSchedules.length} trains trouvés`}
        </span>
        <span className="text-[11px] text-slate-400">
          {lang === 'ar' ? 'أوقات الإقلاع والوصول دقيقة' : 'Horaires conformes aux affiches'}
        </span>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[560px] scrollbar-thin">
        <table className="w-full text-right text-xs border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-20 border-b border-slate-200 shadow-sm text-slate-700">
            <tr>
              <th className="py-3 px-3 font-bold text-center w-16">
                {lang === 'ar' ? 'رقم القطار' : 'N° Train'}
              </th>
              <th className="py-3 px-3 font-bold text-center w-24">
                {lang === 'ar' ? 'أيام السير' : 'Circulation'}
              </th>
              {displayStations.map((st) => (
                <th key={st.id} className="py-3 px-2 font-semibold text-center min-w-[70px]">
                  <span className="block">{lang === 'ar' ? st.nameAr : st.nameFr}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
            {filteredSchedules.length === 0 ? (
              <tr>
                <td colSpan={displayStations.length + 2} className="py-12 text-center text-slate-400 font-sans">
                  {lang === 'ar' ? 'لا توجد قطارات مطابقة للبحث' : 'Aucun train trouvé avec ces critères'}
                </td>
              </tr>
            ) : (
              filteredSchedules.map((train, idx) => {
                const badge = getDaysBadge(train.days);
                const isEven = idx % 2 === 0;

                return (
                  <tr
                    key={train.trainNumber}
                    className={`hover:bg-orange-50/40 transition-colors ${isEven ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <td className="py-2.5 px-3 font-bold text-center text-slate-900 bg-slate-50/70 border-r border-slate-100">
                      <span className="px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-800 text-[11px]">
                        {train.trainNumber}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-sans">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] border ${badge.bg}`}>
                        {train.days === '-' ? 'Tous' : train.days}
                      </span>
                    </td>
                    {displayStations.map((st) => {
                      const stop = train.stops.find((s) => s.stationId === st.id);
                      const isOrigin = train.stops[0]?.stationId === st.id;
                      const isDest = train.stops[train.stops.length - 1]?.stationId === st.id;

                      return (
                        <td
                          key={st.id}
                          className={`py-2 px-1 text-center text-[11px] ${
                            isOrigin || isDest ? 'font-bold text-slate-900 bg-amber-50/30' : 'text-slate-600'
                          }`}
                        >
                          {stop ? stop.time : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend for Days */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600">
        <div><strong className="text-slate-900">(-):</strong> {t.allDays}</div>
        <div><strong className="text-slate-900">(A):</strong> {t.weekdaysOnly}</div>
        <div><strong className="text-slate-900">(B):</strong> {t.sundaysOnly}</div>
        <div><strong className="text-slate-900">(C):</strong> {t.exceptSatSun}</div>
        <div><strong className="text-slate-900">(D):</strong> {t.exceptSat}</div>
      </div>
    </div>
  );
};
