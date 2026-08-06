import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useSettings } from '@/context/SettingsContext';
import { useTraining } from '@/context/TrainingContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SetupModal } from '@/components/SetupModal';
import { LapRow } from '@/components/LapRow';
import { SessionConfig } from '@/types/training';
import { formatTime, calculateStats } from '@/utils/calculations';
import { saveSession } from '@/utils/storage';

export default function CronometroScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { timerState, elapsed, currentLapTime, laps, sessionConfig, start, pause, resume, addLap, finish, reset } =
    useTraining();
  const [showSetup, setShowSetup] = useState(false);
  const lapListRef = useRef<FlatList>(null);

  const isIdle = timerState === 'idle';
  const isRunning = timerState === 'running';
  const isPaused = timerState === 'paused';
  const isFinished = timerState === 'finished';
  const isActive = isRunning || isPaused;

  const stats = calculateStats(laps, sessionConfig.distancePerLap);
  const webTop = Platform.OS === 'web' ? 67 : 0;
  const webBottom = Platform.OS === 'web' ? 34 : 0;

  const handleStart = useCallback(
    (config: SessionConfig) => {
      setShowSetup(false);
      start(config);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },
    [start],
  );

  const handleLap = useCallback(() => {
    addLap();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      try { lapListRef.current?.scrollToIndex({ index: 0, animated: true }); } catch {}
    }, 100);
  }, [addLap]);

  const handlePause = useCallback(() => {
    pause();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [pause]);

  const handleResume = useCallback(() => {
    resume();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [resume]);

  const doFinish = useCallback(async () => {
    const result = finish();
    if (!result) return;
    if (result.laps.length > 0) {
      await saveSession({
        id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
        date: new Date().toISOString(),
        athleteName: sessionConfig.athleteName,
        trainingType: sessionConfig.trainingType,
        distancePerLap: sessionConfig.distancePerLap,
        laps: result.laps,
        totalTime: result.totalTime,
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [finish, sessionConfig]);

  const handleFinish = useCallback(() => {
    Alert.alert('Finalizar', '¿Terminar el entrenamiento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Finalizar', style: 'destructive', onPress: doFinish },
    ]);
  }, [doFinish]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: webTop }]}>
      {/* Timer zone */}
      <View style={[styles.timerZone, { paddingTop: isActive ? insets.top + 12 : insets.top + 48 }]}>
        {isActive && (
          <Text style={[styles.sessionMeta, { color: colors.mutedForeground }]}>
            {sessionConfig.athleteName || 'Sin nombre'} · {sessionConfig.trainingType}
            {sessionConfig.distancePerLap > 0 ? ` · ${sessionConfig.distancePerLap}m` : ''}
          </Text>
        )}

        {isFinished ? (
          <View style={styles.finishedZone}>
            <View style={[styles.checkCircle, { backgroundColor: `${colors.success}22` }]}>
              <Ionicons name="checkmark-circle" size={60} color={colors.success} />
            </View>
            <Text style={[styles.finishedTitle, { color: colors.foreground }]}>¡Completado!</Text>
            <Text style={[styles.finishedSub, { color: colors.mutedForeground }]}>
              {laps.length} vuelta{laps.length !== 1 ? 's' : ''} · {formatTime(elapsed)}
            </Text>
            {stats.bestLap && (
              <View style={[styles.prRow, { backgroundColor: `${colors.lapBest}18`, borderColor: `${colors.lapBest}40` }]}>
                <Ionicons name="trophy-outline" size={14} color={colors.lapBest} />
                <Text style={[styles.prTxt, { color: colors.lapBest }]}>
                  Mejor vuelta: {formatTime(stats.bestLap.lapTime)}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <Text style={[styles.timer, { color: colors.timerDisplay }]}>{formatTime(elapsed)}</Text>
            {isActive && (
              <View style={styles.lapInfoRow}>
                <Text style={[styles.lapLabel, { color: colors.mutedForeground }]}>VUELTA {laps.length + 1}</Text>
                <Text style={[styles.lapClock, { color: colors.primary }]}>{formatTime(currentLapTime)}</Text>
              </View>
            )}
            {isIdle && (
              <Text style={[styles.idleHint, { color: colors.mutedForeground }]}>
                Cronómetro de alta precisión
              </Text>
            )}
          </>
        )}
      </View>

      {/* Stats strip */}
      {laps.length > 0 && isActive && stats.bestLap && (
        <View style={[styles.strip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <StripChip label="Mejor" value={formatTime(stats.bestLap.lapTime)} color={colors.lapBest} colors={colors} />
          <View style={[styles.div, { backgroundColor: colors.border }]} />
          <StripChip label="Promedio" value={formatTime(stats.averageLapTime)} color={colors.foreground} colors={colors} />
          <View style={[styles.div, { backgroundColor: colors.border }]} />
          <StripChip label="Consist." value={`${stats.consistency.toFixed(1)}%`} color={colors.mutedForeground} colors={colors} />
          {stats.averageSpeed > 0 && (
            <>
              <View style={[styles.div, { backgroundColor: colors.border }]} />
              <StripChip label="Vel. med." value={`${stats.averageSpeed.toFixed(1)}`} color={colors.primary} colors={colors} />
            </>
          )}
        </View>
      )}

      {/* Lap list */}
      {laps.length > 0 && (
        <View style={styles.lapsSection}>
          <View style={[styles.lapsHead, { borderBottomColor: colors.border }]}>
            <Text style={[styles.lhTxt, { color: colors.mutedForeground, width: 34 }]}>V</Text>
            <Text style={[styles.lhTxt, { color: colors.mutedForeground, flex: 1 }]}>Vuelta</Text>
            <Text style={[styles.lhTxt, { color: colors.mutedForeground, width: 76, textAlign: 'right' }]}>Total</Text>
            {sessionConfig.distancePerLap > 0 && (
              <Text style={[styles.lhTxt, { color: colors.mutedForeground, width: 68, textAlign: 'right' }]}>Vel.</Text>
            )}
            <Text style={[styles.lhTxt, { color: colors.mutedForeground, width: 60, textAlign: 'right' }]}>Δ</Text>
          </View>
          <FlatList
            ref={lapListRef}
            data={[...laps].reverse()}
            keyExtractor={item => String(item.number)}
            renderItem={({ item }) => (
              <LapRow
                lap={item}
                isBest={item.number === stats.bestLap?.number}
                isWorst={item.number === stats.worstLap?.number}
                distancePerLap={sessionConfig.distancePerLap}
                avgLapTime={stats.averageLapTime}
              />
            )}
            scrollEnabled={!!laps.length}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Action buttons */}
      <View style={[styles.btns, { paddingBottom: insets.bottom + webBottom + 8 }]}>
        {isIdle && (
          <TouchableOpacity
            style={[styles.bigBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowSetup(true)}
            activeOpacity={0.82}
          >
            <Ionicons name="play" size={26} color={colors.primaryForeground} />
            <Text style={[styles.bigBtnTxt, { color: colors.primaryForeground }]}>Nuevo entrenamiento</Text>
          </TouchableOpacity>
        )}

        {isRunning && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.lapBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
              onPress={handleLap}
              activeOpacity={0.72}
            >
              <Ionicons name="flag" size={24} color={colors.primary} />
              <Text style={[styles.actionTxt, { color: colors.primary }]}>Vuelta</Text>
            </TouchableOpacity>
            <View style={styles.sideStack}>
              <TouchableOpacity
                style={[styles.sideBtn, { backgroundColor: colors.secondary }]}
                onPress={handlePause}
                activeOpacity={0.72}
              >
                <Ionicons name="pause" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sideBtn, { backgroundColor: `${colors.destructive}22` }]}
                onPress={handleFinish}
                activeOpacity={0.72}
              >
                <Ionicons name="stop" size={22} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isPaused && (
          <View style={styles.pausedRow}>
            <TouchableOpacity
              style={[styles.halfBtn, { backgroundColor: colors.primary }]}
              onPress={handleResume}
              activeOpacity={0.82}
            >
              <Ionicons name="play" size={22} color={colors.primaryForeground} />
              <Text style={[styles.actionTxt, { color: colors.primaryForeground }]}>Continuar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.halfBtn, { backgroundColor: colors.destructive }]}
              onPress={handleFinish}
              activeOpacity={0.82}
            >
              <Ionicons name="stop" size={22} color="#fff" />
              <Text style={[styles.actionTxt, { color: '#fff' }]}>Finalizar</Text>
            </TouchableOpacity>
          </View>
        )}

        {isFinished && (
          <TouchableOpacity
            style={[styles.bigBtn, { backgroundColor: colors.primary }]}
            onPress={() => { reset(); setShowSetup(true); }}
            activeOpacity={0.82}
          >
            <Ionicons name="refresh" size={22} color={colors.primaryForeground} />
            <Text style={[styles.bigBtnTxt, { color: colors.primaryForeground }]}>Nuevo entrenamiento</Text>
          </TouchableOpacity>
        )}
      </View>

      <SetupModal
        visible={showSetup}
        onClose={() => setShowSetup(false)}
        onStart={handleStart}
        defaults={{
          athleteName: settings.athleteName,
          trainingType: settings.defaultTrainingType,
          distancePerLap: settings.defaultDistancePerLap,
        }}
      />
    </View>
  );
}

function StripChip({ label, value, color, colors }: any) {
  return (
    <View style={styles.chipItem}>
      <Text style={[styles.chipVal, { color, fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] as any }]}>
        {value}
      </Text>
      <Text style={[styles.chipLbl, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  timerZone: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  sessionMeta: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  timer: { fontSize: 58, fontFamily: 'Inter_700Bold', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  lapInfoRow: { alignItems: 'center', marginTop: 8, gap: 2 },
  lapLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2 },
  lapClock: { fontSize: 24, fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] },
  idleHint: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 6 },
  finishedZone: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  finishedTitle: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  finishedSub: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  prRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  prTxt: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  strip: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 14, borderRadius: 12, padding: 10,
    borderWidth: StyleSheet.hairlineWidth, marginBottom: 10,
  },
  chipItem: { flex: 1, alignItems: 'center', gap: 2 },
  chipVal: { fontSize: 13 },
  chipLbl: { fontSize: 9 },
  div: { width: 1, height: 26 },
  lapsSection: { flex: 1 },
  lapsHead: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  lhTxt: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  btns: { paddingHorizontal: 14, paddingTop: 10, gap: 10 },
  bigBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingVertical: 20, borderRadius: 16,
  },
  bigBtnTxt: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  actionRow: { flexDirection: 'row', gap: 10 },
  lapBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 20, borderRadius: 16, borderWidth: 2,
  },
  sideStack: { gap: 10 },
  sideBtn: { width: 62, height: 62, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pausedRow: { flexDirection: 'row', gap: 10 },
  halfBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 20, borderRadius: 16,
  },
  actionTxt: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
