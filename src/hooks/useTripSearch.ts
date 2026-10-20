import { useState, useMemo, useEffect } from 'react';
import { LINES, TUNIS_CENTRAL_ID, findStationById, Station } from '../data/rfrData';
import { TRANSLATIONS, Language } from '../data/translations';
import { searchTrips } from '../services/tripSearchEngine';
import { AnyTrip } from '../types/trips';
import { playRailwayChime } from '../utils/sound';

export interface UseTripSearchResult {
  selectedLineId: string;
  setSelectedLineId: (lineId: string) => void;
  fromStationId: string;
  setFromStationId: (stationId: string) => void;
  toStationId: string;
  setToStationId: (stationId: string) => void;
  fromStation: Station | undefined;
  toStation: Station | undefined;
  isCrossLine: boolean;
  allTrips: AnyTrip[];
  nextTrip: AnyTrip | undefined;
  followingTrips: AnyTrip[];
  favorites: { lineId: string; from: string; to: string }[];
  isFavorite: boolean;
  toggleFavorite: () => void;
  handleSwapStations: () => void;
  showStops: boolean;
  setShowStops: (show: boolean) => void;
  reminderToast: string | null;
  copiedToast: boolean;
  handleSetReminder: (trip: AnyTrip) => void;
  handleShareTrip: (trip: AnyTrip) => void;
}

export function useTripSearch(
  currentTunisiaMinutes: number,
  currentDayOfWeek: number,
  lang: Language
): UseTripSearchResult {
  const t = TRANSLATIONS[lang];

  const [selectedLineId, setSelectedLineId] = useState<string>('D');
  const [fromStationId, setFromStationId] = useState<string>('gobaa');
  const [toStationId, setToStationId] = useState<string>(TUNIS_CENTRAL_ID);
  const [showStops, setShowStops] = useState<boolean>(true);

  // Favorites in localStorage
  const [favorites, setFavorites] = useState<{ lineId: string; from: string; to: string }[]>(() => {
    try {
      const saved = localStorage.getItem('rfr_fav_routes');
      return saved ? JSON.parse(saved) : [
        { lineId: 'D', from: 'gobaa', to: TUNIS_CENTRAL_ID },
        { lineId: 'E', from: 'bougatfa', to: TUNIS_CENTRAL_ID },
        { lineId: 'A', from: 'erriadh', to: TUNIS_CENTRAL_ID }
      ];
    } catch {
      return [{ lineId: 'D', from: 'gobaa', to: TUNIS_CENTRAL_ID }];
    }
  });

  const [reminderToast, setReminderToast] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  const fromStation = useMemo(() => findStationById(fromStationId), [fromStationId]);
  const toStation = useMemo(() => findStationById(toStationId), [toStationId]);

  const isCrossLine = Boolean(
    fromStation && toStation && fromStation.lineId !== toStation.lineId
  );

  // Calculate trips via pure service
  const allTrips = useMemo(() => {
    return searchTrips(
      fromStationId,
      toStationId,
      currentTunisiaMinutes,
      currentDayOfWeek,
      lang
    );
  }, [fromStationId, toStationId, currentTunisiaMinutes, currentDayOfWeek, lang]);

  const nextTrip = allTrips[0];
  const followingTrips = useMemo(() => allTrips.slice(1, 6), [allTrips]);

  const handleSwapStations = () => {
    const temp = fromStationId;
    setFromStationId(toStationId);
    setToStationId(temp);
  };

  const isFavorite = useMemo(() => {
    return favorites.some((f) => f.from === fromStationId && f.to === toStationId);
  }, [favorites, fromStationId, toStationId]);

  const toggleFavorite = () => {
    let nextFavs;
    if (isFavorite) {
      nextFavs = favorites.filter((f) => !(f.from === fromStationId && f.to === toStationId));
    } else {
      nextFavs = [...favorites, { lineId: selectedLineId, from: fromStationId, to: toStationId }];
    }
    setFavorites(nextFavs);
    try {
      localStorage.setItem('rfr_fav_routes', JSON.stringify(nextFavs));
    } catch {}
  };

  const handleSetReminder = (trip: AnyTrip) => {
    playRailwayChime();
    const trainNum =
      trip.type === 'direct'
        ? trip.schedule.trainNumber
        : `${trip.leg1.schedule.trainNumber} / ${trip.leg2.schedule.trainNumber}`;
    const alertMsg = t.reminderAlert
      .replace('{train}', trainNum)
      .replace('{time}', trip.departureTime);
    setReminderToast(alertMsg);
    setTimeout(() => setReminderToast(null), 5000);
  };

  const handleShareTrip = (trip: AnyTrip) => {
    const origName = lang === 'ar' ? trip.originStation.nameAr : trip.originStation.nameFr;
    const destName = lang === 'ar' ? trip.destinationStation.nameAr : trip.destinationStation.nameFr;
    const text = `${t.appTitle} 🚆: ${origName} ➔ ${destName} (${trip.departureTime} ➔ ${trip.arrivalTime})`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    }
  };

  return {
    selectedLineId,
    setSelectedLineId,
    fromStationId,
    setFromStationId,
    toStationId,
    setToStationId,
    fromStation,
    toStation,
    isCrossLine,
    allTrips,
    nextTrip,
    followingTrips,
    favorites,
    isFavorite,
    toggleFavorite,
    handleSwapStations,
    showStops,
    setShowStops,
    reminderToast,
    copiedToast,
    handleSetReminder,
    handleShareTrip
  };
}
