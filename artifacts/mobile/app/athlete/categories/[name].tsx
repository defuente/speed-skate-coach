import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Athlete, Session } from '@/types/training';
import { getAthleteProfiles, getAthleteSessions, normalizeAthleteName } from '@/utils/storage';
import { CategoryCorrectionPanel } from '@/components/CategoryCorrectionPanel';

export default function AthleteCategoriesScreen() {
  const params = useLocalSearchParams<{ name: string }>();
  const identifier = Array.isArray(params.name) ? params.name[0] : params.name || '';
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const profiles = await getAthleteProfiles();
    const key = normalizeAthleteName(identifier);
    const found =
      profiles.find(
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Categorías</Text>
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Corregir categorías</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]} numberOfLines={1}>
            {athlete.name}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
      >
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark-outline" size={23} color={colors.primary} />
          <View style={styles.infoBody}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>Correcciones sin perder entrenamientos</Text>
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Puedes mover sesiones a otra etapa histórica antes de borrar una categoría equivocada. Eliminar una categoría nunca elimina sus sesiones.
            </Text>
          </View>
        </View>

        {(athlete.categoryHistory?.length ?? 0) > 0 ? (
          <CategoryCorrectionPanel athlete={athlete} sessions={sessions} onChanged={load} />
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="ribbon-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin historial de categorías</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Registra primero una categoría desde la edición de la ficha del deportista.
            </Text>
          </View>
        )}
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
  emptyCard: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 7,
  },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  emptyText: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
