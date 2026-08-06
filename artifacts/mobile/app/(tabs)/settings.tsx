import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useSettings } from '@/context/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { TRAINING_TYPES, TrainingType } from '@/types/training';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, colorMode, updateSettings, setColorMode } = useSettings();
  const [nameInput, setNameInput] = useState(settings.athleteName);
  const [distInput, setDistInput] = useState(String(settings.defaultDistancePerLap));

  useEffect(() => { setNameInput(settings.athleteName); }, [settings.athleteName]);
  useEffect(() => { setDistInput(String(settings.defaultDistancePerLap)); }, [settings.defaultDistancePerLap]);

  const webTop = Platform.OS === 'web' ? 67 : 0;
  const webBottom = Platform.OS === 'web' ? 84 : 0;

  const saveName = () => updateSettings({ athleteName: nameInput.trim() });
  const saveDist = () => {
    const n = parseInt(distInput, 10) || 0;
    updateSettings({ defaultDistancePerLap: n });
    setDistInput(String(n));
  };

  const darkModeLabels = { auto: 'Automático', dark: 'Oscuro', light: 'Claro' } as const;
  const darkModeIcons = { auto: 'phone-portrait-outline', dark: 'moon', light: 'sunny' } as const;
  const cycleMode = () => {
    const next = colorMode === 'auto' ? 'dark' : colorMode === 'dark' ? 'light' : 'auto';
    setColorMode(next);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 16, borderBottomColor: colors.border }]}>
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
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
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
            {TRAINING_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => updateSettings({ defaultTrainingType: t })}
                activeOpacity={0.7}
                style={[
                  styles.pill,
                  {
                    backgroundColor: settings.defaultTrainingType === t ? colors.primary : colors.background,
                    borderColor: settings.defaultTrainingType === t ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.pillTxt, { color: settings.defaultTrainingType === t ? colors.primaryForeground : colors.foreground }]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.fieldLbl, { color: colors.mutedForeground }]}>Distancia por vuelta (metros)</Text>
          <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
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
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{darkModeLabels[colorMode]}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <SectionLabel text="EXPORTAR APK ANDROID" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.apkBanner, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.apkInfo, { color: colors.primary }]}>
              Instrucciones para generar el APK instalable
            </Text>
          </View>
          <Text style={[styles.apkStep, { color: colors.foreground }]}>1. Instala EAS CLI</Text>
          <View style={[styles.codeBox, { backgroundColor: colors.muted }]}>
            <Text style={[styles.codeText, { color: colors.foreground }]}>npm install -g eas-cli</Text>
          </View>
          <Text style={[styles.apkStep, { color: colors.foreground }]}>2. Inicia sesión en Expo</Text>
          <View style={[styles.codeBox, { backgroundColor: colors.muted }]}>
            <Text style={[styles.codeText, { color: colors.foreground }]}>eas login</Text>
          </View>
          <Text style={[styles.apkStep, { color: colors.foreground }]}>3. Configura el proyecto (solo 1ª vez)</Text>
          <View style={[styles.codeBox, { backgroundColor: colors.muted }]}>
            <Text style={[styles.codeText, { color: colors.foreground }]}>eas build:configure</Text>
          </View>
          <Text style={[styles.apkStep, { color: colors.foreground }]}>4. Compila el APK</Text>
          <View style={[styles.codeBox, { backgroundColor: colors.muted }]}>
            <Text style={[styles.codeText, { color: colors.foreground }]}>{'eas build -p android \\\n  --profile preview'}</Text>
          </View>
          <Text style={[styles.apkHint, { color: colors.mutedForeground }]}>
            Descarga el APK generado desde expo.dev e instálalo en tu Android. El slug del proyecto es{' '}
            <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>mobile</Text>.
          </Text>
        </View>

        <SectionLabel text="ACERCA DE" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.aboutRow}>
            <View style={[styles.appIconWrap, { backgroundColor: colors.primary }]}>
              <Ionicons name="stopwatch" size={24} color={colors.primaryForeground} />
            </View>
            <View>
              <Text style={[styles.appName, { color: colors.foreground }]}>PatinCrono</Text>
              <Text style={[styles.appVer, { color: colors.mutedForeground }]}>v1.0 · Offline · Sin registro</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ text, colors }: { text: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.sectionLbl, { color: colors.mutedForeground }]}>{text}</Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  scroll: { padding: 16, gap: 10 },
  sectionLbl: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginTop: 8, paddingHorizontal: 2 },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 10 },
  fieldLbl: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, fontFamily: 'Inter_400Regular' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
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
  apkBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
  apkInfo: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },
  apkStep: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 4 },
  codeBox: { borderRadius: 6, padding: 10 },
  codeText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  apkHint: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18, marginTop: 4 },
  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  appIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  appVer: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
