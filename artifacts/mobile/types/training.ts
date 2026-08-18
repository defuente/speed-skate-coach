export type TrainingType =
  | 'Resistencia'
  | 'Velocidad'
  | 'Intervalos'
  | 'Técnica'
  | 'Libre';

export const TRAINING_TYPES: TrainingType[] = ['Resistencia', 'Velocidad', 'Intervalos', 'Técnica', 'Libre'];

export type AgeCategory =
  | '6ª Categoría'
  | '5ª Categoría'
  | '4ª Categoría'
  | '3ª Categoría'
  | 'Pre-Juvenil'
  | 'Juvenil'
  | 'Adulto'
  | 'Senior'
  | 'Máster';

export type PerformanceLevel =
  | 'Formativo / Escuela'
  | 'Intermedia'
  | 'Alta Competencia / Federado';

export interface AthleteCategoryHistoryEntry {
  id: string;
  category: string;
  validFrom: string;
  validTo?: string;
}

export interface Athlete {
  id: string;
  name: string;
  birthDate?: string;
  /**
   * Categoría etaria actual. Desde v0.3 se calcula automáticamente
   * a partir de birthDate usando la edad al 31 de diciembre.
   * Se mantiene como campo para compatibilidad con datos históricos.
   */
  category?: string;
  categoryHistory?: AthleteCategoryHistoryEntry[];
  performanceLevel?: PerformanceLevel;
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
  /** Snapshot de la categoría etaria correspondiente al año de la sesión. */
  athleteCategory?: string;
  athleteCategoryHistoryId?: string;
  /** Snapshot del nivel de rendimiento vigente al guardar la sesión. */
  athletePerformanceLevel?: PerformanceLevel;
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
