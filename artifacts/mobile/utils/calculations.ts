import { Lap, TrainingStats } from '@/types/training';

export function formatTime(ms: number): string { const totalMs = Math.max(0, Math.floor(ms)); const hours = Math.floor(totalMs / 3600000); const minutes = Math.floor((totalMs % 3600000) / 60000); const seconds = Math.floor((totalMs % 60000) / 1000); const centis = Math.floor((totalMs % 1000) / 10); const mm = String(minutes).padStart(2, '0'); const ss = String(seconds).padStart(2, '0'); const cc = String(centis).padStart(2, '0'); return hours > 0 ? `${hours}:${mm}:${ss}.${cc}` : `${mm}:${ss}.${cc}`; }
export function formatSpeed(kmh: number): string { return kmh <= 0 ? '—' : `${kmh.toFixed(1)} km/h`; }
export function calculateSpeed(distanceMeters: number, timeMs: number): number { if (distanceMeters <= 0 || timeMs <= 0) return 0; return (distanceMeters / 1000) / (timeMs / 3600000); }
export function isLapOnTarget(lapTime: number, targetLapTimeMs?: number): boolean { return !!targetLapTimeMs && targetLapTimeMs > 0 && lapTime <= targetLapTimeMs; }
export function calculateStats(laps: Lap[], distancePerLap: number, targetLapTimeMs?: number): TrainingStats {
  if (!laps.length) return { bestLap: null, worstLap: null, averageLapTime: 0, consistency: 0, averageSpeed: 0, totalDistance: 0, lapsOnTarget: 0, targetCompliance: 0 };
  const target = targetLapTimeMs || laps.find(l => l.targetLapTimeMs)?.targetLapTimeMs;
  const times = laps.map(l => l.lapTime); const sorted = [...laps].sort((a,b) => a.lapTime - b.lapTime); const bestLap = sorted[0]; const worstLap = sorted[sorted.length - 1]; const avg = times.reduce((a,b) => a+b, 0) / times.length; const variance = times.reduce((s,t) => s + Math.pow(t-avg,2),0) / times.length; const consistency = avg > 0 ? (Math.sqrt(variance)/avg)*100 : 0; const totalTime = laps[laps.length-1].cumulativeTime; const totalDistanceM = distancePerLap * laps.length; const averageSpeed = calculateSpeed(totalDistanceM,totalTime); const lapsOnTarget = target ? laps.filter(l => isLapOnTarget(l.lapTime,target)).length : 0; const targetCompliance = target ? (lapsOnTarget/laps.length)*100 : 0;
  return { bestLap, worstLap, averageLapTime: avg, consistency, averageSpeed, totalDistance: totalDistanceM/1000, lapsOnTarget, targetCompliance };
}
export function formatDate(isoString: string): string { return new Date(isoString).toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }); }
export function formatDateShort(isoString: string): string { const d = new Date(isoString); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; }
