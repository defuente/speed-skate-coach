import { Platform } from 'react-native';
import { Session } from '@/types/training';
import { calculateSpeed, formatTime, isLapOnTarget } from './calculations';

export async function exportSessionCSV(session: Session) {
  await shareCSV(buildCSV([session]), buildFilename(session.athleteName, session.date));
}

export async function exportAthleteCSV(sessions: Session[], athleteName: string) {
  const selected = sessions.filter(session => norm(session.athleteName) === norm(athleteName));
  if (!selected.length) throw new Error('No sessions for athlete');
  await shareCSV(buildCSV(selected), buildFilename(athleteName, new Date().toISOString()));
}

async function shareCSV(csv: string, filename: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }

  const [FileSystem, Sharing] = await Promise.all([
    import('expo-file-system/legacy'),
    import('expo-sharing'),
  ]);
  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'text/csv',
      dialogTitle: 'Exportar Speed Skate Coach',
    });
  }
}

function norm(name: string) {
  return (name || 'Sin nombre').trim().toLocaleLowerCase();
}

function safe(name: string) {
  return (name || 'sin_nombre')
    .trim()
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'sin_nombre';
}

function buildFilename(name: string, date: string) {
  return `speed_skate_${safe(name)}_${date.split('T')[0]}.csv`;
}

function cell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCSV(sessions: Session[]) {
  const header = [
    'Fecha',
    'ID deportista',
    'Deportista',
    'Categoría',
    'Nivel de rendimiento',
    'Tipo',
    'Distancia vuelta (m)',
    'Vueltas objetivo',
    'Vueltas realizadas',
    'Cumplimiento volumen (%)',
    'Objetivo tiempo/vuelta',
    'Vuelta',
    'Tiempo vuelta',
    'Tiempo acumulado',
    'Velocidad (km/h)',
    'Cumple objetivo tiempo',
  ];
  const lines = [header.map(cell).join(',')];

  for (const session of sessions) {
    const volume = session.targetLapCount
      ? Math.min(100, (session.laps.length / session.targetLapCount) * 100)
      : '';
    const base = [
      new Date(session.date).toLocaleDateString('es-ES'),
      session.athleteId || '',
      session.athleteName || 'Sin nombre',
      session.athleteCategory || '',
      session.athletePerformanceLevel || '',
      session.trainingType,
      session.distancePerLap || '',
      session.targetLapCount || '',
      session.laps.length,
      typeof volume === 'number' ? volume.toFixed(1) : '',
      session.targetLapTimeMs ? formatTime(session.targetLapTimeMs) : '',
    ];

    if (!session.laps.length) {
      lines.push([...base, '', '', formatTime(session.totalTime), '', ''].map(cell).join(','));
      continue;
    }

    for (const lap of session.laps) {
      const speed = session.distancePerLap > 0
        ? calculateSpeed(session.distancePerLap, lap.lapTime).toFixed(2)
        : '';
      const onTarget = session.targetLapTimeMs
        ? (isLapOnTarget(lap.lapTime, session.targetLapTimeMs) ? 'Sí' : 'No')
        : '';
      lines.push(
        [
          ...base,
          lap.number,
          formatTime(lap.lapTime),
          formatTime(lap.cumulativeTime),
          speed,
          onTarget,
        ]
          .map(cell)
          .join(','),
      );
    }
  }

  return lines.join('\n');
}
