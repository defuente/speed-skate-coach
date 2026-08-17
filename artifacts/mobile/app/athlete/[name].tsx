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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Athlete, Session } from '@/types/training';
import {
  deleteAthlete,
  getAthleteProfiles,
  getAthleteSessions,
  normalizeAthleteName,
  updateAthlete,
} from '@/utils/storage';
import { calculateStats, formatDateShort, formatTime } from '@/utils/calculations';
import { SessionCard } from '@/components/SessionCard';

interface PersonalRecord {
  distance: number;
  lapTime: number;
  date: string;
}

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

  const stats = useMemo(() => {
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

    const sessionsWithLaps = sessions.filter(session => session.laps.length > 0);
    const averageConsistency = sessionsWithLaps.length
      ? sessionsWithLaps.reduce(
          (sum, session) =>
            sum + calculateStats(session.laps, session.distancePerLap, session.targetLapTimeMs).consistency,
          0,
        ) / sessionsWithLaps.length
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

  const evolutionSessions = [...sessions]
    .reverse()
    .slice(-10)
    .filter(session => session.laps.length > 0);
  const evolutionData = evolutionSessions.map(
    session => calculateStats(session.laps, session.distancePerLap).bestLap?.lapTime ?? 0,
  );
  const evolutionLabels = evolutionSessions.map(session => formatDateShort(session.date));

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
            router.replace('/(tabs)/athletes');
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
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + webTop + 12, borderBottomColor: colors.border },
          ]}
        >
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
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + webTop + 12, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={27} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {athlete.name}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={openEdit}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="pencil-outline" size={19} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={removeAthlete}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="trash-outline" size={19} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
      >
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
            {athlete.birthDate && (
              <ProfileRow icon="calendar-outline" label="Nacimiento" value={athlete.birthDate} colors={colors} />
            )}
            {athlete.category && (
              <ProfileRow icon="ribbon-outline" label="Categoría" value={athlete.category} colors={colors} />
            )}
            {athlete.club && (
              <ProfileRow icon="shield-outline" label="Club / equipo" value={athlete.club} colors={colors} />
            )}
            {athlete.notes && (
              <ProfileRow icon="document-text-outline" label="Observaciones" value={athlete.notes} colors={colors} />
            )}
          </View>
        )}

        <View style={styles.grid}>
          <Stat icon="layers-outline" label="Sesiones" value={String(sessions.length)} colors={colors} />
          <Stat icon="flag-outline" label="Vueltas" value={String(stats.totalLaps)} colors={colors} />
          <Stat
            icon="trophy-outline"
            label="Mejor vuelta"
            value={stats.bestLap ? formatTime(stats.bestLap) : '—'}
            colors={colors}
            accent={stats.bestLap ? colors.lapBest : undefined}
          />
          <Stat icon="time-outline" label="Tiempo total" value={formatTime(stats.totalTime)} colors={colors} />
          <Stat icon="navigate-outline" label="Distancia" value={`${stats.totalDistance.toFixed(2)} km`} colors={colors} />
          <Stat
            icon="speedometer-outline"
            label="Velocidad máx."
            value={stats.maxSpeed ? `${stats.maxSpeed.toFixed(1)} km/h` : '—'}
            colors={colors}
            accent={stats.maxSpeed ? colors.primary : undefined}
          />
          {stats.volumeSessions > 0 && (
            <Stat
              icon="checkmark-done-outline"
              label="Volumen medio"
              value={`${Math.round(stats.averageVolume)}%`}
              colors={colors}
              accent={stats.averageVolume >= 80 ? colors.lapBest : colors.primary}
            />
          )}
          {stats.paceSessions > 0 && (
            <Stat
              icon="speedometer-outline"
              label="Ritmo cumplido"
              value={`${Math.round(stats.averagePaceCompliance)}%`}
              colors={colors}
              accent={stats.averagePaceCompliance >= 80 ? colors.lapBest : colors.primary}
            />
          )}
          {sessions.some(session => session.laps.length > 0) && (
            <Stat
              icon="pulse-outline"
              label="Consistencia media"
              value={`${stats.averageConsistency.toFixed(1)}%`}
              colors={colors}
            />
          )}
        </View>

        {personalRecords.length > 0 && (
          <View style={[styles.recordsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Récords personales por distancia</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
              Se comparan solo vueltas con la misma distancia configurada
            </Text>
            {personalRecords.map(record => (
              <View key={record.distance} style={[styles.recordRow, { borderTopColor: colors.border }]}>
                <View>
                  <Text style={[styles.recordDistance, { color: colors.foreground }]}>{record.distance} m</Text>
                  <Text style={[styles.recordDate, { color: colors.mutedForeground }]}>
                    {formatDateShort(record.date)}
                  </Text>
                </View>
                <View style={styles.recordValueWrap}>
                  <Ionicons name="trophy" size={16} color={colors.lapBest} />
                  <Text style={[styles.recordValue, { color: colors.lapBest }]}>{formatTime(record.lapTime)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {evolutionData.length > 1 && (
          <View style={[styles.chart, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Evolución de mejor vuelta</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Últimas sesiones · menor tiempo es mejor</Text>
            <Chart data={evolutionData} labels={evolutionLabels} colors={colors} />
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
              onPress={() => router.push(`/session/${session.id}`)}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditVisible(false)}
      >
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
              <ProfileInput
                label="FECHA DE NACIMIENTO"
                value={editBirthDate}
                onChangeText={setEditBirthDate}
                placeholder="Ej. 2019-08-09"
                colors={colors}
              />
              <ProfileInput
                label="CATEGORÍA"
                value={editCategory}
                onChangeText={setEditCategory}
                placeholder="Ej. Mini / Infantil"
                colors={colors}
              />
              <ProfileInput
                label="CLUB / EQUIPO"
                value={editClub}
                onChangeText={setEditClub}
                placeholder="Ej. Colo Colo"
                colors={colors}
              />
              <ProfileInput
                label="OBSERVACIONES"
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Notas del entrenador"
                colors={colors}
                multiline
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setEditVisible(false)}
                style={[styles.modalBtn, { backgroundColor: colors.secondary }]}
              >
                <Text style={{ color: colors.foreground }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={saving}
                onPress={saveProfile}
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: colors.primaryForeground }}>{saving ? 'Guardando…' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ProfileInput({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
  multiline?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground },
        ]}
      />
    </View>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
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

function Stat({
  icon,
  label,
  value,
  colors,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  accent?: string;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={accent ?? colors.primary} />
      <Text style={[styles.statVal, { color: accent ?? colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function Chart({
  data,
  labels,
  colors,
}: {
  data: number[];
  labels: string[];
  colors: ReturnType<typeof useColors>;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 145;
  const low = 32;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16 }}>
      <View style={styles.bars}>
        {data.map((value, index) => {
          const barHeight = height - ((value - min) / range) * (height - low);
          const best = value === min;
          return (
            <View key={`${labels[index]}-${index}`} style={styles.barCol}>
              <Text style={[styles.barVal, { color: best ? colors.lapBest : colors.foreground }]}>
                {formatTime(value)}
              </Text>
              <View style={[styles.track, { height }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: best ? colors.lapBest : `${colors.primary}75`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLbl, { color: colors.mutedForeground }]}>{labels[index]}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
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
  chart: { marginHorizontal: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  sectionSub: { fontSize: 11, marginTop: 2 },
  sessionsHead: { marginHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  none: { marginHorizontal: 16, padding: 24, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  barCol: { width: 66, alignItems: 'center', gap: 7 },
  barVal: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  track: { width: 44, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6 },
  barLbl: { fontSize: 10 },
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
