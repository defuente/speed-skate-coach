export type TrainingType =
  | 'Resistencia'
  | 'Velocidad'
  | 'Intervalos'
  | 'Técnica'
  | 'Libre';

export const TRAINING_TYPES: TrainingType[] = [
  'Resistencia',
  'Velocidad',
  'Intervalos',
  'Técnica',
  'Libre',
];

export interface Lap {
  number: number;
  lapTime: number;        // milliseconds
  cumulativeTime: number; // milliseconds
  speed?: number;         // km/h, only when distancePerLap > 0
}

export interface Session {
  id: string;
  date: string;             // ISO 8601
  athleteName: string;
  trainingType: TrainingType;
  distancePerLap: number;   // meters, 0 = not set
  laps: Lap[];
  totalTime: number;        // milliseconds
  notes?: string;
}

export interface SessionConfig {
  athleteName: string;
  trainingType: TrainingType;
  distancePerLap: number;
}

export interface TrainingStats {
  bestLap: Lap | null;
  worstLap: Lap | null;
  averageLapTime: number;
  consistency: number;    // coefficient of variation (%)
  averageSpeed: number;   // km/h
  totalDistance: number;  // km
}

export interface AppSettings {
  athleteName: string;
  defaultTrainingType: TrainingType;
  defaultDistancePerLap: number;
}
