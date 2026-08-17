import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Athlete, Session, TRAINING_TYPES, TrainingType } from '@/types/training';
import {
  deleteAthlete,
  getAthleteProfiles,
  getAthleteSessions,
  normalizeAthleteName,
  updateAthlete,
} from '@/utils/storage';
import { calculateStats, formatDateShort, formatTime } from '@/utils/calculations';
import {
  AthleteMetric,
  buildMetricSeries,
  buildPerformanceInsights,
  compareSessions,
  filterAthleteSessions,
  findPreviousComparableSession,
  getAvailableDistances,
} from '@/utils/athleteAnalytics';
import { SessionCard } from '@/components/SessionCard';

interface PersonalRecord {
  distance: number;
  lapTime: number;
  date: string;
}

const METRICS: { key: AthleteMetric; label: string; lowerIsBetter: boolean }[] = [
  { key: 'bestLap', label: 'Mejor vuelta', lowerIsBetter: true },
  { key: 'averageLap', label: 'Promedio', lowerIsBetter: true },
  { key: 'consistency', label: 'Consistencia', lowerIsBetter: true },
  { key: 'averageSpeed', label: 'Vel. media', lowerIsBetter: false },
  { key: 'paceCompliance', label: 'Ritmo', lowerIsBetter: false },
  { key: 'volumeCompliance', label: 'Volumen', lowerIsBetter: false },
];

export default function AthleteDetailScreen() {
  const params = useLocalSearchParams<{ name: string }>();
  const identifier = Array.isArray(params.name) ? params.name[0] : params.name || '';
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editClub, setEditClub] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [rangeDays, setRangeDays] = useState<number | undefined>();
  const [distanceFilter, setDistanceFilter] = useState<number | undefined>();
  const [trainingTypeFilter, setTrainingTypeFilter] = useState<TrainingType | undefined>();
  const [metric, setMetric] = useState<AthleteMetric>('bestLap');

  const load = useCallback(async () => {
    const profiles = await getAthleteProfiles();
    const key = normalizeAthleteName(identifier);
    const found = profiles.find(
      profile => profile.id === identifier || normalizeAthleteName(profile.name) === key,
    ) ?? null;

    setAthlete(found);
    setSessions(found ? await getAthleteSessions(found.id) : []);
    setLoading(false);
  }, [identifier]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const summaryStats = useMemo(() => {
    const allLaps = sessions.flatMap(session => session.laps);
    const totalTime = sessions.reduce((sum, session) => sum + session.totalTime, 0);
    const totalDistance = sessions.reduce(
      (sum, session) => sum + (session.distancePerLap * session.laps.length) / 1000,
      0,
    );
    const bestLap = allLaps.length ? Math.min(...allLaps.map(lap => lap.lapTime)) : 0;
    const speeds = allLaps.map(lap => lap.speed ?? 0).filter(value => value > 0);
    const maxSpeed = speeds.length ? Math.max(...speeds) : 0;

    const volumeSessions = sessions.filter(
      session => session.targetLapCount && session.targetLapCount > 0,
    );
    const averageVolume = volumeSessions.length
      ? volumeSessions.reduce(
          (sum, session) =>
            sum + Math.min(100, (session.laps.length / session.targetLapCount!) * 100),
          0,
        ) / volumeSessions.length
      : 0;

    const paceSessions = sessions.filter(
      session => session.targetLapTimeMs && session.targetLapTimeMs > 0 && session.laps.length > 0,
    );
    const averagePaceCompliance = paceSessions.length
      ? paceSessions.reduce(
          (sum, session) =>
            sum + calculateStats(session.laps, session.distancePerLap, session.targetLapTimeMs).targetCompliance,
          0,
        ) / paceSessions.length
      : 0;

    const consistencySessions = sessions.filter(session => session.laps.length > 1);
    const averageConsistency = consistencySessions.length
      ? consistencySessions.reduce(
          (sum, session) => sum + calculateStats(session.laps, session.distancePerLap).consistency,
          0,
        ) / consistencySessions.length
      : 0;

    return {
      totalLaps: allLaps.length,
      totalTime,
      totalDistance,
      bestLap,
      maxSpeed,
      volumeSessions: volumeSessions.length,
      averageVolume,
      paceSessions: paceSessions.length,
      averagePaceCompliance,
      consistencySessions: consistencySessions.length,
      averageConsistency,
    };
  }, [sessions]);

  const personalRecords = useMemo<PersonalRecord[]>(() => {
    const byDistance = new Map<number, PersonalRecord>();
    for (const session of sessions) {
      if (session.distancePerLap <= 0 || !session.laps.length) continue;
      const bestLap = calculateStats(session.laps, session.distancePerLap).bestLap;
      if (!bestLap) continue;
      const current = byDistance.get(session.distancePerLap);
      if (!current || bestLap.lapTime < current.lapTime) {
        byDistance.set(session.distancePerLap, {
          distance: session.distancePerLap,
          lapTime: bestLap.lapTime,
          date: session.date,
        });
      }
    }
    return [...byDistance.values()].sort((a, b) => a.distance - b.distance);
  }, [sessions]);

  const availableDistances = useMemo(() => getAvailableDistances(sessions), [sessions]);
  const availableTypes = useMemo(
    () => TRAINING_TYPES.filter(type => sessions.some(session => session.trainingType === type)),
    [sessions],
  );

  const filteredSessions = useMemo(
    () =>
      filterAthleteSessions(sessions, {
        rangeDays,
        distancePerLap: distanceFilter,
        trainingType: trainingTypeFilter,
      }),
    [sessions, rangeDays, distanceFilter, trainingTypeFilter],
  );

  const metricDefinition = METRICS.find(item => item.key === metric) ?? METRICS[0];
  const metricSeries = useMemo(
    () => buildMetricSeries(filteredSessions, metric, 12),
    [filteredSessions, metric],
  );

  const latestSession = useMemo(
    () =>
      [...sessions]
        .filter(session => session.laps.length > 0)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0],
    [sessions],
  );
  const previousComparable = latestSession
    ? findPreviousComparableSession(sessions, latestSession)
    : undefined;
  const comparison = latestSession && previousComparable
    ? compareSessions(latestSession, previousComparable)
    : null;
  const insights = latestSession
    ? buildPerformanceInsights(latestSession, previousComparable)
    : [];

  const openEdit = () => {
    if (!athlete) return;
    setEditName(athlete.name);
    setEditBirthDate(athlete.birthDate ?? '');
    setEditCategory(athlete.category ?? '');
    setEditClub(athlete.club ?? '');
    setEditNotes(athlete.notes ?? '');
    setEditVisible(true);
  };

  const saveProfile = useCallback(async () => {
    if (!athlete) return;
    const cleanName = editName.trim();
    if (!cleanName) {
      Alert.alert('Nombre requerido', 'Ingresa un nombre para el deportista.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateAthlete(athlete.id, {
        name: cleanName,
        birthDate: editBirthDate.trim() || undefined,
        category: editCategory.trim() || undefined,
        club: editClub.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });
      setAthlete(updated);
      setSessions(await getAthleteSessions(updated.id));
      setEditVisible(false);
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error ? error.message : 'Ocurrió un error al actualizar el deportista.',
      );
    } finally {
      setSaving(false);
    }
  }, [athlete, editBirthDate, editCategory, editClub, editName, editNotes]);

  const removeAthlete = useCallback(() => {
    if (!athlete) return;
    Alert.alert(
      'Eliminar deportista',
      `¿Eliminar a ${athlete.name} y todas sus sesiones? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteAthlete(athlete.id);
            router.replace('/(tabs)/athletes' as unknown as Href);
          },
        },
      ],
    );
  }, [athlete, router]);

  const webTop = Platform.OS === 'web' ? 67 : 0;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!athlete) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + webTop + 12, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={27} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Deportista</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Text style={{ color: colors.mutedForeground }}>No se encontró el deportista.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={27} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {athlete.name}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={openEdit} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="pencil-outline" size={19} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={removeAthlete} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="trash-outline" size={19} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}>
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="person" size={34} color={colors.primary} />
          </View>
          <View style={styles.heroBody}>
            <Text style={[styles.name, { color: colors.foreground }]}>{athlete.name}</Text>
            <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
              {sessions.length} sesión{sessions.length !== 1 ? 'es' : ''} registradas
            </Text>
            {(athlete.category || athlete.club) && (
              <Text style={[styles.identityMeta, { color: colors.primary }]}>
                {[athlete.category, athlete.club].filter(Boolean).join(' · ')}
              </Text>
            )}
          </View>
        </View>

        {(athlete.birthDate || athlete.category || athlete.club || athlete.notes) && (
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ficha del deportista</Text>
            {athlete.birthDate && <ProfileRow icon="calendar-outline" label="Nacimiento" value={athlete.birthDate} colors={colors} />}
            {athlete.category && <ProfileRow icon="ribbon-outline" label="Categoría" value={athlete.category} colors={colors} />}
            {athlete.club && <ProfileRow icon="shield-outline" label="Club / equipo" value={athlete.club} colors={colors} />}
            {athlete.notes && <ProfileRow icon="document-text-outline" label="Observaciones" value={athlete.notes} colors={colors} />}
          </View>
        )}

        <View style={styles.grid}>
          <Stat icon="layers-outline" label="Sesiones" value={String(sessions.length)} colors={colors} />
          <Stat icon="flag-outline" label="Vueltas" value={String(summaryStats.totalLaps)} colors={colors} />
          <Stat icon="trophy-outline" label="Mejor vuelta" value={summaryStats.bestLap ? formatTime(summaryStats.bestLap) : '—'} colors={colors} accent={summaryStats.bestLap ? colors.lapBest : undefined} />
          <Stat icon="time-outline" label="Tiempo total" value={formatTime(summaryStats.totalTime)} colors={colors} />
          <Stat icon="navigate-outline" label="Distancia" value={`${summaryStats.totalDistance.toFixed(2)} km`} colors={colors} />
          <Stat icon="speedometer-outline" label="Velocidad máx." value={summaryStats.maxSpeed ? `${summaryStats.maxSpeed.toFixed(1)} km/h` : '—'} colors={colors} accent={summaryStats.maxSpeed ? colors.primary : undefined} />
          {summaryStats.volumeSessions > 0 && <Stat icon="checkmark-done-outline" label="Volumen medio" value={`${Math.round(summaryStats.averageVolume)}%`} colors={colors} accent={summaryStats.averageVolume >= 80 ? colors.lapBest : colors.primary} />}
          {summaryStats.paceSessions > 0 && <Stat icon="speedometer-outline" label="Ritmo cumplido" value={`${Math.round(summaryStats.averagePaceCompliance)}%`} colors={colors} accent={summaryStats.averagePaceCompliance >= 80 ? colors.lapBest : colors.primary} />}
          {summaryStats.consistencySessions > 0 && <Stat icon="pulse-outline" label="Consistencia media" value={`${summaryStats.averageConsistency.toFixed(1)}%`} colors={colors} />}
        </View>

        {personalRecords.length > 0 && (
          <View style={[styles.recordsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Récords personales por distancia</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Solo se comparan vueltas con la misma distancia configurada</Text>
            {personalRecords.map(record => (
              <View key={record.distance} style={[styles.recordRow, { borderTopColor: colors.border }]}>
                <View>
                  <Text style={[styles.recordDistance, { color: colors.foreground }]}>{record.distance} m</Text>
                  <Text style={[styles.recordDate, { color: colors.mutedForeground }]}>{formatDateShort(record.date)}</Text>
                </View>
                <View style={styles.recordValueWrap}>
                  <Ionicons name="trophy" size={16} color={colors.lapBest} />
                  <Text style={[styles.recordValue, { color: colors.lapBest }]}>{formatTime(record.lapTime)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {sessions.length > 0 && (
          <View style={[styles.analyticsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Analítica avanzada</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Filtra sesiones comparables y elige la métrica que quieres seguir</Text>

            <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>PERÍODO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <FilterChip label="Todo" selected={rangeDays === undefined} onPress={() => setRangeDays(undefined)} colors={colors} />
              <FilterChip label="30 días" selected={rangeDays === 30} onPress={() => setRangeDays(30)} colors={colors} />
              <FilterChip label="90 días" selected={rangeDays === 90} onPress={() => setRangeDays(90)} colors={colors} />
            </ScrollView>

            {availableDistances.length > 1 && (
              <>
                <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>DISTANCIA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  <FilterChip label="Todas" selected={distanceFilter === undefined} onPress={() => setDistanceFilter(undefined)} colors={colors} />
                  {availableDistances.map(distance => (
                    <FilterChip key={distance} label={`${distance} m`} selected={distanceFilter === distance} onPress={() => setDistanceFilter(distance)} colors={colors} />
                  ))}
                </ScrollView>
              </>
            )}

            {availableTypes.length > 1 && (
              <>
                <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>TIPO DE ENTRENAMIENTO</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  <FilterChip label="Todos" selected={trainingTypeFilter === undefined} onPress={() => setTrainingTypeFilter(undefined)} colors={colors} />
                  {availableTypes.map(type => (
                    <FilterChip key={type} label={type} selected={trainingTypeFilter === type} onPress={() => setTrainingTypeFilter(type)} colors={colors} />
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>MÉTRICA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {METRICS.map(item => (
                <FilterChip key={item.key} label={item.label} selected={metric === item.key} onPress={() => setMetric(item.key)} colors={colors} />
              ))}
            </ScrollView>

            <View style={styles.filteredSummary}>
              <Text style={[styles.filteredCount, { color: colors.foreground }]}>{filteredSessions.length}</Text>
              <Text style={[styles.filteredText, { color: colors.mutedForeground }]}>sesiones dentro del filtro</Text>
            </View>

            {metricSeries.length > 1 ? (
              <MetricChart
                data={metricSeries.map(point => point.value)}
                labels={metricSeries.map(point => formatDateShort(point.date))}
                metric={metric}
                lowerIsBetter={metricDefinition.lowerIsBetter}
                colors={colors}
              />
            ) : (
              <View style={[styles.noChart, { borderColor: colors.border }]}>
                <Text style={[styles.noChartText, { color: colors.mutedForeground }]}>Necesitas al menos 2 sesiones con esta métrica y estos filtros.</Text>
              </View>
            )}
          </View>
        )}

        {latestSession && (
          <View style={[styles.compareCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Lectura de la última sesión</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Comparación con la anterior de igual distancia y tipo cuando existe</Text>

            <View style={[styles.compareContext, { backgroundColor: colors.background }]}>
              <Text style={[styles.compareContextTitle, { color: colors.foreground }]}>{latestSession.trainingType} · {latestSession.distancePerLap} m/v</Text>
              <Text style={[styles.compareContextDate, { color: colors.mutedForeground }]}>{formatDateShort(latestSession.date)}{previousComparable ? ` vs ${formatDateShort(previousComparable.date)}` : ' · sin sesión comparable anterior'}</Text>
            </View>

            {comparison && (
              <View style={styles.comparisonRows}>
                <ComparisonRow label="Mejor vuelta" current={comparison.current.bestLap} previous={comparison.previous.bestLap} delta={comparison.bestLapDeltaMs} kind="time" lowerIsBetter colors={colors} />
                <ComparisonRow label="Promedio" current={comparison.current.averageLap} previous={comparison.previous.averageLap} delta={comparison.averageLapDeltaMs} kind="time" lowerIsBetter colors={colors} />
                <ComparisonRow label="Consistencia" current={comparison.current.consistency} previous={comparison.previous.consistency} delta={comparison.consistencyDeltaPoints} kind="percent" lowerIsBetter colors={colors} />
                <ComparisonRow label="Vel. media" current={comparison.current.averageSpeed} previous={comparison.previous.averageSpeed} delta={comparison.averageSpeedDeltaKmh} kind="speed" colors={colors} />
                <ComparisonRow label="Ritmo" current={comparison.current.paceCompliance} previous={comparison.previous.paceCompliance} delta={comparison.paceComplianceDeltaPoints} kind="percent" colors={colors} />
                <ComparisonRow label="Volumen" current={comparison.current.volumeCompliance} previous={comparison.previous.volumeCompliance} delta={comparison.volumeComplianceDeltaPoints} kind="percent" colors={colors} />
              </View>
            )}

            {insights.length > 0 && (
              <View style={styles.insights}>
                {insights.map((insight, index) => (
                  <View key={`${index}-${insight}`} style={styles.insightRow}>
                    <Ionicons name="analytics-outline" size={15} color={colors.primary} />
                    <Text style={[styles.insightText, { color: colors.foreground }]}>{insight}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.sessionsHead}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Sesiones</Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{sessions.length} en total</Text>
        </View>

        {sessions.length === 0 ? (
          <View style={[styles.none, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.mutedForeground }}>Sin entrenamientos registrados.</Text>
          </View>
        ) : (
          sessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onPress={() => router.push(`/session/${session.id}` as unknown as Href)}
            />
          ))
        )}
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Editar deportista</Text>
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>Datos útiles para seguimiento deportivo</Text>
              </View>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <ProfileInput label="NOMBRE" value={editName} onChangeText={setEditName} placeholder="Nombre" colors={colors} />
              <ProfileInput label="FECHA DE NACIMIENTO" value={editBirthDate} onChangeText={setEditBirthDate} placeholder="Ej. 2019-08-09" colors={colors} />
              <ProfileInput label="CATEGORÍA" value={editCategory} onChangeText={setEditCategory} placeholder="Ej. Mini / Infantil" colors={colors} />
              <ProfileInput label="CLUB / EQUIPO" value={editClub} onChangeText={setEditClub} placeholder="Ej. Colo Colo" colors={colors} />
              <ProfileInput label="OBSERVACIONES" value={editNotes} onChangeText={setEditNotes} placeholder="Notas del entrenador" colors={colors} multiline />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditVisible(false)} style={[styles.modalBtn, { backgroundColor: colors.secondary }]}>
                <Text style={{ color: colors.foreground }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={saving} onPress={saveProfile} style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: colors.primaryForeground }}>{saving ? 'Guardando…' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FilterChip({ label, selected, onPress, colors }: { label: string; selected: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.filterChip, { backgroundColor: selected ? colors.primary : colors.background, borderColor: selected ? colors.primary : colors.border }]}>
      <Text style={[styles.filterChipText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MetricChart({ data, labels, metric, lowerIsBetter, colors }: { data: number[]; labels: string[]; metric: AthleteMetric; lowerIsBetter: boolean; colors: ReturnType<typeof useColors> }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 150;
  const low = 30;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
      <View style={styles.bars}>
        {data.map((value, index) => {
          const normalized = (value - min) / range;
          const barHeight = lowerIsBetter
            ? height - normalized * (height - low)
            : low + normalized * (height - low);
          const best = lowerIsBetter ? value === min : value === max;
          return (
            <View key={`${labels[index]}-${index}`} style={styles.barCol}>
              <Text style={[styles.barVal, { color: best ? colors.lapBest : colors.foreground }]}>{formatMetricValue(metric, value)}</Text>
              <View style={[styles.track, { height }]}>
                <View style={[styles.bar, { height: barHeight, backgroundColor: best ? colors.lapBest : `${colors.primary}75` }]} />
              </View>
              <Text style={[styles.barLbl, { color: colors.mutedForeground }]}>{labels[index]}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function ComparisonRow({ label, current, previous, delta, kind, lowerIsBetter = false, colors }: { label: string; current: number | null; previous: number | null; delta: number | null; kind: 'time' | 'percent' | 'speed'; lowerIsBetter?: boolean; colors: ReturnType<typeof useColors> }) {
  if (current === null || previous === null || delta === null) return null;
  const improved = Math.abs(delta) < 0.0001 ? null : lowerIsBetter ? delta < 0 : delta > 0;
  const accent = improved === null ? colors.mutedForeground : improved ? colors.lapBest : colors.lapWorst;
  return (
    <View style={[styles.comparisonRow, { borderTopColor: colors.border }]}>
      <View style={styles.comparisonLabelWrap}>
        <Text style={[styles.comparisonLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.comparisonPrevious, { color: colors.mutedForeground }]}>Anterior {formatComparisonValue(kind, previous)}</Text>
      </View>
      <View style={styles.comparisonCurrentWrap}>
        <Text style={[styles.comparisonCurrent, { color: colors.foreground }]}>{formatComparisonValue(kind, current)}</Text>
        <Text style={[styles.comparisonDelta, { color: accent }]}>{formatDelta(kind, delta)}</Text>
      </View>
    </View>
  );
}

function ProfileInput({ label, value, onChangeText, placeholder, colors, multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; colors: ReturnType<typeof useColors>; multiline?: boolean }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} multiline={multiline} style={[styles.input, multiline && styles.inputMultiline, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]} />
    </View>
  );
}

function ProfileRow({ icon, label, value, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.profileRow}>
      <Ionicons name={icon} size={17} color={colors.primary} />
      <View style={styles.profileRowBody}>
        <Text style={[styles.profileLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.profileValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

function Stat({ icon, label, value, colors, accent }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; colors: ReturnType<typeof useColors>; accent?: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={accent ?? colors.primary} />
      <Text style={[styles.statVal, { color: accent ?? colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function formatMetricValue(metric: AthleteMetric, value: number): string {
  if (metric === 'bestLap' || metric === 'averageLap') return formatTime(value);
  if (metric === 'averageSpeed') return `${value.toFixed(1)}`;
  return `${value.toFixed(1)}%`;
}

function formatComparisonValue(kind: 'time' | 'percent' | 'speed', value: number): string {
  if (kind === 'time') return formatTime(value);
  if (kind === 'speed') return `${value.toFixed(1)} km/h`;
  return `${value.toFixed(1)}%`;
}

function formatDelta(kind: 'time' | 'percent' | 'speed', value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  const absolute = Math.abs(value);
  if (kind === 'time') return `Δ ${sign}${(absolute / 1000).toFixed(2)} s`;
  if (kind === 'speed') return `Δ ${sign}${absolute.toFixed(1)} km/h`;
  return `Δ ${sign}${absolute.toFixed(1)} pp`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: 'Inter_700Bold' },
  headerSpacer: { width: 38 },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: 14, gap: 12 },
  hero: { marginHorizontal: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  heroBody: { flex: 1 },
  name: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  heroSub: { fontSize: 12, marginTop: 2 },
  identityMeta: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 5 },
  profileCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10 },
  profileRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  profileRowBody: { flex: 1 },
  profileLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  profileValue: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 1, lineHeight: 18 },
  grid: { marginHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '48%', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 13, gap: 4 },
  statVal: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  statLbl: { fontSize: 10 },
  recordsCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 11, marginTop: 11 },
  recordDistance: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  recordDate: { fontSize: 10, marginTop: 2 },
  recordValueWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recordValue: { fontSize: 16, fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] },
  analyticsCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 8 },
  filterLabel: { fontSize: 9, letterSpacing: 0.8, fontFamily: 'Inter_600SemiBold', marginTop: 5 },
  chipRow: { gap: 7, paddingRight: 8 },
  filterChip: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7 },
  filterChipText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  filteredSummary: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 4 },
  filteredCount: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  filteredText: { fontSize: 11 },
  chartScroll: { paddingTop: 8, paddingRight: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  barCol: { width: 66, alignItems: 'center', gap: 7 },
  barVal: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  track: { width: 44, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6 },
  barLbl: { fontSize: 9 },
  noChart: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 18, alignItems: 'center', marginTop: 4 },
  noChartText: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  compareCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 9 },
  compareContext: { borderRadius: 10, padding: 10 },
  compareContextTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  compareContextDate: { fontSize: 10, marginTop: 2 },
  comparisonRows: { marginTop: 2 },
  comparisonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 9, marginTop: 9, gap: 10 },
  comparisonLabelWrap: { flex: 1 },
  comparisonLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  comparisonPrevious: { fontSize: 9, marginTop: 2 },
  comparisonCurrentWrap: { alignItems: 'flex-end' },
  comparisonCurrent: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  comparisonDelta: { fontSize: 9, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  insights: { gap: 7, marginTop: 4 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  insightText: { flex: 1, fontSize: 11, lineHeight: 16 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  sectionSub: { fontSize: 11, marginTop: 2 },
  sessionsHead: { marginHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  none: { marginHorizontal: 16, padding: 24, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'center', padding: 22 },
  modal: { maxHeight: '88%', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 18, gap: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  modalTitle: { fontSize: 19, fontFamily: 'Inter_700Bold' },
  modalSubtitle: { fontSize: 11, marginTop: 2 },
  inputGroup: { gap: 5, marginBottom: 10 },
  inputLabel: { fontSize: 10, letterSpacing: 0.7, fontFamily: 'Inter_600SemiBold' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  inputMultiline: { minHeight: 82, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10 },
});
