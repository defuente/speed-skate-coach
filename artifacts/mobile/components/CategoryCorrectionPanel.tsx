import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Athlete, AthleteCategoryHistoryEntry, Session } from '@/types/training';
import {
  deleteAthleteCategoryHistoryEntry,
  reassignAthleteCategorySessions,
  reassignAthleteSessionCategory,
} from '@/utils/storage';
import { formatDateShort } from '@/utils/calculations';

interface Props {
  athlete: Athlete;
  sessions: Session[];
  onChanged: () => Promise<void> | void;
}

function categoryKey(value?: string): string {
  return value?.trim().toLocaleLowerCase() ?? '';
}

function sessionMatchesEntry(
  session: Session,
  entry: AthleteCategoryHistoryEntry,
): boolean {
  if (session.athleteCategoryHistoryId) {
    return session.athleteCategoryHistoryId === entry.id;
  }
  return categoryKey(session.athleteCategory) === categoryKey(entry.category);
}

function formatHistoryDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export function CategoryCorrectionPanel({ athlete, sessions, onChanged }: Props) {
  const colors = useColors();
  const [selectedEntry, setSelectedEntry] = useState<AthleteCategoryHistoryEntry | null>(null);
  const [targetEntryId, setTargetEntryId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const history = useMemo(
    () =>
      [...(athlete.categoryHistory ?? [])].sort(
        (a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime(),
      ),
    [athlete.categoryHistory],
  );

  const affectedSessions = useMemo(
    () =>
      selectedEntry
        ? sessions.filter(session => sessionMatchesEntry(session, selectedEntry))
        : [],
    [selectedEntry, sessions],
  );

  const destinationEntries = useMemo(
    () => history.filter(entry => entry.id !== selectedEntry?.id),
    [history, selectedEntry?.id],
  );

  const targetEntry = destinationEntries.find(entry => entry.id === targetEntryId);

  const openManager = (entry: AthleteCategoryHistoryEntry) => {
    setSelectedEntry(entry);
    setTargetEntryId(undefined);
  };

  const closeManager = () => {
    if (busy) return;
    setSelectedEntry(null);
    setTargetEntryId(undefined);
  };

  const refresh = async () => {
    await onChanged();
  };

  const moveSession = async (sessionId: string) => {
    if (!selectedEntry || !targetEntryId) {
      Alert.alert('Selecciona destino', 'Elige primero la categoría a la que quieres mover la sesión.');
      return;
    }
    setBusy(true);
    try {
      await reassignAthleteSessionCategory(athlete.id, sessionId, targetEntryId);
      await refresh();
    } catch (error) {
      Alert.alert(
        'No se pudo mover la sesión',
        error instanceof Error ? error.message : 'Ocurrió un error al reasignar la sesión.',
      );
    } finally {
      setBusy(false);
    }
  };

  const moveAll = () => {
    if (!selectedEntry || !targetEntryId || !targetEntry) {
      Alert.alert('Selecciona destino', 'Elige primero la categoría de destino.');
      return;
    }
    Alert.alert(
      'Mover todas las sesiones',
      `¿Mover ${affectedSessions.length} sesión${affectedSessions.length !== 1 ? 'es' : ''} de ${selectedEntry.category} a ${targetEntry.category}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mover',
          onPress: async () => {
            setBusy(true);
            try {
              await reassignAthleteCategorySessions(athlete.id, selectedEntry.id, targetEntryId);
              await refresh();
            } catch (error) {
              Alert.alert(
                'No se pudieron mover',
                error instanceof Error ? error.message : 'Ocurrió un error al reasignar las sesiones.',
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const deleteEntry = () => {
    if (!selectedEntry) return;
    const hasSessions = affectedSessions.length > 0;
    if (hasSessions && !targetEntryId) {
      Alert.alert(
        'La categoría tiene sesiones',
        'Selecciona una categoría de destino para esas sesiones antes de eliminar esta etapa.',
      );
      return;
    }

    const destinationText = hasSessions && targetEntry
      ? ` Las sesiones se moverán a ${targetEntry.category}.`
      : '';
    const currentText = !selectedEntry.validTo
      ? ' Al ser la categoría actual, la etapa anterior volverá a quedar vigente.'
      : '';

    Alert.alert(
      'Eliminar categoría',
      `¿Eliminar la etapa ${selectedEntry.category}?${destinationText}${currentText}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await deleteAthleteCategoryHistoryEntry(
                athlete.id,
                selectedEntry.id,
                hasSessions ? targetEntryId : undefined,
              );
              await refresh();
              setSelectedEntry(null);
              setTargetEntryId(undefined);
            } catch (error) {
              Alert.alert(
                'No se pudo eliminar',
                error instanceof Error ? error.message : 'Ocurrió un error al eliminar la categoría.',
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  if (!history.length) return null;

  return (
    <>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headingRow}>
          <View style={styles.headingBody}>
            <Text style={[styles.title, { color: colors.foreground }]}>Corregir categorías</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Reasigna sesiones o elimina una etapa registrada por error.
            </Text>
          </View>
          <Ionicons name="construct-outline" size={21} color={colors.primary} />
        </View>

        {history.map(entry => {
          const count = sessions.filter(session => sessionMatchesEntry(session, entry)).length;
          return (
            <TouchableOpacity
              key={entry.id}
              onPress={() => openManager(entry)}
              style={[styles.manageRow, { borderTopColor: colors.border }]}
            >
              <View style={styles.manageBody}>
                <Text style={[styles.categoryName, { color: colors.foreground }]}>{entry.category}</Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {count} sesión{count !== 1 ? 'es' : ''} · desde {formatHistoryDate(entry.validFrom)}
                  {!entry.validTo ? ' · actual' : ''}
                </Text>
              </View>
              <View style={[styles.manageBtn, { backgroundColor: `${colors.primary}14` }]}>
                <Text style={[styles.manageBtnText, { color: colors.primary }]}>Gestionar</Text>
                <Ionicons name="chevron-forward" size={15} color={colors.primary} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        visible={!!selectedEntry}
        transparent
        animationType="fade"
        onRequestClose={closeManager}
      >
        <View style={styles.backdrop}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.headingBody}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Gestionar categoría</Text>
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                  {selectedEntry?.category} · {affectedSessions.length} sesión{affectedSessions.length !== 1 ? 'es' : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={closeManager} disabled={busy}>
                <Ionicons name="close" size={23} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {destinationEntries.length > 0 ? (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MOVER A</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chips}
                  >
                    {destinationEntries.map(entry => {
                      const selected = targetEntryId === entry.id;
                      return (
                        <TouchableOpacity
                          key={entry.id}
                          disabled={busy}
                          onPress={() => setTargetEntryId(entry.id)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selected ? colors.primary : colors.background,
                              borderColor: selected ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: selected ? colors.primaryForeground : colors.foreground },
                            ]}
                          >
                            {entry.category} · {formatHistoryDate(entry.validFrom)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              ) : (
                <View style={[styles.warning, { backgroundColor: `${colors.primary}10` }]}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                  <Text style={[styles.warningText, { color: colors.foreground }]}>
                    No existe otra categoría de destino. Si esta categoría es incorrecta y tiene sesiones,
                    primero registra la categoría correcta desde “Editar deportista”.
                  </Text>
                </View>
              )}

              {affectedSessions.length > 0 && (
                <View style={styles.sessionBlock}>
                  <View style={styles.sessionHeading}>
                    <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SESIONES EN ESTA CATEGORÍA</Text>
                    <TouchableOpacity
                      disabled={busy || !targetEntryId}
                      onPress={moveAll}
                      style={[
                        styles.moveAllBtn,
                        { backgroundColor: targetEntryId ? `${colors.primary}18` : colors.secondary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.moveAllText,
                          { color: targetEntryId ? colors.primary : colors.mutedForeground },
                        ]}
                      >
                        Mover todas
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {affectedSessions.map(session => (
                    <View key={session.id} style={[styles.sessionRow, { borderTopColor: colors.border }]}>
                      <View style={styles.sessionInfo}>
                        <Text style={[styles.sessionDate, { color: colors.foreground }]}>
                          {formatDateShort(session.date)}
                        </Text>
                        <Text style={[styles.sessionMeta, { color: colors.mutedForeground }]}>
                          {session.trainingType} · {session.distancePerLap} m/v · {session.laps.length} vueltas
                        </Text>
                      </View>
                      <TouchableOpacity
                        disabled={busy || !targetEntryId}
                        onPress={() => moveSession(session.id)}
                        style={[
                          styles.moveBtn,
                          { borderColor: targetEntryId ? colors.primary : colors.border },
                        ]}
                      >
                        <Text
                          style={[
                            styles.moveBtnText,
                            { color: targetEntryId ? colors.primary : colors.mutedForeground },
                          ]}
                        >
                          Mover
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={[styles.deleteBox, { borderTopColor: colors.border }]}>
                <Text style={[styles.deleteTitle, { color: colors.foreground }]}>Eliminar etapa incorrecta</Text>
                <Text style={[styles.deleteText, { color: colors.mutedForeground }]}>
                  {affectedSessions.length > 0
                    ? 'Para eliminarla, selecciona arriba dónde quedarán sus sesiones. Ninguna sesión se borra.'
                    : 'Esta categoría no tiene sesiones asociadas y puede eliminarse directamente.'}
                </Text>
                <TouchableOpacity
                  disabled={busy || (affectedSessions.length > 0 && !targetEntryId)}
                  onPress={deleteEntry}
                  style={[
                    styles.deleteBtn,
                    {
                      backgroundColor:
                        busy || (affectedSessions.length > 0 && !targetEntryId)
                          ? colors.secondary
                          : `${colors.destructive}16`,
                    },
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={17}
                    color={
                      busy || (affectedSessions.length > 0 && !targetEntryId)
                        ? colors.mutedForeground
                        : colors.destructive
                    }
                  />
                  <Text
                    style={[
                      styles.deleteBtnText,
                      {
                        color:
                          busy || (affectedSessions.length > 0 && !targetEntryId)
                            ? colors.mutedForeground
                            : colors.destructive,
                      },
                    ]}
                  >
                    {affectedSessions.length > 0 ? 'Mover sesiones y eliminar' : 'Eliminar categoría'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  headingBody: { flex: 1 },
  title: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 11,
    marginTop: 11,
  },
  manageBody: { flex: 1 },
  categoryName: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  meta: { fontSize: 10, marginTop: 2 },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
  },
  manageBtnText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.48)', justifyContent: 'center', padding: 20 },
  modal: {
    maxHeight: '88%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 15 },
  modalTitle: { fontSize: 19, fontFamily: 'Inter_700Bold' },
  modalSubtitle: { fontSize: 11, marginTop: 2 },
  sectionLabel: { fontSize: 9, letterSpacing: 0.8, fontFamily: 'Inter_700Bold' },
  chips: { gap: 7, paddingVertical: 8, paddingRight: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7 },
  chipText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 11 },
  warningText: { flex: 1, fontSize: 10, lineHeight: 15 },
  sessionBlock: { marginTop: 14 },
  sessionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  moveAllBtn: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  moveAllText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 10,
  },
  sessionInfo: { flex: 1 },
  sessionDate: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  sessionMeta: { fontSize: 9, marginTop: 2 },
  moveBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  moveBtnText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  deleteBox: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 18, paddingTop: 14 },
  deleteTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  deleteText: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  deleteBtn: {
    marginTop: 10,
    minHeight: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  deleteBtnText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
});
