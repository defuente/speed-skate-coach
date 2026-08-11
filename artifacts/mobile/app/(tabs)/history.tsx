import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { SessionCard } from '@/components/SessionCard';
import { Session } from '@/types/training';
import { getSessions } from '@/utils/storage';
import { exportAthleteCSV } from '@/utils/csvExport';

export default function HistoryScreen() {
  const colors = useColors(); const insets = useSafeAreaInsets(); const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [exporting, setExporting] = useState(false);
  const load = useCallback(async () => { const data = await getSessions(); setSessions(data); setLoading(false); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  const athletes = useMemo(() => Array.from(new Set(sessions.map(s => s.athleteName.trim() || 'Sin nombre'))).sort((a,b) => a.localeCompare(b)), [sessions]);
  const exportAthlete = useCallback((athlete: string) => {
    setExporting(true);
    exportAthleteCSV(sessions, athlete).catch(() => Alert.alert('Error', 'No se pudo exportar el historial')).finally(() => setExporting(false));
  }, [sessions]);
  const chooseAthlete = useCallback(() => {
    if (athletes.length === 1) return exportAthlete(athletes[0]);
    Alert.alert('Exportar historial', 'Selecciona el deportista', [...athletes.map(name => ({ text: name, onPress: () => exportAthlete(name) })), { text: 'Cancelar', style: 'cancel' }]);
  }, [athletes, exportAthlete]);
  const webTop = Platform.OS === 'web' ? 67 : 0; const webBottom = Platform.OS === 'web' ? 84 : 0;

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <View style={[styles.header, { paddingTop: insets.top + webTop + 16, borderBottomColor: colors.border }]}>
      <View><Text style={[styles.title, { color: colors.foreground }]}>Historial</Text><Text style={[styles.count, { color: colors.mutedForeground }]}>{sessions.length} sesión{sessions.length !== 1 ? 'es' : ''}</Text></View>
      {sessions.length > 0 && <TouchableOpacity disabled={exporting} onPress={chooseAthlete} style={[styles.exportBtn, { borderColor: colors.border, backgroundColor: colors.card }]}><Ionicons name={exporting ? 'hourglass-outline' : 'download-outline'} size={18} color={colors.primary} /><Text style={[styles.exportTxt, { color: colors.primary }]}>CSV deportista</Text></TouchableOpacity>}
    </View>
    {loading ? <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View> : sessions.length === 0 ? <View style={styles.empty}><Ionicons name="time-outline" size={56} color={colors.mutedForeground} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin sesiones aún</Text><Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Completa tu primer entrenamiento para verlo aquí</Text></View> : <FlatList data={sessions} keyExtractor={s => s.id} renderItem={({ item }) => <SessionCard session={item} onPress={() => router.push(`/session/${item.id}`)} />} contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + webBottom + 16 }]} refreshing={refreshing} onRefresh={onRefresh} showsVerticalScrollIndicator={false} />}
  </View>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }, title: { fontSize: 28, fontFamily: 'Inter_700Bold' }, count: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }, exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 }, exportTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold' }, centered: { flex: 1, alignItems: 'center', justifyContent: 'center' }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 }, emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' }, emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' }, list: { paddingTop: 14 } });
