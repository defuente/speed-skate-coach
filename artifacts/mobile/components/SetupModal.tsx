import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Athlete, SessionConfig, TRAINING_TYPES, TrainingType } from '@/types/training';
import { getAthleteProfiles, getAthleteSessions, upsertAthlete } from '@/utils/storage';

interface Props {
  visible: boolean;
  onClose: () => void;
  onStart: (config: SessionConfig) => void;
  defaults: SessionConfig;
}

export function SetupModal({ visible, onClose, onStart, defaults }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [athleteId, setAthleteId] = useState<string | undefined>();
  const [athleteName, setAthleteName] = useState('');
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [trainingType, setTrainingType] = useState<TrainingType>('Resistencia');
  const [distanceStr, setDistanceStr] = useState('400');
  const [targetLapCountStr, setTargetLapCountStr] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [previousConfigLoaded, setPreviousConfigLoaded] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setAthleteId(defaults.athleteId);
    setAthleteName(defaults.athleteName);
    setTrainingType(defaults.trainingType);
    setDistanceStr(String(defaults.distancePerLap));
    setTargetLapCountStr(defaults.targetLapCount ? String(defaults.targetLapCount) : '');
    setTargetStr(defaults.targetLapTimeMs ? (defaults.targetLapTimeMs / 1000).toFixed(2) : '');
    setPreviousConfigLoaded(false);

    getAthleteProfiles().then(profiles => {
      setAthletes(profiles);
      if (!defaults.athleteId && defaults.athleteName.trim()) {
        const key = defaults.athleteName.trim().toLocaleLowerCase();
        const existing = profiles.find(athlete => athlete.name.trim().toLocaleLowerCase() === key);
        if (existing) setAthleteId(existing.id);
      }
    });
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAthleteTextChange = (value: string) => {
    setAthleteName(value);
    setPreviousConfigLoaded(false);
    const key = value.trim().toLocaleLowerCase();
    const existing = athletes.find(athlete => athlete.name.trim().toLocaleLowerCase() === key);
    setAthleteId(existing?.id);
  };

  const selectAthlete = async (athlete: Athlete) => {
    setAthleteId(athlete.id);
    setAthleteName(athlete.name);
    setPreviousConfigLoaded(false);

    const sessions = await getAthleteSessions(athlete.id);
    const lastSession = [...sessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];

    if (!lastSession) return;

    setTrainingType(lastSession.trainingType);
    setDistanceStr(String(lastSession.distancePerLap));
    setTargetLapCountStr(lastSession.targetLapCount ? String(lastSession.targetLapCount) : '');
    setTargetStr(
      lastSession.targetLapTimeMs ? (lastSession.targetLapTimeMs / 1000).toFixed(2) : '',
    );
    setPreviousConfigLoaded(true);
  };

  const handleStart = async () => {
    const cleanAthleteName = athleteName.trim();
    const targetSeconds = Number(targetStr.replace(',', '.'));
    const targetLapCount = parseInt(targetLapCountStr, 10);
    let selectedAthleteId = athleteId;
    let selectedAthleteName = cleanAthleteName;

    if (cleanAthleteName) {
      const athlete = await upsertAthlete(cleanAthleteName);
      selectedAthleteId = athlete.id;
      selectedAthleteName = athlete.name;
      setAthleteId(athlete.id);
      setAthleteName(athlete.name);
      setAthletes(await getAthleteProfiles());
    }

    onStart({
      athleteId: selectedAthleteId,
      athleteName: selectedAthleteName,
      trainingType,
      distancePerLap: parseInt(distanceStr, 10) || 0,
      targetLapCount: targetLapCount > 0 ? targetLapCount : undefined,
      targetLapTimeMs: targetSeconds > 0 ? Math.round(targetSeconds * 1000) : undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Nuevo Entrenamiento</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.label, { color: colors.mutedForeground }]}>DEPORTISTA</Text>
          {athletes.length > 0 && (
            <>
              <Text style={[styles.savedHint, { color: colors.mutedForeground }]}>Selecciona un deportista guardado</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.athleteList}
                keyboardShouldPersistTaps="handled"
              >
                {athletes.map(athlete => {
                  const selected = athlete.id === athleteId;
                  return (
                    <TouchableOpacity
                      key={athlete.id}
                      onPress={() => selectAthlete(athlete)}
                      activeOpacity={0.75}
                      style={[
                        styles.athleteChip,
                        {
                          backgroundColor: selected ? colors.primary : colors.card,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={selected ? 'person' : 'person-outline'}
                        size={15}
                        color={selected ? colors.primaryForeground : colors.foreground}
                      />
                      <Text
                        style={[
                          styles.athleteChipText,
                          { color: selected ? colors.primaryForeground : colors.foreground },
                        ]}
                      >
                        {athlete.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={[styles.orText, { color: colors.mutedForeground }]}>o escribe uno nuevo</Text>
            </>
          )}

          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground },
            ]}
            value={athleteName}
            onChangeText={handleAthleteTextChange}
            placeholder="Nombre del deportista"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="done"
          />

          {previousConfigLoaded && (
            <View
              style={[
                styles.previousConfigBanner,
                { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}35` },
              ]}
            >
              <Ionicons name="refresh-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.previousConfigText, { color: colors.primary }]}>
                Cargamos la configuración del último entrenamiento de {athleteName}. Puedes modificarla antes de iniciar.
              </Text>
            </View>
          )}

          <Text style={[styles.label, { color: colors.mutedForeground }]}>TIPO DE ENTRENAMIENTO</Text>
          <View style={styles.typeWrap}>
            {TRAINING_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                onPress={() => setTrainingType(type)}
                activeOpacity={0.7}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: trainingType === type ? colors.primary : colors.card,
                    borderColor: trainingType === type ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeTxt,
                    { color: trainingType === type ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>DISTANCIA POR VUELTA</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              style={[styles.inputInner, { color: colors.foreground }]}
              value={distanceStr}
              onChangeText={setDistanceStr}
              keyboardType="numeric"
              placeholder="400"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
            />
            <Text style={[styles.unit, { color: colors.mutedForeground }]}>metros</Text>
          </View>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>Pon 0 para no calcular velocidad</Text>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>VUELTAS OBJETIVO</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              style={[styles.inputInner, { color: colors.foreground }]}
              value={targetLapCountStr}
              onChangeText={setTargetLapCountStr}
              keyboardType="number-pad"
              placeholder="Ej. 20"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
            />
            <Text style={[styles.unit, { color: colors.mutedForeground }]}>vueltas</Text>
          </View>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>Opcional · permite comparar vueltas asignadas vs. vueltas realizadas</Text>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>TIEMPO OBJETIVO POR VUELTA</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              style={[styles.inputInner, { color: colors.foreground }]}
              value={targetStr}
              onChangeText={setTargetStr}
              keyboardType="decimal-pad"
              placeholder="Ej. 32.50"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
            />
            <Text style={[styles.unit, { color: colors.mutedForeground }]}>segundos</Text>
          </View>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>Opcional · las vueltas iguales o más rápidas contarán como objetivo cumplido</Text>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            onPress={handleStart}
            activeOpacity={0.82}
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="play" size={22} color={colors.primaryForeground} />
            <Text style={[styles.startTxt, { color: colors.primaryForeground }]}>Iniciar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  body: { flex: 1 },
  bodyContent: { padding: 20, gap: 8, paddingBottom: 32 },
  label: { fontSize: 11, letterSpacing: 0.8, marginTop: 16, marginBottom: 6, fontFamily: 'Inter_600SemiBold' },
  savedHint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 2 },
  athleteList: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  athleteChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
  athleteChipText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  orText: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, fontFamily: 'Inter_400Regular' },
  previousConfigBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 4 },
  previousConfigText: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium', lineHeight: 17 },
  typeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
  typeTxt: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14 },
  inputInner: { flex: 1, paddingVertical: 13, fontSize: 16, fontFamily: 'Inter_400Regular' },
  unit: { fontSize: 14, paddingLeft: 8, fontFamily: 'Inter_400Regular' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14 },
  startTxt: { fontSize: 18, fontFamily: 'Inter_700Bold' },
});
