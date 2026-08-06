import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@/types/training';
import { getSessions } from '@/utils/storage';
import { formatTime, formatDateShort, calculateStats } from '@/utils/calculations';

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getSessions().then(data => {
        setSessions(data);
        setLoading(false);
      });
    }, []),
  );

  const webTop = Platform.OS === 'web' ? 67 : 0;
  const webBottom = Platform.OS === 'web' ? 84 : 0;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View>
      </View>
    );
  }

  const PageHeader = (
    <View style={[styles.pageHeader, { paddingTop: insets.top + webTop + 16, borderBottomColor: colors.border }]}>
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Estadísticas</Text>
      <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>{sessions.length} sesiones</Text>
    </View>
  );

  if (sessions.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {PageHeader}
        <View style={styles.empty}>
          <Ionicons name="bar-chart-outline" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin datos aún</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Completa entrenamientos para ver tu evolución
          </Text>
        </View>
      </View>
    );
  }

  // Aggregates
  const last10 = sessions.slice(0, 10).reverse();
  const allLaps = sessions.flatMap(s => s.laps);
  const totalTime = sessions.reduce((s, se) => s + se.totalTime, 0);
  const bestLapEver = allLaps.length > 0 ? allLaps.reduce((a, b) => (a.lapTime < b.lapTime ? a : b)) : null;
  const allSpeeds = sessions.flatMap(s => s.laps.map(l => l.speed ?? 0)).filter(v => v > 0);
  const maxSpeed = allSpeeds.length > 0 ? Math.max(...allSpeeds) : 0;

  // Chart data
  const bestLapChartData = last10.map(s => {
    const st = calculateStats(s.laps, s.distancePerLap);
    return st.bestLap?.lapTime ?? 0;
  }).filter(v => v > 0);
  const bestLapLabels = last10.filter(s => calculateStats(s.laps, s.distancePerLap).bestLap).map(s => formatDateShort(s.date));

  const speedSessions = last10.filter(s => s.distancePerLap > 0 && s.laps.length > 0);
  const speedData = speedSessions.map(s => calculateStats(s.laps, s.distancePerLap).averageSpeed);
  const speedLabels = speedSessions.map(s => formatDateShort(s.date));

  const lapCountData = last10.map(s => s.laps.length);
  const lapCountLabels = last10.map(s => formatDateShort(s.date));

  const consistData = last10.filter(s => s.laps.length > 1).map(s => calculateStats(s.laps, s.distancePerLap).consistency);
  const consistLabels = last10.filter(s => s.laps.length > 1).map(s => formatDateShort(s.date));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {PageHeader}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + webBottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary grid */}
        <View style={styles.grid2}>
          <SummaryCard icon="layers-outline" label="Total sesiones" value={String(sessions.length)} colors={colors} />
          <SummaryCard icon="flag-outline" label="Total vueltas" value={String(allLaps.length)} colors={colors} />
        </View>
        <View style={styles.grid2}>
          <SummaryCard icon="time-outline" label="Tiempo total" value={formatTime(totalTime)} colors={colors} />
          {bestLapEver ? (
            <SummaryCard icon="trophy-outline" label="Mejor vuelta" value={formatTime(bestLapEver.lapTime)} colors={colors} accent={colors.lapBest} />
          ) : (
            <SummaryCard icon="analytics-outline" label="Sesiones" value={String(sessions.length)} colors={colors} />
          )}
        </View>
        {maxSpeed > 0 && (
          <SummaryCard icon="speedometer-outline" label="Velocidad máx. registrada" value={`${maxSpeed.toFixed(1)} km/h`} colors={colors} accent={colors.primary} wide />
        )}

        {/* Charts */}
        {bestLapChartData.length > 1 && (
          <ChartSection title="Mejor vuelta por sesión" subtitle="ms · Menos = mejor" colors={colors}>
            <SimpleBarChart data={bestLapChartData} labels={bestLapLabels} inverted colors={colors} formatValue={v => formatTime(v)} />
          </ChartSection>
        )}

        {speedData.length > 1 && (
          <ChartSection title="Velocidad media" subtitle="km/h por sesión" colors={colors}>
            <SimpleBarChart data={speedData} labels={speedLabels} colors={colors} formatValue={v => `${v.toFixed(1)}`} />
          </ChartSection>
        )}

        {lapCountData.length > 1 && (
          <ChartSection title="Vueltas por sesión" subtitle="Últimas sesiones" colors={colors}>
            <SimpleBarChart data={lapCountData} labels={lapCountLabels} colors={colors} formatValue={v => String(Math.round(v))} />
          </ChartSection>
        )}

        {consistData.length > 1 && (
          <ChartSection title="Consistencia" subtitle="% · Menos = más regular" colors={colors}>
            <SimpleBarChart data={consistData} labels={consistLabels} inverted colors={colors} formatValue={v => `${v.toFixed(1)}%`} />
          </ChartSection>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryCard({ icon, label, value, colors, accent, wide }: any) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, flex: wide ? 0 : 1 }]}>
      <Ionicons name={icon} size={18} color={accent ?? colors.primary} />
      <Text style={[styles.summaryVal, { color: accent ?? colors.foreground }]}>{value}</Text>
      <Text style={[styles.summaryLbl, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function ChartSection({ title, subtitle, children, colors }: any) {
  return (
    <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.chartTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.chartSub, { color: colors.mutedForeground }]}>{subtitle}</Text>
      <View style={styles.chartBody}>{children}</View>
    </View>
  );
}

function SimpleBarChart({ data, labels, inverted = false, colors, formatValue }: {
  data: number[];
  labels: string[];
  inverted?: boolean;
  colors: ReturnType<typeof useColors>;
  formatValue: (v: number) => string;
}) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const MAX_H = 88;
  const MIN_H = 14;

  return (
    <View style={styles.barsRow}>
      {data.map((val, i) => {
        const normalized = (val - min) / range;
        const barH = inverted
          ? MAX_H - normalized * (MAX_H - MIN_H)
          : MIN_H + normalized * (MAX_H - MIN_H);
        const isHighlight = inverted ? val === min : val === max;
        const barColor = isHighlight ? colors.primary : `${colors.primary}55`;

        return (
          <View key={i} style={styles.barCol}>
            <Text style={[styles.barVal, { color: colors.mutedForeground }]} numberOfLines={1}>
              {formatValue(val)}
            </Text>
            <View style={{ height: MAX_H, justifyContent: 'flex-end' }}>
              <View style={[styles.bar, { height: barH, backgroundColor: barColor }]} />
            </View>
            <Text style={[styles.barLbl, { color: colors.mutedForeground }]} numberOfLines={1}>
              {labels[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  pageHeader: {
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  pageTitle: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  pageSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 3 },
  scroll: { padding: 16, gap: 12 },
  grid2: { flexDirection: 'row', gap: 12 },
  summaryCard: {
    padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 4,
  },
  summaryVal: { fontSize: 18, fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] },
  summaryLbl: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  chartCard: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 4 },
  chartTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  chartSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  chartBody: { marginTop: 10 },
  barsRow: { flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barVal: { fontSize: 7, fontFamily: 'Inter_400Regular', textAlign: 'center', fontVariant: ['tabular-nums'] },
  bar: { width: '80%', borderRadius: 4 },
  barLbl: { fontSize: 7, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
