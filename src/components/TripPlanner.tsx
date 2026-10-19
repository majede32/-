import React, { useState, useMemo, useEffect } from 'react';
import {
  LINES,
  ALL_SCHEDULES,
  Station,
  TrainSchedule,
  parseTimeToMinutes,
  formatMinutesToTime
} from '../data/rfrData';
import { TRANSLATIONS, Language } from '../data/translations';
import { playRailwayChime } from '../utils/sound';
import {
  ArrowUpDown,
  Clock,
  Calendar,
  Volume2,
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  Share2,
  Star,
  MapPin,
  Train as TrainIcon,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface TripPlannerProps {
  lang: Language;
  onOpenPosters: (lineId: string) => void;
  onSelectStationModal: (station: Station) => void;
  simulatedTimeMinutes: number | null; // null means live time
  onResetToLiveTime: () => void;
  onSetSimulatedTime: (minutes: number) => void;
}

export interface ComputedTrip {
  schedule: TrainSchedule;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  remainingMinutes: number;
  originStation: Station;
  destinationStation: Station;
  intermediateStops: { station: Station; time: string; passed: boolean }[];
  isNextDay?: boolean;
}

export const TripPlanner: React.FC<TripPlannerProps> = ({
  lang,
  onOpenPosters,
  onSelectStationModal,
  simulatedTimeMinutes,
  onResetToLiveTime,
  onSetSimulatedTime
}) => {
  const t = TRANSLATIONS[lang];

  // Selected line and stations
  const [selectedLineId, setSelectedLineId] = useState<string>('D');
  const [fromStationId, setFromStationId] = useState<string>('gobaa');
  const [toStationId, setToStationId] = useState<string>('tunis');
  const [showStops, setShowStops] = useState<boolean>(true);
  const [expandedTrainId, setExpandedTrainId] = useState<string | null>(null);

  // User interactions
  const [favorites, setFavorites] = useState<{ lineId: string; from: string; to: string }[]>(() => {
    try {
      const saved = localStorage.getItem('rfr_fav_routes');
      return saved ? JSON.parse(saved) : [
        { lineId: 'D', from: 'gobaa', to: 'tunis' },
        { lineId: 'E', from: 'bougatfa', to: 'tunis' },
        { lineId: 'A', from: 'erriadh', to: 'tunis_ville' }
      ];
    } catch {
      return [{ lineId: 'D', from: 'gobaa', to: 'tunis' }];
    }
  });

  const [reminderTrain, setReminderTrain] = useState<string | null>(null);
  const [reminderToast, setReminderToast] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  // Real-time Tunisia clock (UTC+1)
  const [nowDate, setNowDate] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute Tunisia Time (UTC+1, no DST in Tunisia)
  const tunisiaDate = useMemo(() => {
    const utcTime = nowDate.getTime() + nowDate.getTimezoneOffset() * 60000;
    return new Date(utcTime + 3600000 * 1);
  }, [nowDate]);

  const currentTunisiaMinutes = useMemo(() => {
    if (simulatedTimeMinutes !== null) return simulatedTimeMinutes;
    return tunisiaDate.getHours() * 60 + tunisiaDate.getMinutes();
  }, [simulatedTimeMinutes, tunisiaDate]);

  const currentDayOfWeek = useMemo(() => {
    return tunisiaDate.getDay(); // 0 is Sunday, 1 is Monday, etc.
  }, [tunisiaDate]);

  const activeLine = LINES[selectedLineId];

  // Ensure from and to stations belong to the current line
  useEffect(() => {
    const stIds = activeLine.stations.map((s) => s.id);
    if (!stIds.includes(fromStationId)) {
      setFromStationId(activeLine.stations[0].id);
    }
    if (!stIds.includes(toStationId)) {
      setToStationId(activeLine.stations[activeLine.stations.length - 1].id);
    }
  }, [selectedLineId]);

  // Swap origin and destination
  const handleSwapStations = () => {
    const temp = fromStationId;
    setFromStationId(toStationId);
    setToStationId(temp);
  };

  // Find trips between fromStation and toStation
  const allEligibleTrips: ComputedTrip[] = useMemo(() => {
    const trips: ComputedTrip[] = [];

    for (const schedule of ALL_SCHEDULES) {
      if (schedule.lineId !== selectedLineId) continue;

      // Check day eligibility
      const isSunday = currentDayOfWeek === 0;
      const isSaturday = currentDayOfWeek === 6;

      let runsToday = false;
      if (schedule.days === '-') {
        runsToday = true;
      } else if (schedule.days === 'A') {
        runsToday = !isSunday;
      } else if (schedule.days === 'B') {
        runsToday = isSunday;
      } else if (schedule.days === 'C') {
        runsToday = !isSunday && !isSaturday;
      } else if (schedule.days === 'D') {
        runsToday = !isSaturday;
      }

      if (!runsToday) continue;

      const fromIndex = schedule.stops.findIndex((s) => s.stationId === fromStationId);
      const toIndex = schedule.stops.findIndex((s) => s.stationId === toStationId);

      // Must stop at both, and fromIndex < toIndex
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
        const depTime = schedule.stops[fromIndex].time;
        const arrTime = schedule.stops[toIndex].time;
        const depMinutes = parseTimeToMinutes(depTime);
        const arrMinutes = parseTimeToMinutes(arrTime);

        let duration = arrMinutes - depMinutes;
        if (duration < 0) duration += 1440;

        let remaining = depMinutes - currentTunisiaMinutes;
        let isNextDay = false;

        if (remaining < 0) {
          // Already passed today
          remaining += 1440;
          isNextDay = true;
        }

        // Build intermediate stops
        const slicedStops = schedule.stops.slice(fromIndex, toIndex + 1);
        const intermediateStops = slicedStops.map((st) => {
          const stationObj = activeLine.stations.find((s) => s.id === st.stationId) || {
            id: st.stationId,
            nameAr: st.stationId,
            nameFr: st.stationId,
            nameEn: st.stationId,
            lineId: selectedLineId,
            order: 0
          };
          const stopM = parseTimeToMinutes(st.time);
          const passed = currentTunisiaMinutes > stopM;
          return {
            station: stationObj,
            time: st.time,
            passed
          };
        });

        const originSt = activeLine.stations.find((s) => s.id === fromStationId)!;
        const destSt = activeLine.stations.find((s) => s.id === toStationId)!;

        trips.push({
          schedule,
          departureTime: depTime,
          arrivalTime: arrTime,
          durationMinutes: duration,
          remainingMinutes: remaining,
          originStation: originSt,
          destinationStation: destSt,
          intermediateStops,
          isNextDay
        });
      }
    }

    // Sort by remaining minutes (closest train first)
    trips.sort((a, b) => a.remainingMinutes - b.remainingMinutes);
    return trips;
  }, [selectedLineId, fromStationId, toStationId, currentTunisiaMinutes, currentDayOfWeek, activeLine]);

  const nextTrip = allEligibleTrips[0];
  const followingTrips = allEligibleTrips.slice(1, 7);

  // Format remaining time nicely
  const formatRemaining = (mins: number) => {
    if (mins <= 0) return t.departsNow;
    if (mins < 60) return `${mins} ${t.minutes}`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} ${t.hours} ${m} ${t.minutes}` : `${h} ${t.hours}`;
  };

  // Toggle favorite
  const isFavorite = favorites.some(
    (f) => f.lineId === selectedLineId && f.from === fromStationId && f.to === toStationId
  );

  const toggleFavorite = () => {
    let nextFavs;
    if (isFavorite) {
      nextFavs = favorites.filter(
        (f) => !(f.lineId === selectedLineId && f.from === fromStationId && f.to === toStationId)
      );
    } else {
      nextFavs = [...favorites, { lineId: selectedLineId, from: fromStationId, to: toStationId }];
    }
    setFavorites(nextFavs);
    try {
      localStorage.setItem('rfr_fav_routes', JSON.stringify(nextFavs));
    } catch {}
  };

  // Set alert reminder
  const handleSetReminder = (trip: ComputedTrip) => {
    playRailwayChime();
    setReminderTrain(trip.schedule.trainNumber);
    const alertMsg = t.reminderAlert
      .replace('{train}', trip.schedule.trainNumber)
      .replace('{time}', trip.departureTime);
    setReminderToast(alertMsg);
    setTimeout(() => setReminderToast(null), 5000);
  };

  // Share trip details
  const handleShareTrip = (trip: ComputedTrip) => {
    const text = `${t.appTitle} 🚆: ${lang === 'ar' ? trip.originStation.nameAr : trip.originStation.nameFr} ➔ ${lang === 'ar' ? trip.destinationStation.nameAr : trip.destinationStation.nameFr} (${trip.departureTime} ➔ ${trip.arrivalTime}, ${t.train} ${trip.schedule.trainNumber})`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {reminderToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 text-xs animate-bounce">
          <Bell className="w-4 h-4 text-orange-400" />
          <span>{reminderToast}</span>
        </div>
      )}

      {copiedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-emerald-700 flex items-center gap-3 text-xs">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{t.tripCopied}</span>
        </div>
      )}

      {/* Main Trip Configurator Card (Aesthetic matching screenshot) */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 space-y-6">
        
        {/* Line Selector Buttons */}
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
            {t.line}
          </span>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {Object.values(LINES).map((line) => {
              const isSelected = selectedLineId === line.id;
              return (
                <button
                  key={line.id}
                  onClick={() => setSelectedLineId(line.id)}
                  className={`p-3 sm:p-4 rounded-2xl border-2 transition-all text-center flex flex-col items-center justify-center gap-1.5 ${
                    isSelected
                      ? `${line.activeBorder} bg-white shadow-md scale-[1.02]`
                      : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 text-slate-600'
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm shadow-xs"
                    style={{ backgroundColor: line.bgHex }}
                  >
                    {line.code}
                  </span>
                  <span className="text-xs font-bold text-slate-900 line-clamp-1">
                    {lang === 'ar' ? line.nameAr : line.nameFr}
                  </span>
                  <span className="text-[10px] text-slate-700 font-semibold truncate max-w-full">
                    {lang === 'ar' ? line.terminusAr : line.terminusFr}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stations Dropdowns with Swap Button */}
        <div className="space-y-3 relative">
          {/* Origin Dropdown */}
          <div className="relative">
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              {t.from}
            </label>
            <div className="relative">
              <select
                value={fromStationId}
                onChange={(e) => setFromStationId(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
              >
                {activeLine.stations.map((st) => (
                  <option key={st.id} value={st.id}>
                    {lang === 'ar' ? st.nameAr : st.nameFr}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-4 pointer-events-none" />
            </div>
          </div>

          {/* Swap Button (Floating circle like screenshot) */}
          <div className="flex justify-end -my-2 relative z-10 px-4">
            <button
              onClick={handleSwapStations}
              aria-label={t.swap}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md hover:shadow-lg hover:border-orange-500 hover:text-orange-600 flex items-center justify-center text-slate-600 transition-all duration-200 active:scale-90"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          {/* Destination Dropdown */}
          <div className="relative">
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              {t.to}
            </label>
            <div className="relative">
              <select
                value={toStationId}
                onChange={(e) => setToStationId(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
              >
                {activeLine.stations.map((st) => (
                  <option key={st.id} value={st.id}>
                    {lang === 'ar' ? st.nameAr : st.nameFr}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-4 pointer-events-none" />
            </div>
          </div>

          {/* Quick Route Shortcuts & Favorite Button */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => {
                  setFromStationId(activeLine.stations[0].id);
                  setToStationId(activeLine.stations[activeLine.stations.length - 1].id);
                }}
                className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
              >
                {lang === 'ar' ? activeLine.stations[0].nameAr : activeLine.stations[0].nameFr} ➔ تونس
              </button>
              <button
                onClick={() => {
                  setFromStationId(activeLine.stations[activeLine.stations.length - 1].id);
                  setToStationId(activeLine.stations[0].id);
                }}
                className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
              >
                تونس ➔ {lang === 'ar' ? activeLine.stations[0].nameAr : activeLine.stations[0].nameFr}
              </button>
            </div>

            <button
              onClick={toggleFavorite}
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1 text-xs font-semibold ${
                isFavorite
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
              <span className="hidden sm:inline">{isFavorite ? t.savedFavorite : t.saveFavorite}</span>
            </button>
          </div>
        </div>

      </div>

      {/* NEXT TRAIN HERO CARD (Exact aesthetic from user screenshot) */}
      {nextTrip ? (
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 space-y-5">
          
          {/* Header Row: Winter timetable tag & sound chime button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                {t.winterTimetable}
              </span>
              {nextTrip.isNextDay && (
                <span className="text-[11px] font-semibold text-slate-500">
                  ({t.firstTrainTomorrow} {nextTrip.departureTime})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={playRailwayChime}
                title="Play railway arrival chime"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSetReminder(nextTrip)}
                title={t.remindMe}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  reminderTrain === nextTrip.schedule.trainNumber
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <Bell className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleShareTrip(nextTrip)}
                title={t.shareTrip}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Huge Countdown Display (Like screenshot) */}
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
              {t.nextTrain}
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-sm font-semibold text-slate-600">{t.departsIn}</span>
              <span className="text-4xl sm:text-5xl font-black text-amber-700 tracking-tight font-mono tabular-nums">
                {nextTrip.remainingMinutes <= 0
                  ? t.departsNow
                  : nextTrip.remainingMinutes < 60
                  ? `${nextTrip.remainingMinutes} min`
                  : `${Math.floor(nextTrip.remainingMinutes / 60)} h ${nextTrip.remainingMinutes % 60} min`}
              </span>
            </div>
          </div>

          {/* Time & Route Banner Card (Screenshot exact box) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-100/80 flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <div>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums block">
                  {nextTrip.departureTime}
                </span>
                <span className="text-xs font-bold text-slate-600 mt-0.5 block">
                  {lang === 'ar' ? nextTrip.originStation.nameAr : nextTrip.originStation.nameFr}
                </span>
              </div>

              <div className="text-amber-700 font-black text-xl px-1">
                ➔
              </div>

              <div>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums block">
                  {nextTrip.arrivalTime}
                </span>
                <span className="text-xs font-bold text-slate-600 mt-0.5 block">
                  {lang === 'ar' ? nextTrip.destinationStation.nameAr : nextTrip.destinationStation.nameFr}
                </span>
              </div>
            </div>
          </div>

          {/* Duration & Train Number Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-1.5">
              <span>{t.duration}</span>
              <strong className="text-slate-900 font-bold font-mono tabular-nums">
                {nextTrip.durationMinutes} min
              </strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span>{t.train}</span>
              <strong className="text-slate-900 font-bold font-mono">
                {nextTrip.schedule.trainNumber}
              </strong>
            </div>
          </div>

          {/* Stops on this trip (Collapsible Vertical Timeline like Screenshot 1) */}
          <div>
            <button
              onClick={() => setShowStops(!showStops)}
              className="w-full flex items-center justify-between py-1 text-xs font-bold text-slate-800 hover:text-orange-600 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                {showStops ? <ChevronUp className="w-4 h-4 text-orange-600" /> : <ChevronDown className="w-4 h-4 text-orange-600" />}
                {t.stopsOnThisTrip} ({nextTrip.intermediateStops.length})
              </span>
              <span className="text-[11px] text-slate-600 font-semibold font-mono">
                {nextTrip.departureTime} ➔ {nextTrip.arrivalTime}
              </span>
            </button>

            {showStops && (
              <div className="mt-4 pr-3 pl-1 py-1 space-y-0 relative">
                {/* Vertical connecting line */}
                <div
                  className="absolute top-3 bottom-3 right-[18px] w-0.5 border-r-2 border-dashed"
                  style={{ borderColor: activeLine.bgHex }}
                />

                {nextTrip.intermediateStops.map((item, index) => {
                  const isFirst = index === 0;
                  const isLast = index === nextTrip.intermediateStops.length - 1;

                  return (
                    <div
                      key={item.station.id}
                      className="relative flex items-center justify-between py-2.5 z-10 hover:bg-slate-50/60 rounded-xl px-2 transition-colors cursor-pointer"
                      onClick={() => onSelectStationModal(item.station)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Dot indicator */}
                        {isFirst || isLast ? (
                          <div
                            className="w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center shrink-0"
                            style={{ borderColor: activeLine.bgHex }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeLine.bgHex }} />
                          </div>
                        ) : (
                          <div
                            className="w-3 h-3 rounded-full shrink-0 mx-0.5"
                            style={{ backgroundColor: activeLine.bgHex }}
                          />
                        )}

                        <span
                          className={`text-xs ${
                            isFirst || isLast
                              ? 'font-black text-slate-900 text-sm'
                              : 'font-semibold text-slate-700'
                          }`}
                        >
                          {lang === 'ar' ? item.station.nameAr : item.station.nameFr}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.station.connections && item.station.connections.length > 0 && (
                          <span className="hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {item.station.connections[0]}
                          </span>
                        )}
                        <span
                          className={`text-xs font-mono tabular-nums ${
                            isFirst || isLast ? 'font-black text-slate-900' : 'text-slate-600'
                          }`}
                        >
                          {item.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FOLLOWING TRAINS (Screenshot cards layout) */}
          {followingTrips.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                {t.followingTrains}
              </span>

              <div className="space-y-2.5">
                {followingTrips.map((ft) => {
                  const isExpanded = expandedTrainId === ft.schedule.trainNumber;

                  return (
                    <div
                      key={ft.schedule.trainNumber}
                      className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all space-y-2"
                    >
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedTrainId(isExpanded ? null : ft.schedule.trainNumber)}
                      >
                        <div>
                          <div className="flex items-center gap-2 text-sm font-black text-slate-900 font-mono tabular-nums">
                            <span>{ft.departureTime}</span>
                            <span className="text-slate-400 font-sans">➔</span>
                            <span>{ft.arrivalTime}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>{t.train} {ft.schedule.trainNumber}</span>
                            <span>·</span>
                            <span>{ft.durationMinutes} min</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold text-amber-700 block font-mono tabular-nums">
                            {t.in} {formatRemaining(ft.remainingMinutes)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {ft.schedule.days === '-' ? t.allDays : ft.schedule.days === 'A' ? t.weekdaysOnly : t.sundaysOnly}
                          </span>
                        </div>
                      </div>

                      {/* Expandable stops breakdown */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-200/60 text-xs">
                          <div className="flex items-center justify-between mb-2 text-slate-500 font-semibold text-[11px]">
                            <span>{t.stopsOnThisTrip}:</span>
                            <button
                              onClick={() => handleSetReminder(ft)}
                              className="text-orange-600 font-bold flex items-center gap-1 hover:underline"
                            >
                              <Bell className="w-3 h-3" />
                              {t.remindMe}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono">
                            {ft.intermediateStops.map((st) => (
                              <div key={st.station.id} className="p-1.5 bg-white rounded-lg border border-slate-100 flex items-center justify-between">
                                <span className="font-sans truncate text-slate-700">
                                  {lang === 'ar' ? st.station.nameAr : st.station.nameFr}
                                </span>
                                <span className="font-bold text-slate-900 ml-1">{st.time}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">{t.noMoreTrainsToday}</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {lang === 'ar'
              ? 'يرجى تغيير محطة الانطلاق أو الوصول، أو التأكد من مواعيد أيام الأحد والأعياد.'
              : 'Veuillez changer les stations ou consulter la grille horaire complète pour les prochains départs.'}
          </p>
        </div>
      )}

      {/* GOOD TO KNOW SECTION (Screenshot exact design) */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          {t.goodToKnow}
        </h3>

        {/* Tip Box */}
        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/50 flex items-center gap-3 text-xs font-bold text-amber-900">
          <span className="text-lg">ℹ️</span>
          <span>
            {lang === 'ar' ? 'رحلة مريحة وممتعة على متن قطارات RFR 🚆' : 'Have a nice trip 🚆'}
          </span>
        </div>

        {/* Bullet points */}
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed pr-1">
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
            <span>{t.tip1}</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
            <span>{t.tip2}</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
            <span>{t.tip3}</span>
          </div>
        </div>
      </div>

      {/* DOWNLOAD TIMETABLES SECTION (Screenshot exact cards) */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          {t.downloadTimetables}
        </h3>

        <div className="space-y-3">
          {/* Line A Card */}
          <div
            onClick={() => onOpenPosters('A')}
            className="p-4 rounded-2xl border border-blue-200/80 bg-blue-50/30 hover:bg-blue-50/60 cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                A
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {t.lineATimetable}
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">1.1 MB · WEBP / PDF</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600 group-hover:border-blue-500 transition-colors">
              ➔
            </div>
          </div>

          {/* Line D Card */}
          <div
            onClick={() => onOpenPosters('D')}
            className="p-4 rounded-2xl border border-orange-200/80 bg-orange-50/30 hover:bg-orange-50/60 cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-sm shadow-xs">
                D
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-orange-700 transition-colors">
                  {t.lineDTimetable}
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">633 KB · WEBP / PDF</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-orange-600 group-hover:border-orange-500 transition-colors">
              ➔
            </div>
          </div>

          {/* Line E Card */}
          <div
            onClick={() => onOpenPosters('E')}
            className="p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/30 hover:bg-emerald-50/60 cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                E
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {t.lineETimetable}
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">629 KB · WEBP / PDF</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-emerald-600 group-hover:border-emerald-500 transition-colors">
              ➔
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
          Source: official SNCFT posters. Unofficial app, not affiliated with SNCFT.
        </p>
      </div>

    </div>
  );
};
