import { Platform } from 'react-native';
import { Session } from '@/types/training';
import { formatTime, calculateSpeed, isLapOnTarget } from './calculations';

export async function exportSessionCSV(session: Session): Promise<void> {
  await shareCSV(buildCSV([session]), buildFilename(session.athleteName, session.date));
}

export async function exportAthleteCSV(sessions: Session[], athleteName: string): Promise<void> {
  const selected = sessions.filter(s => normalizeName(s.athleteName) === normalizeName(athleteName));
  if (!selected.length) throw new Error('No sessions for athlete');
  await shareCSV(buildCSV(selected), buildFilename(athleteName, new Date().toISOString()));
}

async function shareCSV(csv: string, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); return;
  }
  const [FileSystem, Sharing] = await Promise.all([import('expo-file-system'), import('expo-sharing')]);
  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Exportar Speed Skate Coach' });
}

function normalizeName(name: string): string { return (name || 'Sin nombre').trim().toLocaleLowerCase(); }
function safeName(name: string): string { return (name || 'sin_nombre').trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, '_').replace(/^_+|_+$/g, '') || 'sin_nombre'; }
function buildFilename(athleteName: string, date: string): string { return `speed_skate_${safeName(athleteName)}_${date.split('T')[0]}.csv`; }
function csvCell(value: string | number): string { const text = String(value); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }

function buildCSV(sessions: Session[]): string {
  const lines: string[] = [
    ['Fecha','Deportista','Tipo','Distancia vuelta (m)','Objetivo vuelta','Vuelta','Tiempo vuelta','Tiempo acumulado','Velocidad (km/h)','Cumple objetivo'].map(csvCell).join(','),
  ];
  for (const session of sessions) {
    if (!session.laps.length) {
      lines.push([new Date(session.date).toLocaleDateString('es-ES'), session.athleteName || 'Sin nombre', session.trainingType, session.distancePerLap || '', session.targetLapTimeMs ? formatTime(session.targetLapTimeMs) : '', '', '', formatTime(session.totalTime), '', ''].map(csvCell).join(','));
      continue;
    }
    for (const lap of session.laps) {
      const speed = session.distancePerLap > 0 ? calculateSpeed(session.distancePerLap, lap.lapTime).toFixed(2) : '';
      const compliance = session.targetLapTimeMs ? (isLapOnTarget(lap.lapTime, session.targetLapTimeMs) ? 'Sí' : 'No') : '';
      lines.push([new Date(session.date).toLocaleDateString('es-ES'), session.athleteName || 'Sin nombre', session.trainingType, session.distancePerLap || '', session.targetLapTimeMs ? formatTime(session.targetLapTimeMs) : '', lap.number, formatTime(lap.lapTime), formatTime(lap.cumulativeTime), speed, compliance].map(csvCell).join(','));
    }
  }
  return lines.join('\n');
}
