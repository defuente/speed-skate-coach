import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@/types/training';
import { deleteSession, getSession } from '@/utils/storage';
import { calculateStats, formatDate, formatTime } from '@/utils/calculations';
import { exportSessionCSV } from '@/utils/csvExport';
import { LapRow } from '@/components/LapRow';

const METRIC_INFO = {
  volume: {
    title: 'Cumplimiento de volumen',
    body: 'Compara las vueltas realmente completadas con las vueltas objetivo asignadas. Ejemplo: 8 de 10 vueltas = 80%. Si supera la meta, el cumplimiento se muestra como 100%, aunque las vueltas extra siguen quedando registradas.',
  },
  bestLap: {
    title: 'Mejor vuelta',
    body: 'Es la vuelta con menor tiempo de toda la sesión. Sirve para identificar el mejor rendimiento puntual alcanzado durante el entrenamiento.',
  },
  worstLap: {
    title: 'Peor vuelta',
    body: 'Es la vuelta con mayor tiempo de toda la sesión. Puede ayudar a detectar fatiga, pérdida de ritmo o una vuelta atípica que conviene revisar.',
  },
  paceCompliance: {
    title: 'Cumplimiento de ritmo',
    body: 'Indica cuántas vueltas se hicieron dentro del tiempo objetivo. Una vuelta cuenta como cumplida cuando su tiempo es igual o menor al objetivo. Ejemplo: 7 de 10 vueltas = 70%.',
  },
  averageLap: {
    title: 'Tiempo promedio',
    body: 'Es el promedio de los tiempos de todas las vueltas completadas. Permite comparar el ritmo general de la sesión con otras sesiones o con el objetivo definido.',
  },
  consistency: {
    title: 'Consistencia',
    body: 'Mide cuánto varían los tiempos de vuelta respecto del promedio. La app calcula la desviación estándar de los tiempos y la divide por el tiempo promedio, expresándolo como porcentaje. 0% significaría vueltas idénticas; cuanto menor el porcentaje, más regular fue el ritmo.',
  },
  averageSpeed: {
    title: 'Velocidad media',
    body: 'Es la velocidad promedio de toda la sesión. La app divide la distancia total recorrida por el tiempo acumulado de las vueltas y la expresa en km/h. Un valor mayor significa que, en promedio, se recorrió la distancia más rápido.',
  },
  distance: {
    title: 'Distancia total',
    body: 'Corresponde a la distancia configurada por vuelta multiplicada por la cantidad de vueltas completadas. Las vueltas no realizadas no se suman a esta distancia.',
  },
} as const;

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getSession(id).then(value => {
      setSession(value);
      setLoading(false);
    });
  }, [id]);

  const remove = useCallback(() => {
    Alert.alert('Eliminar sesión', '¿Eliminar este entrenamiento? No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          if (id) {
            await deleteSession(id);
            router.back();
          }
        },
      },
    ]);
  }, [id, router]);

  const exp = useCallback(async () => {
    if (!session) return;
    setExporting(true);
    try {
      await exportSessionCSV(session);
    } catch {
      Alert.alert('Error', 'No se pudo exportar la sesión');
    }
    setExporting(false);
  }, [session]);

  const webTop = Platform.OS === 'web' ? 67 : 0;

  if (loading) {
    return (
      <View style={[s.fill, { backgroundColor: colors.background }]}>
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[s.fill, { backgroundColor: colors.background }]}>
        <View style={s.center}>
          <Text style={{ color: colors.mutedForeground }}>Sesión no encontrada</Text>
          <TouchableOpacity onPress={() => router.back()} style={[s.back, { backgroundColor: colors.primary }]}>
            <Text style={{ color: colors.primaryForeground }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const stats = calculateStats(session.laps, session.distancePerLap, session.targetLapTimeMs);
  const volumePct = session.targetLapCount
    ? Math.min(100, (session.laps.length / session.targetLapCount) * 100)
    : 0;
  const volumeDone = !!session.targetLapCount && session.laps.length >= session.targetLapCount;

  return (
    <View style={[s.fill, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + webTop + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.mid}>
          <View style={[s.typePill, { backgroundColor: `${colors.primary}22` }]}>
            <Text style={[s.typeTxt, { color: colors.primary }]}>{session.trainingType}</Text>
          </View>
          <Text style={[s.date, { color: colors.mutedForeground }]}>{formatDate(session.date)}</Text>
        </View>
        <TouchableOpacity onPress={remove}>
          <Ionicons name="trash-outline" size={22} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.name, { color: colors.foreground }]}>{session.athleteName || 'Sin nombre'}</Text>
          <Text style={[s.sub, { color: colors.mutedForeground }]}>
            {session.targetLapCount ? `${session.laps.length}/${session.targetLapCount} vueltas` : `${session.laps.length} vueltas`}
            {session.distancePerLap > 0
              ? ` · ${session.distancePerLap}m/v · ${(session.distancePerLap * session.laps.length / 1000).toFixed(2)} km total`
              : ''}
          </Text>
          {session.targetLapCount && (
            <View
              style={[
                s.volumeBox,
                {
                  borderColor: volumeDone ? colors.lapBest : colors.lapWorst,
                  backgroundColor: volumeDone ? `${colors.lapBest}10` : `${colors.lapWorst}10`,
                },
              ]}
            >
              <Text style={[s.volumeTitle, { color: volumeDone ? colors.lapBest : colors.lapWorst }]}>
                {volumeDone ? '✓ Volumen objetivo cumplido' : 'Volumen objetivo incompleto'}
              </Text>
              <Text style={[s.volumeSub, { color: colors.mutedForeground }]}>
                Objetivo {session.targetLapCount} · Realizadas {session.laps.length} · {Math.round(volumePct)}%
              </Text>
            </View>
          )}
        </View>

        <View style={s.helpHint}>
          <Ionicons name="information-circle-outline" size={17} color={colors.primary} />
          <Text style={[s.helpHintText, { color: colors.mutedForeground }]}>
            Toca el ícono ⓘ de una métrica para saber qué significa y cómo interpretarla.
          </Text>
        </View>

        <View style={s.grid}>
          <Big label="Tiempo total" value={formatTime(session.totalTime)} colors={colors} />
          <Big
            label="Vueltas"
            value={session.targetLapCount ? `${session.laps.length}/${session.targetLapCount}` : String(session.laps.length)}
            colors={colors}
            accent={session.targetLapCount ? (volumeDone ? colors.lapBest : colors.lapWorst) : undefined}
          />
          {session.targetLapCount && (
            <Big
              label="Cumplimiento volumen"
              value={`${Math.round(volumePct)}%`}
              colors={colors}
              accent={volumeDone ? colors.lapBest : colors.lapWorst}
              info={METRIC_INFO.volume}
            />
          )}
          {stats.bestLap && (
            <Big
              label="Mejor vuelta"
              value={formatTime(stats.bestLap.lapTime)}
              colors={colors}
              accent={colors.lapBest}
              info={METRIC_INFO.bestLap}
            />
          )}
          {stats.worstLap && (
            <Big
              label="Peor vuelta"
              value={formatTime(stats.worstLap.lapTime)}
              colors={colors}
              accent={colors.lapWorst}
              info={METRIC_INFO.worstLap}
            />
          )}
          {session.targetLapTimeMs && (
            <Big
              label="Cumplimiento ritmo"
              value={`${stats.lapsOnTarget}/${session.laps.length} · ${Math.round(stats.targetCompliance)}%`}
              colors={colors}
              accent={colors.primary}
              info={METRIC_INFO.paceCompliance}
            />
          )}
          {session.laps.length > 1 && (
            <Big
              label="Promedio"
              value={formatTime(stats.averageLapTime)}
              colors={colors}
              info={METRIC_INFO.averageLap}
            />
          )}
          {session.laps.length > 1 && (
            <Big
              label="Consistencia"
              value={`${stats.consistency.toFixed(1)}%`}
              colors={colors}
              info={METRIC_INFO.consistency}
            />
          )}
          {stats.averageSpeed > 0 && (
            <Big
              label="Vel. media"
              value={`${stats.averageSpeed.toFixed(1)} km/h`}
              colors={colors}
              accent={colors.primary}
              info={METRIC_INFO.averageSpeed}
            />
          )}
          {stats.totalDistance > 0 && (
            <Big
              label="Distancia"
              value={`${stats.totalDistance.toFixed(2)} km`}
              colors={colors}
              info={METRIC_INFO.distance}
            />
          )}
        </View>

        <View style={[s.lapsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.lapsTitle, { color: colors.foreground }]}>Registro de vueltas</Text>
          <View style={[s.lapsHead, { borderColor: colors.border }]}>
            <Text style={[s.th, { color: colors.mutedForeground, width: 34 }]}>V</Text>
            <Text style={[s.th, { color: colors.mutedForeground, flex: 1 }]}>Vuelta</Text>
            <Text style={[s.th, { color: colors.mutedForeground, width: 76, textAlign: 'right' }]}>Total</Text>
            {session.distancePerLap > 0 && (
              <Text style={[s.th, { color: colors.mutedForeground, width: 68, textAlign: 'right' }]}>Vel.</Text>
            )}
            <Text style={[s.th, { color: colors.mutedForeground, width: 68, textAlign: 'right' }]}>
              {session.targetLapTimeMs ? 'Objetivo' : 'Δ'}
            </Text>
          </View>
          {session.laps.map(lap => (
            <LapRow
              key={lap.number}
              lap={lap}
              isBest={lap.number === stats.bestLap?.number}
              isWorst={lap.number === stats.worstLap?.number}
              distancePerLap={session.distancePerLap}
              avgLapTime={stats.averageLapTime}
              targetLapTimeMs={session.targetLapTimeMs}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={exp}
          disabled={exporting}
          style={[s.export, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name={exporting ? 'hourglass-outline' : 'download-outline'} size={20} color={colors.primary} />
          <Text style={[s.exportTxt, { color: colors.primary }]}>
            {exporting ? 'Exportando…' : 'Exportar CSV'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Big({
  label,
  value,
  colors,
  accent,
  info,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  accent?: string;
  info?: { title: string; body: string };
}) {
  return (
    <View style={[s.big, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={s.bigTopRow}>
        <Text style={[s.bigLbl, { color: colors.mutedForeground }]} numberOfLines={1}>
          {label}
        </Text>
        {info && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Información sobre ${label}`}
            hitSlop={8}
            onPress={() => Alert.alert(info.title, info.body)}
            style={s.infoBtn}
          >
            <Ionicons name="information-circle-outline" size={17} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[s.bigVal, { color: accent ?? colors.foreground }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  back: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  mid: { flex: 1, alignItems: 'center', gap: 4 },
  typePill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  typeTxt: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  date: { fontSize: 12 },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 5 },
  name: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 13 },
  volumeBox: { marginTop: 8, borderWidth: 1, borderRadius: 10, padding: 10, gap: 2 },
  volumeTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  volumeSub: { fontSize: 11 },
  helpHint: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 2 },
  helpHintText: { flex: 1, fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  big: { width: '47%', borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 5 },
  bigTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 18, gap: 6 },
  bigVal: { fontSize: 17, fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] },
  bigLbl: { flex: 1, fontSize: 11, fontFamily: 'Inter_500Medium' },
  infoBtn: { alignItems: 'center', justifyContent: 'center' },
  lapsCard: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  lapsTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', padding: 14, paddingBottom: 8 },
  lapsHead: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  th: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  export: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  exportTxt: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
