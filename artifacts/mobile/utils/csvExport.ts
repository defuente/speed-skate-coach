import { Platform } from 'react-native';
import { Session } from '@/types/training';
import { formatTime, calculateSpeed } from './calculations';

export async function exportSessionCSV(session: Session): Promise<void> {
  const csv = buildCSV(session);
  const filename = buildFilename(session);

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const [FileSystem, Sharing] = await Promise.all([
    import('expo-file-system'),
    import('expo-sharing'),
  ]);

  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });

  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Exportar PatinCrono' });
  }
}

function buildFilename(session: Session): string {
  const date = session.date.split('T')[0];
  return `patincrono_${date}_${session.id.substring(0, 6)}.csv`;
}

function buildCSV(session: Session): string {
  const lines: string[] = [
    'PatinCrono - Registro de Entrenamiento',
    `Fecha,${new Date(session.date).toLocaleDateString('es-ES')}`,
    `Deportista,${session.athleteName || 'Sin nombre'}`,
    `Tipo,${session.trainingType}`,
    `Distancia por vuelta (m),${session.distancePerLap > 0 ? session.distancePerLap : 'No configurado'}`,
    `Total de vueltas,${session.laps.length}`,
    `Tiempo total,${formatTime(session.totalTime)}`,
    '',
    'Vuelta,Tiempo vuelta,Tiempo acumulado,Velocidad (km/h)',
  ];

  for (const lap of session.laps) {
    const speed =
      session.distancePerLap > 0
        ? calculateSpeed(session.distancePerLap, lap.lapTime).toFixed(2)
        : '-';
    lines.push(`${lap.number},${formatTime(lap.lapTime)},${formatTime(lap.cumulativeTime)},${speed}`);
  }

  return lines.join('\n');
}
