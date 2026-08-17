import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { SessionCard } from '@/components/SessionCard';
import { Session } from '@/types/training';
import { getSessions } from '@/utils/storage';
import { exportAthleteCSV } from '@/utils/csvExport';

interface AthleteFilter {
  key: string;
  label: string;
}

function sessionAthleteKey(session: Session): string {
  const name = session.athleteName.trim() || 'Sin nombre';
  return session.athleteId || `name:${name.toLocaleLowerCase()}`;
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedAthleteKey, setSelectedAthleteKey] = useState('all');

  const load = useCallback(async () => {
    const data = await getSessions();
    setSessions(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const athleteFilters = useMemo<AthleteFilter[]>(() => {
    const map = new Map<string, string>();
    sessions.forEach(session => {
      const key = sessionAthleteKey(session);
      const label = session.athleteName.trim() || 'Sin nombre';
      if (!map.has(key)) map.set(key, label);
    });
    return [...map.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
  }, [sessions]);

  const athleteNames = useMemo(
    () => athleteFilters.map(item => item.label),
    [athleteFilters],
  );

  const filteredSessions = useMemo(
    () =>
      selectedAthleteKey === 'all'
        ? sessions
        : sessions.filter(session => sessionAthleteKey(session) === selectedAthleteKey),
    [selectedAthleteKey, sessions],
  );

  const exportAthlete = useCallback(
    (athlete: string) => {
      setExporting(true);
      exportAthleteCSV(sessions, athlete)
        .catch(() => Alert.alert('Error', 'No se pudo exportar el historial'))
        .finally(() => setExporting(false));
    },
    [sessions],
  );

  const chooseAthlete = useCallback(() => {
    if (athleteNames.length === 1) return exportAthlete(athleteNames[0]);
    Alert.alert(
      'Exportar historial',
      'Selecciona el deportista',
      [
        ...athleteNames.map(name => ({ text: name, onPress: () => exportAthlete(name) })),
        { text: 'Cancelar', style: 'cancel' as const },
      ],
    );
  }, [athleteNames, exportAthlete]);

  const webTop = Platform.OS === 'web' ? 67 : 0;
  const webBottom = Platform.OS === 'web' ? 84 : 0;
  const filtered = selectedAthleteKey !== 'all';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + webTop + 16, borderBottomColor: colors.border },
        ]}
      >
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Historial</Text>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {filtered
              ? `${filteredSessions.length} de ${sessions.length} sesiones`
              : `${sessions.length} sesión${sessions.length !== 1 ? 'es' : ''}`}
          </Text>
        </View>
        {sessions.length > 0 && (
          <TouchableOpacity
            disabled={exporting}
            onPress={chooseAthlete}
            style={[styles.exportBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Ionicons
              name={exporting ? 'hourglass-outline' : 'download-outline'}
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.exportTxt, { color: colors.primary }]}>CSV deportista</Text>
          </TouchableOpacity>
        )}
      </View>

      {!loading && sessions.length > 0 && (
        <View style={[styles.filterSection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>DEPORTISTA</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <FilterChip
              label="Todos"
              selected={selectedAthleteKey === 'all'}
              onPress={() => setSelectedAthleteKey('all')}
              colors={colors}
            />
            {athleteFilters.map(athlete => (
              <FilterChip
                key={athlete.key}
                label={athlete.label}
                selected={selectedAthleteKey === athlete.key}
                onPress={() => setSelectedAthleteKey(athlete.key)}
                colors={colors}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin sesiones aún</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Completa tu primer entrenamiento para verlo aquí
          </Text>
        </View>
      ) : filteredSessions.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="filter-outline" size={50} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin sesiones para este filtro</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={session => session.id}
          renderItem={({ item }) => (
            <SessionCard session={item} onPress={() => router.push(`/session/${item.id}`)} />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + webBottom + 16 }]}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.filterChip,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Ionicons
        name={selected ? 'person' : 'person-outline'}
        size={14}
        color={selected ? colors.primaryForeground : colors.foreground}
      />
      <Text
        style={[
          styles.filterChipText,
          { color: selected ? colors.primaryForeground : colors.foreground },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  count: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  exportTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  filterSection: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  filterLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 7,
  },
  filterScroll: { paddingHorizontal: 16, gap: 8, paddingRight: 24 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  filterChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  list: { paddingTop: 14 },
});
