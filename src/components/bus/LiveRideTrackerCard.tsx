import React, { useMemo } from 'react';
import { TRANSLATIONS, Language } from '../../data/translations';
import {
  TEBOURBA_BUS_STATION,
  TUNIS_CENTRAL_ID,
  findStationById,
  formatMinutesToTime,
  parseTimeToMinutes
} from '../../data/rfrData';
import { BUS_ESTIMATED_TRANSIT_MINUTES, ActiveBusRide } from '../../data/busConnectionData';
import { SynchronizedBusTrainConnection } from '../../services/busTrainSyncService';
import { findDirectTrips } from '../../services/tripSearchEngine';
import { calculateRouteProgressAndEta } from '../../utils/geo';
import { GeolocationState } from '../../hooks/useGeolocation';
import {
  Navigation,
  Bus,
  Train,
  Clock,
  Gauge,
  MapPin,
  Radio,
  Square,
  CheckCircle2,
  AlertCircle,
  Map as MapIcon,
  ExternalLink
} from 'lucide-react';

interface LiveRideTrackerCardProps {
  lang: Language;
  connections: SynchronizedBusTrainConnection[];
  selectedBusId: string;
  onSelectBusId: (id: string) => void;
  direction: 'tebourba_to_gobaa' | 'gobaa_to_tebourba';
  currentTunisiaMinutes: number;
  currentDayOfWeek: number;
  isHoliday?: boolean;
  geo: GeolocationState;
  onUpdateBusRide?: (ride: ActiveBusRide | null) => void;
  onOpenMap?: () => void;
}

export const LiveRideTrackerCard: React.FC<LiveRideTrackerCardProps> = ({
  lang,
  connections,
  selectedBusId,
  onSelectBusId,
  direction,
  currentTunisiaMinutes,
  currentDayOfWeek,
  isHoliday = false,
  geo,
  onUpdateBusRide,
  onOpenMap
}) => {
  const t = TRANSLATIONS[lang];

  const activeTrip = useMemo(() => {
    return connections.find((c) => c.id === selectedBusId) || connections[0];
  }, [connections, selectedBusId]);

  const originStation = direction === 'tebourba_to_gobaa'
    ? TEBOURBA_BUS_STATION
    : findStationById('gobaa') || TEBOURBA_BUS_STATION;

  const destStation = direction === 'tebourba_to_gobaa'
    ? findStationById('gobaa') || TEBOURBA_BUS_STATION
    : TEBOURBA_BUS_STATION;

  // Schedule-based progress calculation
  const scheduleStatus = useMemo(() => {
    if (!activeTrip) return null;
    const depM = parseTimeToMinutes(activeTrip.busDeparture);
    const arrM = depM + BUS_ESTIMATED_TRANSIT_MINUTES;

    if (currentTunisiaMinutes >= depM && currentTunisiaMinutes <= arrM) {
      const elapsed = currentTunisiaMinutes - depM;
      const remaining = arrM - currentTunisiaMinutes;
      const progressPct = Math.round((elapsed / BUS_ESTIMATED_TRANSIT_MINUTES) * 100);
      return {
        phase: 'in_progress' as const,
        remainingMins: remaining,
        progressPct,
        depTime: activeTrip.busDeparture,
        arrTime: activeTrip.busArrival,
        arrM
      };
    }

    if (currentTunisiaMinutes < depM) {
      return {
        phase: 'before_departure' as const,
        minsUntilDeparture: depM - currentTunisiaMinutes,
        remainingMins: BUS_ESTIMATED_TRANSIT_MINUTES,
        progressPct: 0,
        depTime: activeTrip.busDeparture,
        arrTime: activeTrip.busArrival,
        arrM
      };
    }

    return {
      phase: 'after_arrival' as const,
      remainingMins: 0,
      progressPct: 100,
      depTime: activeTrip.busDeparture,
      arrTime: activeTrip.busArrival,
      arrM
    };
  }, [activeTrip, currentTunisiaMinutes]);

  // Live GPS calculation
  const gpsProgress = useMemo(() => {
    if (
      !geo.coords ||
      typeof originStation.lat !== 'number' ||
      typeof originStation.lng !== 'number' ||
      typeof destStation.lat !== 'number' ||
      typeof destStation.lng !== 'number'
    ) {
      return null;
    }

    return calculateRouteProgressAndEta(
      geo.coords.lat,
      geo.coords.lng,
      originStation.lat,
      originStation.lng,
      destStation.lat,
      destStation.lng,
      geo.coords.speed,
      lang
    );
  }, [geo.coords, originStation, destStation, lang]);

  // Expected arrival minute at destination station (prefers live GPS ETA when active, else scheduled arrival)
  const expectedArrivalMinute = useMemo(() => {
    if (gpsProgress) {
      return (currentTunisiaMinutes + gpsProgress.etaMinutes) % 1440;
    }
    return scheduleStatus ? scheduleStatus.arrM % 1440 : currentTunisiaMinutes + BUS_ESTIMATED_TRANSIT_MINUTES;
  }, [gpsProgress, currentTunisiaMinutes, scheduleStatus]);

  const expectedArrivalClock = formatMinutesToTime(expectedArrivalMinute);

  // Next connecting Line D trains departing Gobâa after user arrives
  const upcomingGobaaTrains = useMemo(() => {
    if (direction !== 'tebourba_to_gobaa') return [];
    const baseMin = gpsProgress
      ? (currentTunisiaMinutes + gpsProgress.etaMinutes) % 1440
      : (scheduleStatus?.arrM ?? currentTunisiaMinutes + 40) % 1440;

    const trains = findDirectTrips(
      'gobaa',
      TUNIS_CENTRAL_ID,
      'D',
      baseMin,
      currentDayOfWeek,
      lang,
      isHoliday,
      false
    );

    return trains.filter((tr) => !tr.isNextDay).slice(0, 3);
  }, [direction, gpsProgress, currentTunisiaMinutes, scheduleStatus, currentDayOfWeek, lang, isHoliday]);

  if (!activeTrip) return null;

  const displayedProgress = gpsProgress
    ? gpsProgress.progressPercent
    : scheduleStatus?.progressPct ?? 0;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 text-white rounded-3xl p-4 sm:p-6 shadow-xl border border-emerald-700/50 space-y-4">
      {/* Top Header & GPS Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            {geo.isWatching ? (
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            ) : (
              <Navigation className="w-5 h-5 text-emerald-300" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white">{t.liveRideTitle}</h3>
              {geo.isWatching && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  {t.trackingActive}
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-200/80 mt-0.5">{t.liveRideSubtitle}</p>
          </div>
        </div>

        {/* Start / Stop GPS Tracking Button */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {!geo.isWatching ? (
            <button
              type="button"
              onClick={() => {
                onUpdateBusRide?.({
                  busId: activeTrip.id,
                  line: activeTrip.busLine,
                  direction,
                  departureTime: activeTrip.busDeparture,
                  isUserOnBoard: true
                });
                geo.startWatching();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg transition-all active:scale-95"
            >
              <Navigation className="w-4 h-4" />
              <span>{t.startGpsTracking}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                geo.stopWatching();
                onUpdateBusRide?.(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/40 font-bold text-xs transition-all active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{t.stopGpsTracking}</span>
            </button>
          )}

          {onOpenMap && (
            <button
              type="button"
              onClick={() => {
                onUpdateBusRide?.({
                  busId: activeTrip.id,
                  line: activeTrip.busLine,
                  direction,
                  departureTime: activeTrip.busDeparture,
                  isUserOnBoard: true
                });
                if (!geo.isWatching) {
                  geo.startWatching();
                }
                onOpenMap();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/15 font-bold text-xs transition-all active:scale-95"
            >
              <MapIcon className="w-3.5 h-3.5 text-amber-300" />
              <span>{t.viewMyLocationOnMap}</span>
            </button>
          )}
        </div>
      </div>

      {/* Bus Trip Selector ("I am on bus 06:15") */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white/5 border border-white/10 rounded-2xl p-3">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-200">
          <Bus className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{t.selectMyBusTrip}</span>
        </div>

        <select
          value={activeTrip.id}
          onChange={(e) => onSelectBusId(e.target.value)}
          aria-label={t.selectMyBusTrip}
          className="bg-slate-900/90 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {connections.map((conn) => (
            <option key={conn.id} value={conn.id}>
              {lang === 'ar'
                ? `حافلة ${conn.busLine} — انطلاق ${conn.busDeparture} (وصول ${conn.busArrival})`
                : `Bus ${conn.busLine} — Départ ${conn.busDeparture} (Arrivée ${conn.busArrival})`}
            </option>
          ))}
        </select>
      </div>

      {/* Live GPS Error Warning if Permission Denied */}
      {geo.error && (
        <div className="bg-amber-500/15 border border-amber-400/40 text-amber-200 rounded-2xl p-3 flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{t.locationPermissionError}</span>
        </div>
      )}

      {/* Telemetry Metrics Grid (Live GPS vs Schedule) */}
      {gpsProgress ? (
        <div className="space-y-3">
          {gpsProgress.arrived && (
            <div className="bg-emerald-500 text-slate-950 rounded-2xl p-3 flex items-center gap-2 text-xs font-black shadow-md">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>
                {direction === 'tebourba_to_gobaa' ? t.arrivedAtStationMsg : t.arrivedAtTebourbaMsg}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Remaining Distance */}
            <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-2xl p-3">
              <span className="text-[10px] text-emerald-200/80 font-semibold block">
                {t.remainingDistanceToStation}
              </span>
              <span className="text-lg sm:text-xl font-black text-white font-mono mt-0.5 block">
                {gpsProgress.formattedDistanceToDest}
              </span>
            </div>

            {/* Remaining Time (ETA) */}
            <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-2xl p-3">
              <span className="text-[10px] text-emerald-200 font-semibold block">
                {t.remainingTimeToStation}
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-300 mt-0.5 block">
                {gpsProgress.formattedEta}
              </span>
            </div>

            {/* Expected Clock Arrival */}
            <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-2xl p-3">
              <span className="text-[10px] text-emerald-200/80 font-semibold block">
                {t.expectedArrivalAtStation}
              </span>
              <span className="text-lg sm:text-xl font-black text-amber-300 font-mono mt-0.5 block" dir="ltr">
                {expectedArrivalClock}
              </span>
            </div>

            {/* Speed */}
            <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-2xl p-3">
              <span className="text-[10px] text-emerald-200/80 font-semibold flex items-center gap-1">
                <Gauge className="w-3 h-3 text-emerald-400" />
                <span>{t.currentSpeedLabel}</span>
              </span>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-white font-mono" dir="ltr">
                  {gpsProgress.speedKmh} <span className="text-xs font-sans">كم/س</span>
                </span>
              </div>
              <span className="text-[9px] text-emerald-300/80 block">
                {gpsProgress.isLiveSpeed ? t.gpsLiveSpeedTag : t.estimatedSpeedTag}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Pre-GPS Schedule View (Always available even before user enables GPS) */
        <div className="bg-white/10 border border-white/10 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{t.scheduleStatusLabel} ({t.busLine} {activeTrip.busLine} · {activeTrip.busDeparture})</span>
            </span>
            <p className="text-xs text-white/90 font-medium">
              {scheduleStatus?.phase === 'in_progress'
                ? t.busInProgressSchedule.replace('{mins}', String(scheduleStatus.remainingMins))
                : scheduleStatus?.phase === 'before_departure'
                ? t.busScheduledNotStarted
                    .replace('{time}', activeTrip.busDeparture)
                    .replace('{mins}', String(scheduleStatus.minsUntilDeparture))
                : t.busAlreadyArrivedSchedule.replace('{time}', activeTrip.busArrival)}
            </p>
          </div>

          <div className="text-end shrink-0">
            <span className="text-[10px] text-emerald-200/80 block">{t.expectedArrivalAtStation}</span>
            <span className="text-xl font-black text-amber-300 font-mono" dir="ltr">
              {activeTrip.busArrival}
            </span>
          </div>
        </div>
      )}

      {/* Route Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-200">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-400" />
            {lang === 'ar' ? originStation.nameAr : originStation.nameFr} ({activeTrip.busDeparture})
          </span>
          <span className="font-mono text-amber-300">{displayedProgress}%</span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-orange-400" />
            {lang === 'ar' ? destStation.nameAr : destStation.nameFr} ({gpsProgress ? expectedArrivalClock : activeTrip.busArrival})
          </span>
        </div>

        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden relative p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(4, displayedProgress)}%` }}
          />
        </div>
      </div>

      {/* Connecting Trains Upon Arrival at Gobâa */}
      {direction === 'tebourba_to_gobaa' && upcomingGobaaTrains.length > 0 && (
        <div className="bg-black/25 border border-white/10 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
              <Train className="w-4 h-4 shrink-0" />
              <span>{t.nextTrainsAtGobaaUponArrival} ({expectedArrivalClock})</span>
            </span>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${destStation.lat},${destStation.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-emerald-300 hover:text-emerald-200 font-semibold flex items-center gap-1"
            >
              <span>{t.viewOnMap}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {upcomingGobaaTrains.map((train) => {
              const waitAfterArrival = train.remainingMinutes;
              const isComfortable = waitAfterArrival >= 6;
              return (
                <div
                  key={train.schedule.trainNumber}
                  className="bg-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2 border border-white/10"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white font-mono">
                        🚆 {train.schedule.trainNumber}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                          isComfortable
                            ? 'bg-emerald-500/25 text-emerald-300'
                            : 'bg-amber-500/25 text-amber-300'
                        }`}
                      >
                        {isComfortable ? t.catchingComfortably : t.tightConnection}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-300 block mt-0.5 font-mono" dir="ltr">
                      {train.departureTime} ➔ {train.arrivalTime}
                    </span>
                  </div>

                  <div className="text-end shrink-0">
                    <span className="text-[10px] text-emerald-200/80 block">
                      {lang === 'ar' ? 'انتظار' : 'Attente'}
                    </span>
                    <span className="text-xs font-black text-amber-300 font-mono" dir="ltr">
                      +{waitAfterArrival} {t.minutes}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
