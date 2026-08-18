import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import type { Athlete, PerformanceLevel } from '@/types/training';
import { getAthleteProfiles, normalizeAthleteName, updateAthlete } from '@/utils/storage';
import {
  PERFORMANCE_LEVELS,
  getCompetitionAgeForYear,
  getCurrentAgeCategory,
} from '@/utils/skatingCategories';

function formatBirthDateDisplay(value?: string): string {
  if (!value) return '';
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return value;
}

function maskBirthDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseBirthDateInput(value: string): string | undefined | null {
  const clean = value.trim();
  if (!clean) return undefined;

  const match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function AthleteCategoriesScreen() {
  const params = useLocalSearchParams<{ name: string }>();
  const identifier = Array.isArray(params.name) ? params.name[0] : params.name || '';
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [performanceLevel, setPerformanceLevel] = useState<PerformanceLevel | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const profiles = await getAthleteProfiles();
    const key = normalizeAthleteName(identifier);
    const found =
      profiles.find(
        profile => profile.id === identifier || normalizeAthleteName(profile.name) === key,
      ) ?? null;

    setAthlete(found);
    setBirthDate(formatBirthDateDisplay(found?.birthDate));
    setPerformanceLevel(found?.performanceLevel);
    setLoading(false);
  }, [identifier]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const parsedBirthDate = useMemo(() => parseBirthDateInput(birthDate), [birthDate]);
  const currentYear = new Date().getFullYear();
  const competitionAge =
    parsedBirthDate && parsedBirthDate !== null
      ? getCompetitionAgeForYear(parsedBirthDate, currentYear)
      : undefined;
  const ageCategory =
    parsedBirthDate && parsedBirthDate !== null
      ? getCurrentAgeCategory(parsedBirthDate)
      : undefined;

  const save = useCallback(async () => {
    if (!athlete) return;
    const parsed = parseBirthDateInput(birthDate);
    if (parsed === null) {
      Alert.alert(
        'Fecha inválida',
        'Ingresa la fecha de nacimiento en formato dd/MM/yyyy. Ejemplo: 09/08/2019.',
      );
      return;
    }

    setSaving(true);
    try {
      const updated = await updateAthlete(athlete.id, {
        birthDate: parsed,
        performanceLevel,
      });
      setAthlete(updated);
      setBirthDate(formatBirthDateDisplay(updated.birthDate));
      setPerformanceLevel(updated.performanceLevel);
      Alert.alert('Clasificación guardada', 'Los datos deportivos del deportista fueron actualizados.');
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error ? error.message : 'Ocurrió un error al actualizar la clasificación.',
      );
    } finally {
      setSaving(false);
    }
  }, [athlete, birthDate, performanceLevel]);

  const webTop = Platform.OS === 'web' ? 67 : 0;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Clasificación deportiva</Text>
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
        <View style={styles.headerBody}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Clasificación deportiva</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]} numberOfLines={1}>
            {athlete.name}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
      >
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={23} color={colors.primary} />
          <View style={styles.infoBody}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>Categoría automática por edad</Text>
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              La categoría etaria se calcula con la edad que el deportista cumple al 31 de diciembre del año en curso. El nivel de rendimiento se selecciona por separado.
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fecha de nacimiento</Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
            Es opcional. Si la dejas vacía, la app no asignará una categoría etaria.
          </Text>

          <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={19} color={colors.primary} />
            <TextInput
              value={birthDate}
              onChangeText={value => setBirthDate(maskBirthDateInput(value))}
              placeholder="dd/MM/yyyy"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              maxLength={10}
              style={[styles.input, { color: colors.foreground }]}
            />
            {!!birthDate && (
              <TouchableOpacity onPress={() => setBirthDate('')} hitSlop={10}>
                <Ionicons name="close-circle" size={19} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          {parsedBirthDate === null ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>Fecha inválida. Usa dd/MM/yyyy.</Text>
          ) : ageCategory ? (
            <View style={[styles.categoryPreview, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}35` }]}>
              <View style={[styles.categoryIcon, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="ribbon-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.categoryPreviewBody}>
                <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>CATEGORÍA {currentYear}</Text>
                <Text style={[styles.previewValue, { color: colors.primary }]}>{ageCategory}</Text>
                <Text style={[styles.previewSub, { color: colors.mutedForeground }]}>
                  {competitionAge} año{competitionAge !== 1 ? 's' : ''} al 31 de diciembre de {currentYear}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.categoryPreview, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="ribbon-outline" size={23} color={colors.mutedForeground} />
              <View style={styles.categoryPreviewBody}>
                <Text style={[styles.previewValueSmall, { color: colors.foreground }]}>Categoría etaria no definida</Text>
                <Text style={[styles.previewSub, { color: colors.mutedForeground }]}>
                  Agrega una fecha de nacimiento para que se calcule automáticamente.
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nivel de rendimiento</Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
            Selecciona el nivel en el que participa actualmente el deportista.
          </Text>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setPerformanceLevel(undefined)}
            style={[
              styles.levelOption,
              {
                backgroundColor: performanceLevel === undefined ? `${colors.primary}12` : colors.background,
                borderColor: performanceLevel === undefined ? colors.primary : colors.border,
              },
            ]}
          >
            <View style={styles.levelBody}>
              <Text style={[styles.levelTitle, { color: colors.foreground }]}>Sin definir</Text>
              <Text style={[styles.levelDescription, { color: colors.mutedForeground }]}>No asignar nivel por ahora</Text>
            </View>
            <Ionicons
              name={performanceLevel === undefined ? 'radio-button-on' : 'radio-button-off'}
              size={21}
              color={performanceLevel === undefined ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>

          {PERFORMANCE_LEVELS.map(level => {
            const selected = performanceLevel === level;
            const description =
              level === 'Formativo / Escuela'
                ? 'Inicio, aprendizaje básico y formación técnica'
                : level === 'Intermedia'
                  ? 'Transición, patín profesional e iniciación competitiva'
                  : 'Nivel avanzado, competencia federada y rankings';

            return (
              <TouchableOpacity
                key={level}
                activeOpacity={0.75}
                onPress={() => setPerformanceLevel(level)}
                style={[
                  styles.levelOption,
                  {
                    backgroundColor: selected ? `${colors.primary}12` : colors.background,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={styles.levelBody}>
                  <Text style={[styles.levelTitle, { color: selected ? colors.primary : colors.foreground }]}>{level}</Text>
                  <Text style={[styles.levelDescription, { color: colors.mutedForeground }]}>{description}</Text>
                </View>
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={21}
                  color={selected ? colors.primary : colors.mutedForeground}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          activeOpacity={0.82}
          disabled={saving || parsedBirthDate === null}
          onPress={save}
          style={[
            styles.saveBtn,
            { backgroundColor: colors.primary, opacity: saving || parsedBirthDate === null ? 0.55 : 1 },
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Ionicons name="save-outline" size={20} color={colors.primaryForeground} />
          )}
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
            {saving ? 'Guardando…' : 'Guardar clasificación'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBody: { flex: 1 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 10, marginTop: 1 },
  scroll: { paddingTop: 14, gap: 12 },
  infoCard: {
    marginHorizontal: 16,
    padding: 15,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  infoBody: { flex: 1 },
  infoTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  infoText: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  card: {
    marginHorizontal: 16,
    padding: 15,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  sectionSub: { fontSize: 10, lineHeight: 15, marginTop: -5 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 12,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 12, fontFamily: 'Inter_500Medium' },
  errorText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  categoryPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  categoryIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  categoryPreviewBody: { flex: 1 },
  previewLabel: { fontSize: 9, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.6 },
  previewValue: { fontSize: 18, fontFamily: 'Inter_700Bold', marginTop: 1 },
  previewValueSmall: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  previewSub: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  levelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  levelBody: { flex: 1 },
  levelTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  levelDescription: { fontSize: 9, lineHeight: 13, marginTop: 2 },
  saveBtn: {
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
});
