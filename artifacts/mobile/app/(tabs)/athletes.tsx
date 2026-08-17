import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Session } from '@/types/training';
import { getAthletes, getSessions } from '@/utils/storage';
import { calculateStats, formatTime } from '@/utils/calculations';

interface AthleteSummary {
  name: string;
  sessions: number;
  laps: number;
  bestLap: number | null;
  lastDate: string | null;
}

function normalize(name: string) {
  return name.trim().toLocaleLowerCase();
}

export default function AthletesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [athletes, setAthletes] = useState<string[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [athleteData, sessionData] = await Promise.all([getAthletes(), getSessions()]);
    setAthletes(athleteData);
    setSessions(sessionData);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const summaries = useMemo<AthleteSummary[]>(() => athletes.map(name => {
    const own = sessions.filter(session => normalize(session.athleteName) === normalize(name));
    const bestLap = own
      .map(session => calculateStats(session.laps, session.distancePerLap).bestLap?.lapTime ?? 0)
      .filter(Boolean)
      .sort((a, b) => a - b)[0] ?? null;
    return {
      name,
      sessions: own.length,
      laps: own.reduce((sum, session) => sum + session.laps.length, 0),
      bestLap,
      lastDate: own[0]?.date ?? null,
    };
  }), [athletes, sessions]);

  const webTop = Platform.OS === 'web' ? 67 : 0;
  const webBottom = Platform.OS === 'web' ? 84 : 76;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 16, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Deportistas</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Perfiles, sesiones y evolución</Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: `${colors.primary}18` }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>{athletes.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : summaries.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={58} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin deportistas guardados</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Al iniciar un entrenamiento con un nombre nuevo, el deportista aparecerá automáticamente aquí.</Text>
        </View>
      ) : (
        <FlatList
          data={summaries}
          keyExtractor={item => normalize(item.name)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + webBottom + 20 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push({ pathname: '/athlete/[name]', params: { name: item.name } })}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="person" size={24} color={colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                </View>
                <View style={styles.metrics}>
                  <Metric value={String(item.sessions)} label="sesiones" colors={colors} />
                  <Metric value={String(item.laps)} label="vueltas" colors={colors} />
                  <Metric value={item.bestLap ? formatTime(item.bestLap) : '—'} label="mejor vuelta" colors={colors} accent={item.bestLap ? colors.lapBest : undefined} />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function Metric({ value, label, colors, accent }: { value: string; label: string; colors: ReturnType<typeof useColors>; accent?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color: accent ?? colors.foreground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  countPill: { minWidth: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 9 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 17, fontFamily: 'Inter_700Bold' },
  metrics: { flexDirection: 'row', gap: 18, flexWrap: 'wrap' },
  metric: { gap: 1 },
  metricValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] },
  metricLabel: { fontSize: 9, fontFamily: 'Inter_400Regular' },
});
