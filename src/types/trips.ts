import { Station, TrainSchedule } from '../data/rfrData';

export interface DirectTrip {
  type: 'direct';
  schedule: TrainSchedule;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  remainingMinutes: number;
  originStation: Station;
  destinationStation: Station;
  intermediateStops: { station: Station; time: string; passed: boolean }[];
  isNextDay: boolean;
  dayBadgeText: string;
}

export interface MultimodalBusTrainTrip {
  type: 'multimodal_bus';
  direction: 'tebourba_to_tunis' | 'tunis_to_tebourba';
  busLine: '42' | '116';
  busDeparture: string;
  busArrival: string;
  transferStation: Station;
  transferWaitMinutes: number;
  trainTrip: DirectTrip;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  remainingMinutes: number;
  originStation: Station;
  destinationStation: Station;
  isNextDay: boolean;
  dayBadgeText: string;
}

export type AnyTrip = DirectTrip | MultimodalBusTrainTrip;

export interface DaysBadgeInfo {
  short: string;
  full: string;
  color: string;
}
