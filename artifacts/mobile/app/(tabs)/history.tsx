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
import { Athlete, Session } from '@/types/training';
import { getAthleteProfiles, getSessions } from '@/utils/storage';
import { exportAthleteCSV } from '@/utils/csvExport';

interface AthleteFilter {
  key: string;
  label: string;
}

interface CategoryFilter {
  key: string;
  label: string;
  current: boolean;
}

interface TrainingTypeFilter {
  key: string;
  label: string;
}

function normalizedKey(value?: string): string {
  return value?.trim().toLocaleLowerCase() ?? '';
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
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedAthleteKey, setSelectedAthleteKey] = useState('all');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('all');
  const [selectedTrainingTypeKey, setSelectedTrainingTypeKey] = useState('all');

  const load = useCallback(async () => {
    const [sessionData, athleteData] = await Promise.all([getSessions(), getAthleteProfiles()]);
    setSessions(sessionData);
    setAthletes(athleteData);
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

  const selectedAthlete = useMemo(() => {
    if (selectedAthleteKey === 'all') return undefined;
    const filter = athleteFilters.find(item => item.key === selectedAthleteKey);
    if (!filter) return undefined;
    return athletes.find(
      athlete =>
        athlete.id === selectedAthleteKey ||
        normalizedKey(athlete.name) === normalizedKey(filter.label),
    );
  }, [athleteFilters, athletes, selectedAthleteKey]);

  const athleteScopedSessions = useMemo(
    () =>
      selectedAthleteKey === 'all'
        ? sessions
        : sessions.filter(session => sessionAthleteKey(session) === selectedAthleteKey),
    [selectedAthleteKey, sessions],
  );

  const categoryFilters = useMemo<CategoryFilter[]>(() => {
    if (selectedAthleteKey === 'all') return [];

    const names = new Map<string, string>();
    selectedAthlete?.categoryHistory?.forEach(entry => {
      const clean = entry.category.trim();
      if (clean) names.set(normalizedKey(clean), clean);
    });
    athleteScopedSessions.forEach(session => {
      const clean = session.athleteCategory?.trim();
      if (clean) names.set(normalizedKey(clean), clean);
    });

    const currentKey = normalizedKey(selectedAthlete?.category);
    return [...names.entries()]
      .map(([key, label]) => ({ key, label, current: !!currentKey && key === currentKey }))
      .sort((a, b) => {
        if (a.current !== b.current) return a.current ? -1 : 1;
        return a.label.localeCompare(b.label, 'es', { sensitivity: 'base' });
      });
  }, [athleteScopedSessions, selectedAthlete, selectedAthleteKey]);

  const trainingTypeFilters = useMemo<TrainingTypeFilter[]>(() => {
    if (selectedAthleteKey === 'all') return [];

    const names = new Map<string, string>();
    athleteScopedSessions.forEach(session => {
      const clean = session.trainingType?.trim();
      if (clean) names.set(normalizedKey(clean), clean);
    });

    return [...names.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
  }, [athleteScopedSessions, selectedAthleteKey]);

  const categoryScopedSessions = useMemo(
    () =>
      selectedCategoryKey === 'all'
        ? athleteScopedSessions
        : athleteScopedSessions.filter(
            session => normalizedKey(session.athleteCategory) === selectedCategoryKey,
          ),
    [athleteScopedSessions, selectedCategoryKey],
  );

  const filteredSessions = useMemo(
    () =>
      selectedTrainingTypeKey === 'all'
        ? categoryScopedSessions
        : categoryScopedSessions.filter(
            session => normalizedKey(session.trainingType) === selectedTrainingTypeKey,
          ),
    [categoryScopedSessions, selectedTrainingTypeKey],
  );

  const selectAthlete = useCallback(
    (athlete: AthleteFilter) => {
      setSelectedAthleteKey(athlete.key);
      const profile = athletes.find(
        item => item.id === athlete.key || normalizedKey(item.name) === normalizedKey(athlete.label),
      );
      const currentCategory = normalizedKey(profile?.category);
      setSelectedCategoryKey(currentCategory || 'all');
      setSelectedTrainingTypeKey('all');
    },
    [athletes],
  );

  const clearAthleteFilter = useCallback(() => {
    setSelectedAthleteKey('all');
    setSelectedCategoryKey('all');
    setSelectedTrainingTypeKey('all');
  }, []);

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
  const filtered =
    selectedAthleteKey !== 'all' ||
    selectedCategoryKey !== 'all' ||
    selectedTrainingTypeKey !== 'all';

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
              icon="people-outline"
              selected={selectedAthleteKey === 'all'}
              onPress={clearAthleteFilter}
              colors={colors}
            />
            {athleteFilters.map(athlete => (
              <FilterChip
                key={athlete.key}
                label={athlete.label}
                icon="person-outline"
                selected={selectedAthleteKey === athlete.key}
                onPress={() => selectAthlete(athlete)}
                colors={colors}
              />
            ))}
          </ScrollView>

          {selectedAthleteKey !== 'all' && categoryFilters.length > 1 && (
            <>
              <Text style={[styles.filterLabel, styles.secondaryFilterLabel, { color: colors.mutedForeground }]}>CATEGORÍA</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
              >
                <FilterChip
                  label="Todas"
                  icon="layers-outline"
                  selected={selectedCategoryKey === 'all'}
                  onPress={() => setSelectedCategoryKey('all')}
                  colors={colors}
                />
                {categoryFilters.map(category => (
                  <FilterChip
                    key={category.key}
                    label={category.current ? `${category.label} · Actual` : category.label}
                    icon={category.current ? 'ribbon' : 'ribbon-outline'}
                    selected={selectedCategoryKey === category.key}
                    onPress={() => setSelectedCategoryKey(category.key)}
                    colors={colors}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {selectedAthleteKey !== 'all' && trainingTypeFilters.length > 1 && (
            <>
              <Text style={[styles.filterLabel, styles.secondaryFilterLabel, { color: colors.mutedForeground }]}>TIPO DE ENTRENAMIENTO</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
              >
                <FilterChip
                  label="Todos"
                  icon="fitness-outline"
                  selected={selectedTrainingTypeKey === 'all'}
                  onPress={() => setSelectedTrainingTypeKey('all')}
                  colors={colors}
                />
                {trainingTypeFilters.map(trainingType => (
                  <FilterChip
                    key={trainingType.key}
                    label={trainingType.label}
                    icon="stopwatch-outline"
                    selected={selectedTrainingTypeKey === trainingType.key}
                    onPress={() => setSelectedTrainingTypeKey(trainingType.key)}
                    colors={colors}
                  />
                ))}
              </ScrollView>
            </>
          )}
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
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Completa tu primer entrenamiento para verlo aquí</Text>
        </View>
      ) : filteredSessions.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="filter-outline" size={50} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin sesiones para este filtro</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Prueba otra categoría, tipo de entrenamiento o selecciona todos.</Text>
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
  icon,
  selected,
  onPress,
  colors,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
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
        name={selected && icon === 'person-outline' ? 'person' : icon}
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
  secondaryFilterLabel: { marginTop: 10 },
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
