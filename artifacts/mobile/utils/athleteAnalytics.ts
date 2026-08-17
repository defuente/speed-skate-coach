import { Session, TrainingType } from '@/types/training';
import { calculateStats } from '@/utils/calculations';

export type AthleteMetric =
  | 'bestLap'
  | 'averageLap'
  | 'consistency'
  | 'averageSpeed'
  | 'paceCompliance'
  | 'volumeCompliance';

export interface AthleteSessionFilter {
  rangeDays?: number;
  distancePerLap?: number;
  trainingType?: TrainingType;
}

export interface MetricPoint {
  sessionId: string;
  date: string;
  value: number;
}

export interface SessionMetricSnapshot {
  bestLap: number | null;
  averageLap: number | null;
  consistency: number | null;
  averageSpeed: number | null;
  paceCompliance: number | null;
  volumeCompliance: number | null;
}

export interface SessionComparison {
  current: SessionMetricSnapshot;
  previous: SessionMetricSnapshot;
  bestLapDeltaMs: number | null;
  averageLapDeltaMs: number | null;
  consistencyDeltaPoints: number | null;
  averageSpeedDeltaKmh: number | null;
  paceComplianceDeltaPoints: number | null;
  volumeComplianceDeltaPoints: number | null;
}

export function getVolumeCompliance(session: Session): number | null {
  if (!session.targetLapCount || session.targetLapCount <= 0) return null;
  return Math.min(100, (session.laps.length / session.targetLapCount) * 100);
}

export function getSessionMetricSnapshot(session: Session): SessionMetricSnapshot {
  if (!session.laps.length) {
    return {
      bestLap: null,
      averageLap: null,
      consistency: null,
      averageSpeed: null,
      paceCompliance: session.targetLapTimeMs ? 0 : null,
      volumeCompliance: getVolumeCompliance(session),
    };
  }

  const stats = calculateStats(session.laps, session.distancePerLap, session.targetLapTimeMs);
  return {
    bestLap: stats.bestLap?.lapTime ?? null,
    averageLap: stats.averageLapTime || null,
    consistency: stats.consistency,
    averageSpeed: stats.averageSpeed > 0 ? stats.averageSpeed : null,
    paceCompliance: session.targetLapTimeMs ? stats.targetCompliance : null,
    volumeCompliance: getVolumeCompliance(session),
  };
}

export function filterAthleteSessions(
  sessions: Session[],
  filter: AthleteSessionFilter,
): Session[] {
  const now = Date.now();
  const minimumDate = filter.rangeDays
    ? now - filter.rangeDays * 24 * 60 * 60 * 1000
    : null;

  return sessions.filter(session => {
    if (minimumDate !== null && new Date(session.date).getTime() < minimumDate) return false;
    if (filter.distancePerLap !== undefined && session.distancePerLap !== filter.distancePerLap) return false;
    if (filter.trainingType && session.trainingType !== filter.trainingType) return false;
    return true;
  });
}

export function getAvailableDistances(sessions: Session[]): number[] {
  return Array.from(
    new Set(sessions.map(session => session.distancePerLap).filter(distance => distance > 0)),
  ).sort((a, b) => a - b);
}

export function buildMetricSeries(
  sessions: Session[],
  metric: AthleteMetric,
  limit = 12,
): MetricPoint[] {
  const chronological = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return chronological
    .map(session => {
      const snapshot = getSessionMetricSnapshot(session);
      const value = snapshot[metric];
      if (value === null || !Number.isFinite(value)) return null;
      return { sessionId: session.id, date: session.date, value };
    })
    .filter((point): point is MetricPoint => point !== null)
    .slice(-limit);
}

function delta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return current - previous;
}

export function compareSessions(currentSession: Session, previousSession: Session): SessionComparison {
  const current = getSessionMetricSnapshot(currentSession);
  const previous = getSessionMetricSnapshot(previousSession);

  return {
    current,
    previous,
    bestLapDeltaMs: delta(current.bestLap, previous.bestLap),
    averageLapDeltaMs: delta(current.averageLap, previous.averageLap),
    consistencyDeltaPoints: delta(current.consistency, previous.consistency),
    averageSpeedDeltaKmh: delta(current.averageSpeed, previous.averageSpeed),
    paceComplianceDeltaPoints: delta(current.paceCompliance, previous.paceCompliance),
    volumeComplianceDeltaPoints: delta(current.volumeCompliance, previous.volumeCompliance),
  };
}

export function buildPerformanceInsights(currentSession: Session, previousSession?: Session): string[] {
  const insights: string[] = [];
  const current = getSessionMetricSnapshot(currentSession);

  if (current.volumeCompliance !== null) {
    if (current.volumeCompliance >= 100) {
      const extra = currentSession.targetLapCount
        ? currentSession.laps.length - currentSession.targetLapCount
        : 0;
      insights.push(
        extra > 0
          ? `Volumen sobrecumplido: ${currentSession.laps.length}/${currentSession.targetLapCount} vueltas.`
          : `Volumen cumplido: ${currentSession.laps.length}/${currentSession.targetLapCount} vueltas.`,
      );
    } else {
      insights.push(
        `Volumen incompleto: ${currentSession.laps.length}/${currentSession.targetLapCount} vueltas (${Math.round(current.volumeCompliance)}%).`,
      );
    }
  }

  if (current.paceCompliance !== null) {
    insights.push(`Cumplimiento de ritmo: ${Math.round(current.paceCompliance)}% de las vueltas.`);
  }

  if (!previousSession) return insights;

  const previous = getSessionMetricSnapshot(previousSession);
  if (current.averageLap !== null && previous.averageLap !== null && previous.averageLap > 0) {
    const improvement = ((previous.averageLap - current.averageLap) / previous.averageLap) * 100;
    if (Math.abs(improvement) >= 0.5) {
      insights.push(
        improvement > 0
          ? `El tiempo promedio mejoró ${improvement.toFixed(1)}% frente a la sesión anterior comparable.`
          : `El tiempo promedio fue ${Math.abs(improvement).toFixed(1)}% más lento que la sesión anterior comparable.`,
      );
    }
  }

  if (current.consistency !== null && previous.consistency !== null) {
    const improvement = previous.consistency - current.consistency;
    if (Math.abs(improvement) >= 0.3) {
      insights.push(
        improvement > 0
          ? `La regularidad mejoró ${improvement.toFixed(1)} puntos de consistencia.`
          : `La consistencia empeoró ${Math.abs(improvement).toFixed(1)} puntos.`,
      );
    }
  }

  if (current.averageSpeed !== null && previous.averageSpeed !== null) {
    const speedDelta = current.averageSpeed - previous.averageSpeed;
    if (Math.abs(speedDelta) >= 0.1) {
      insights.push(
        speedDelta > 0
          ? `La velocidad media aumentó ${speedDelta.toFixed(1)} km/h.`
          : `La velocidad media disminuyó ${Math.abs(speedDelta).toFixed(1)} km/h.`,
      );
    }
  }

  return insights;
}

export function findPreviousComparableSession(
  sessions: Session[],
  currentSession: Session,
): Session | undefined {
  return sessions
    .filter(
      session =>
        session.id !== currentSession.id &&
        session.distancePerLap === currentSession.distancePerLap &&
        session.trainingType === currentSession.trainingType &&
        new Date(session.date).getTime() < new Date(currentSession.date).getTime(),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}
