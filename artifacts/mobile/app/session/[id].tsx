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
import { getSession, deleteSession } from '@/utils/storage';
import { formatTime, formatDate, calculateStats } from '@/utils/calculations';
import { exportSessionCSV } from '@/utils/csvExport';
import { LapRow } from '@/components/LapRow';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (id) getSession(id).then(s => { setSession(s); setLoading(false); });
  }, [id]);

  const handleDelete = useCallback(() => {
    Alert.alert('Eliminar sesión', '¿Eliminar este entrenamiento? No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => { if (id) { await deleteSession(id); router.back(); } },
      },
    ]);
  }, [id, router]);

  const handleExport = useCallback(async () => {
    if (!session) return;
    setExporting(true);
    try { await exportSessionCSV(session); } catch { Alert.alert('Error', 'No se pudo exportar la sesión'); }
    setExporting(false);
  }, [session]);

  const webTop = Platform.OS === 'web' ? 67 : 0;

  if (loading) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Sesión no encontrada</Text>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.backBtnTxt, { color: colors.primaryForeground }]}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const stats = calculateStats(session.laps, session.distancePerLap);

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      {/* Custom header */}
      <View style={[styles.header, { paddingTop: insets.top + webTop + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <View style={[styles.typePill, { backgroundColor: `${colors.primary}22` }]}>
            <Text style={[styles.typeTxt, { color: colors.primary }]}>{session.trainingType}</Text>
          </View>
          <Text style={[styles.dateTxt, { color: colors.mutedForeground }]}>{formatDate(session.date)}</Text>
        </View>
        <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={22} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Athlete card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.athleteName, { color: colors.foreground }]}>
            {session.athleteName || 'Sin nombre'}
          </Text>
          <Text style={[styles.athleteSub, { color: colors.mutedForeground }]}>
            {session.laps.length} vuelta{session.laps.length !== 1 ? 's' : ''}
            {session.distancePerLap > 0
              ? ` · ${session.distancePerLap}m/v · ${(session.distancePerLap * session.laps.length / 1000).toFixed(2)} km total`
              : ''}
          </Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <BigStat label="Tiempo total" value={formatTime(session.totalTime)} colors={colors} />
          <BigStat label="Vueltas" value={String(session.laps.length)} colors={colors} />
          {stats.bestLap && (
            <BigStat label="Mejor vuelta" value={formatTime(stats.bestLap.lapTime)} colors={colors} accent={colors.lapBest} />
          )}
          {stats.worstLap && (
            <BigStat label="Peor vuelta" value={formatTime(stats.worstLap.lapTime)} colors={colors} accent={colors.lapWorst} />
          )}
          {session.laps.length > 1 && (
            <BigStat label="Promedio" value={formatTime(stats.averageLapTime)} colors={colors} />
          )}
          {session.laps.length > 1 && (
            <BigStat label="Consistencia" value={`${stats.consistency.toFixed(1)}%`} colors={colors} />
          )}
          {stats.averageSpeed > 0 && (
            <BigStat label="Vel. media" value={`${stats.averageSpeed.toFixed(1)} km/h`} colors={colors} accent={colors.primary} />
          )}
          {stats.totalDistance > 0 && (
            <BigStat label="Distancia" value={`${stats.totalDistance.toFixed(2)} km`} colors={colors} />
          )}
        </View>

        {/* Laps table */}
        <View style={[styles.lapsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.lapsTitle, { color: colors.foreground }]}>Registro de vueltas</Text>
          <View style={[styles.lapsHead, { borderColor: colors.border }]}>
            <Text style={[styles.lhTxt, { color: colors.mutedForeground, width: 34 }]}>V</Text>
            <Text style={[styles.lhTxt, { color: colors.mutedForeground, flex: 1 }]}>Vuelta</Text>
            <Text style={[styles.lhTxt, { color: colors.mutedForeground, width: 76, textAlign: 'right' }]}>Total</Text>
            {session.distancePerLap > 0 && (
              <Text style={[styles.lhTxt, { color: colors.mutedForeground, width: 68, textAlign: 'right' }]}>Vel.</Text>
            )}
            <Text style={[styles.lhTxt, { color: colors.mutedForeground, width: 60, textAlign: 'right' }]}>Δ</Text>
          </View>
          {session.laps.map(lap => (
            <LapRow
              key={lap.number}
              lap={lap}
              isBest={lap.number === stats.bestLap?.number}
              isWorst={lap.number === stats.worstLap?.number}
              distancePerLap={session.distancePerLap}
              avgLapTime={stats.averageLapTime}
            />
          ))}
        </View>

        {/* Export */}
        <TouchableOpacity
          onPress={handleExport}
          disabled={exporting}
          activeOpacity={0.8}
          style={[styles.exportBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons
            name={exporting ? 'hourglass-outline' : 'download-outline'}
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.exportTxt, { color: colors.primary }]}>
            {exporting ? 'Exportando…' : 'Exportar CSV'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function BigStat({ label, value, colors, accent }: any) {
  return (
    <View style={[styles.bigStat, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.bigStatVal, { color: accent ?? colors.foreground }]}>{value}</Text>
      <Text style={[styles.bigStatLbl, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFound: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backBtnTxt: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  headerMid: { flex: 1, alignItems: 'center', gap: 4 },
  typePill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  typeTxt: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  dateTxt: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 4 },
  athleteName: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  athleteSub: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bigStat: {
    width: '47%', borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 2,
  },
  bigStatVal: { fontSize: 17, fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] },
  bigStatLbl: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  lapsCard: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  lapsTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  lapsHead: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  lhTxt: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5,
  },
  exportTxt: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
