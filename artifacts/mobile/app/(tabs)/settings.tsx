import React, { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useColors } from '@/hooks/useColors';
import { useSettings } from '@/context/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { TRAINING_TYPES } from '@/types/training';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, colorMode, updateSettings, setColorMode } = useSettings();
  const [nameInput, setNameInput] = useState(settings.athleteName);
  const [distInput, setDistInput] = useState(String(settings.defaultDistancePerLap));
  const appVersion = Constants.expoConfig?.version ?? '0.3.0';

  useEffect(() => {
    setNameInput(settings.athleteName);
  }, [settings.athleteName]);

  useEffect(() => {
    setDistInput(String(settings.defaultDistancePerLap));
  }, [settings.defaultDistancePerLap]);

  const webTop = Platform.OS === 'web' ? 67 : 0;
  const webBottom = Platform.OS === 'web' ? 84 : 0;

  const saveName = () => updateSettings({ athleteName: nameInput.trim() });
  const saveDist = () => {
    const value = parseInt(distInput, 10) || 0;
    updateSettings({ defaultDistancePerLap: value });
    setDistInput(String(value));
  };

  const darkModeLabels = { auto: 'Automático', dark: 'Oscuro', light: 'Claro' } as const;
  const darkModeIcons = { auto: 'phone-portrait-outline', dark: 'moon', light: 'sunny' } as const;
  const cycleMode = () => {
    const next = colorMode === 'auto' ? 'dark' : colorMode === 'dark' ? 'light' : 'auto';
    setColorMode(next);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + webTop + 16, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Ajustes</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + webBottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel text="PERFIL" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.fieldLbl, { color: colors.mutedForeground }]}>Nombre del deportista</Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            value={nameInput}
            onChangeText={setNameInput}
            onBlur={saveName}
            onSubmitEditing={saveName}
            placeholder="Tu nombre"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="done"
          />
        </View>

        <SectionLabel text="VALORES POR DEFECTO" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.fieldLbl, { color: colors.mutedForeground }]}>Tipo de entrenamiento</Text>
          <View style={styles.pillRow}>
            {TRAINING_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                onPress={() => updateSettings({ defaultTrainingType: type })}
                activeOpacity={0.7}
                style={[
                  styles.pill,
                  {
                    backgroundColor:
                      settings.defaultTrainingType === type ? colors.primary : colors.background,
                    borderColor:
                      settings.defaultTrainingType === type ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillTxt,
                    {
                      color:
                        settings.defaultTrainingType === type
                          ? colors.primaryForeground
                          : colors.foreground,
                    },
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.fieldLbl, { color: colors.mutedForeground }]}>Distancia por vuelta (metros)</Text>
          <View
            style={[
              styles.inputRow,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}
          >
            <TextInput
              style={[styles.inputInner, { color: colors.foreground }]}
              value={distInput}
              onChangeText={setDistInput}
              onBlur={saveDist}
              onSubmitEditing={saveDist}
              keyboardType="numeric"
              placeholder="400"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
            />
            <Text style={[styles.unit, { color: colors.mutedForeground }]}>m</Text>
          </View>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            400m (olímpica) · 333m · 250m (pista corta)
          </Text>
        </View>

        <SectionLabel text="APARIENCIA" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.row} onPress={cycleMode} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name={darkModeIcons[colorMode]} size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>Modo de color</Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                  {darkModeLabels[colorMode]}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <SectionLabel text="ACERCA DE" colors={colors} />
        <View style={[styles.card, styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.appLogo}
            resizeMode="contain"
          />
          <View style={styles.aboutText}>
            <Text style={[styles.appName, { color: colors.foreground }]}>PatinCrono</Text>
            <Text style={[styles.appVer, { color: colors.mutedForeground }]}>v{appVersion} · Offline</Text>
            <Text style={[styles.author, { color: colors.foreground }]}>Desarrollado por Denis Fuentes · d3n1x</Text>
            <Text style={[styles.aboutDescription, { color: colors.mutedForeground }]}>
              Cronómetro y análisis de entrenamientos para patinaje de carrera.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ text, colors }: { text: string; colors: ReturnType<typeof useColors> }) {
  return <Text style={[styles.sectionLbl, { color: colors.mutedForeground }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  scroll: { padding: 16, gap: 10 },
  sectionLbl: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 10 },
  fieldLbl: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputInner: { flex: 1, paddingVertical: 11, fontSize: 15, fontFamily: 'Inter_400Regular' },
  unit: { fontSize: 13, paddingLeft: 6, fontFamily: 'Inter_400Regular' },
  hint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  pillTxt: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  rowSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  aboutCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  appLogo: { width: 68, height: 68, borderRadius: 15 },
  aboutText: { flex: 1, gap: 3 },
  appName: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  appVer: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  author: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 3 },
  aboutDescription: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16, marginTop: 2 },
});
