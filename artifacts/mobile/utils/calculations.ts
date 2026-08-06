import { Lap, TrainingStats } from '@/types/training';

export function formatTime(ms: number): string {
  const totalMs = Math.max(0, Math.floor(ms));
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const centis = Math.floor((totalMs % 1000) / 10);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const cc = String(centis).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${mm}:${ss}.${cc}`;
  }
  return `${mm}:${ss}.${cc}`;
}

export function formatSpeed(kmh: number): string {
  if (kmh <= 0) return '—';
  return `${kmh.toFixed(1)} km/h`;
}

export function calculateSpeed(distanceMeters: number, timeMs: number): number {
  if (distanceMeters <= 0 || timeMs <= 0) return 0;
  const hours = timeMs / 3600000;
  const km = distanceMeters / 1000;
  return km / hours;
}

export function calculateStats(laps: Lap[], distancePerLap: number): TrainingStats {
  if (laps.length === 0) {
    return { bestLap: null, worstLap: null, averageLapTime: 0, consistency: 0, averageSpeed: 0, totalDistance: 0 };
  }

  const times = laps.map(l => l.lapTime);
  const sorted = [...laps].sort((a, b) => a.lapTime - b.lapTime);
  const bestLap = sorted[0];
  const worstLap = sorted[sorted.length - 1];
  const avg = times.reduce((a, b) => a + b, 0) / times.length;

  const variance = times.reduce((s, t) => s + Math.pow(t - avg, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  const consistency = avg > 0 ? (stdDev / avg) * 100 : 0;

  const totalTime = laps[laps.length - 1].cumulativeTime;
  const totalDistanceM = distancePerLap * laps.length;
  const averageSpeed = calculateSpeed(totalDistanceM, totalTime);

  return { bestLap, worstLap, averageLapTime: avg, consistency, averageSpeed, totalDistance: totalDistanceM / 1000 };
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateShort(isoString: string): string {
  const d = new Date(isoString);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
