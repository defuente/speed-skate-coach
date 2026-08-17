export type TrainingType =
  | 'Resistencia'
  | 'Velocidad'
  | 'Intervalos'
  | 'Técnica'
  | 'Libre';

export const TRAINING_TYPES: TrainingType[] = ['Resistencia', 'Velocidad', 'Intervalos', 'Técnica', 'Libre'];

export interface Athlete {
  id: string;
  name: string;
  birthDate?: string;
  category?: string;
  club?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lap {
  number: number;
  lapTime: number;
  cumulativeTime: number;
  speed?: number;
  targetLapTimeMs?: number;
}

export interface Session {
  id: string;
  date: string;
  athleteId?: string;
  athleteName: string;
  trainingType: TrainingType;
  distancePerLap: number;
  targetLapTimeMs?: number;
  targetLapCount?: number;
  laps: Lap[];
  totalTime: number;
  notes?: string;
}

export interface SessionConfig {
  athleteId?: string;
  athleteName: string;
  trainingType: TrainingType;
  distancePerLap: number;
  targetLapTimeMs?: number;
  targetLapCount?: number;
}

export interface TrainingStats {
  bestLap: Lap | null;
  worstLap: Lap | null;
  averageLapTime: number;
  consistency: number;
  averageSpeed: number;
  totalDistance: number;
  lapsOnTarget: number;
  targetCompliance: number;
}

export interface AppSettings {
  athleteName: string;
  defaultTrainingType: TrainingType;
  defaultDistancePerLap: number;
}
