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

export interface InterlineTrip {
  type: 'interline';
  originStation: Station;
  destinationStation: Station;
  leg1: DirectTrip;
  leg2: DirectTrip;
  transferWaitMinutes: number;
  totalDurationMinutes: number;
  remainingMinutes: number;
  departureTime: string;
  arrivalTime: string;
  isNextDay: boolean;
}

export type AnyTrip = DirectTrip | InterlineTrip;

export interface DaysBadgeInfo {
  short: string;
  full: string;
  color: string;
}
