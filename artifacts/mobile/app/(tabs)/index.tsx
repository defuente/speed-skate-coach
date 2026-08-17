import React, { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useSettings } from '@/context/SettingsContext';
import { useTraining } from '@/context/TrainingContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SetupModal } from '@/components/SetupModal';
import { LapRow } from '@/components/LapRow';
import { Lap, SessionConfig } from '@/types/training';
import { calculateStats, formatTime, isLapOnTarget } from '@/utils/calculations';
import { saveSession } from '@/utils/storage';

export default function CronometroScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const {
    timerState,
    elapsed,
    currentLapTime,
    laps,
    sessionConfig,
    start,
    pause,
    resume,
    addLap,
    finish,
    reset,
  } = useTraining();

  const [showSetup, setShowSetup] = useState(false);
  const lapListRef = useRef<FlatList>(null);

  const isIdle = timerState === 'idle';
  const isRunning = timerState === 'running';
  const isPaused = timerState === 'paused';
  const isFinished = timerState === 'finished';
  const isActive = isRunning || isPaused;

  const targetLapTimeMs = sessionConfig.targetLapTimeMs;
  const targetLapCount = sessionConfig.targetLapCount;
  const hasTimeTarget = !!targetLapTimeMs && targetLapTimeMs > 0;
  const hasVolumeTarget = !!targetLapCount && targetLapCount > 0;

  const currentOnTarget = hasTimeTarget ? currentLapTime <= targetLapTimeMs! : false;
  const currentDelta = hasTimeTarget ? currentLapTime - targetLapTimeMs! : 0;
  const stats = calculateStats(laps, sessionConfig.distancePerLap, targetLapTimeMs);
  const lapsMissedTarget = hasTimeTarget ? laps.length - stats.lapsOnTarget : 0;

  const volumeCompliance = hasVolumeTarget
    ? Math.min(100, (laps.length / targetLapCount!) * 100)
    : 0;
  const remainingLaps = hasVolumeTarget ? Math.max(0, targetLapCount! - laps.length) : 0;
  const volumeComplete = hasVolumeTarget && laps.length >= targetLapCount!;

  const webTop = Platform.OS === 'web' ? 67 : 0;
  const bottomNavSpace = Platform.OS === 'web' ? 92 : Math.max(insets.bottom, 10) + 72;

  const handleStart = useCallback((config: SessionConfig) => {
    setShowSetup(false);
    start(config);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [start]);

  const handleLap = useCallback(() => {
    addLap();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      try {
        lapListRef.current?.scrollToIndex({ index: 0, animated: true });
      } catch {}
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

    if (result.laps.length) {
      await saveSession({
        id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
        date: new Date().toISOString(),
        athleteName: sessionConfig.athleteName,
        trainingType: sessionConfig.trainingType,
        distancePerLap: sessionConfig.distancePerLap,
        targetLapTimeMs: sessionConfig.targetLapTimeMs,
        targetLapCount: sessionConfig.targetLapCount,
        laps: result.laps,
        totalTime: result.totalTime,
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [finish, sessionConfig]);

  const handleFinish = useCallback(() => {
    const volumeMessage = hasVolumeTarget && !volumeComplete
      ? `\n\nLleva ${laps.length} de ${targetLapCount} vueltas (${Math.round(volumeCompliance)}%).`
      : '';

    Alert.alert('Finalizar', `¿Terminar el entrenamiento?${volumeMessage}`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Finalizar', style: 'destructive', onPress: doFinish },
    ]);
  }, [doFinish, hasVolumeTarget, laps.length, targetLapCount, volumeCompliance, volumeComplete]);

  const targetStatusColor = currentOnTarget ? colors.lapBest : colors.lapWorst;
  const targetStatusBackground = currentOnTarget ? `${colors.lapBest}16` : `${colors.lapWorst}16`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: webTop }]}>
      <View style={[styles.timerZone, { paddingTop: isActive ? insets.top + 8 : insets.top + 36 }]}>
        {isActive && (
          <Text style={[styles.sessionMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {sessionConfig.athleteName || 'Sin nombre'} · {sessionConfig.trainingType}
            {sessionConfig.distancePerLap > 0 ? ` · ${sessionConfig.distancePerLap}m` : ''}
          </Text>
        )}

        {isFinished ? (
          <View style={styles.finishedZone}>
            <Ionicons name="checkmark-circle" size={56} color={colors.success} />
            <Text style={[styles.finishedTitle, { color: colors.foreground }]}>¡Completado!</Text>
            <Text style={[styles.finishedSub, { color: colors.mutedForeground }]}>
              {hasVolumeTarget ? `${laps.length}/${targetLapCount} vueltas` : `${laps.length} vueltas`} · {formatTime(elapsed)}
            </Text>
            {hasVolumeTarget && (
              <Text style={[styles.volumeFinishedText, { color: volumeComplete ? colors.lapBest : colors.lapWorst }]}>
                {volumeComplete ? '✓ Volumen objetivo cumplido' : `${Math.round(volumeCompliance)}% del volumen objetivo`}
              </Text>
            )}
            {stats.bestLap && (
              <Text style={[styles.prTxt, { color: colors.lapBest }]}>Mejor vuelta: {formatTime(stats.bestLap.lapTime)}</Text>
            )}
          </View>
        ) : (
          <>
            <Text style={[styles.timer, { color: colors.timerDisplay }]}>{formatTime(elapsed)}</Text>
            {isActive && (
              hasTimeTarget ? (
                <View
                  style={[
                    styles.targetLapBox,
                    { backgroundColor: targetStatusBackground, borderColor: `${targetStatusColor}55` },
                  ]}
                >
                  <View style={styles.currentLapHeader}>
                    <Text style={[styles.lapLabel, { color: colors.mutedForeground }]}>VUELTA {laps.length + 1}</Text>
                    <View style={[styles.liveStatusPill, { backgroundColor: `${targetStatusColor}22` }]}>
                      <Ionicons
                        name={currentOnTarget ? 'checkmark-circle' : 'alert-circle'}
                        size={13}
                        color={targetStatusColor}
                      />
                      <Text style={[styles.liveStatusText, { color: targetStatusColor }]}>
                        {currentOnTarget ? 'EN OBJETIVO' : 'SOBRE OBJETIVO'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.targetLapClock, { color: targetStatusColor }]}>{formatTime(currentLapTime)}</Text>
                  <Text style={[styles.targetDeltaText, { color: targetStatusColor }]}>
                    {currentOnTarget
                      ? `Margen ${formatCompactDelta(Math.abs(currentDelta))}`
                      : `Exceso ${formatCompactDelta(Math.abs(currentDelta))}`}
                    {' · '}Objetivo {formatTime(targetLapTimeMs!)}
                  </Text>
                </View>
              ) : (
                <View style={styles.lapInfoRow}>
                  <Text style={[styles.lapLabel, { color: colors.mutedForeground }]}>VUELTA {laps.length + 1}</Text>
                  <Text style={[styles.lapClock, { color: colors.primary }]}>{formatTime(currentLapTime)}</Text>
                </View>
              )
            )}
            {isIdle && (
              <Text style={[styles.idleHint, { color: colors.mutedForeground }]}>Cronómetro de alta precisión</Text>
            )}
          </>
        )}
      </View>

      {isActive && hasVolumeTarget && (
        <VolumeTargetPanel
          actual={laps.length}
          target={targetLapCount!}
          compliance={volumeCompliance}
          remaining={remainingLaps}
          complete={volumeComplete}
          colors={colors}
        />
      )}

      {isActive && hasTimeTarget && (
        <LiveCoachPanel
          laps={laps}
          target={targetLapTimeMs!}
          lapsOnTarget={stats.lapsOnTarget}
          lapsMissedTarget={lapsMissedTarget}
          compliance={stats.targetCompliance}
          colors={colors}
        />
      )}

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
              <StripChip label="Vel. med." value={stats.averageSpeed.toFixed(1)} color={colors.primary} colors={colors} />
            </>
          )}
        </View>
      )}

      {laps.length > 0 && (
        <View style={styles.lapsSection}>
          <View style={[styles.lapsHead, { borderBottomColor: colors.border }]}>
            <Text style={[styles.lhTxt, { color: colors.mutedForeground, width: 34 }]}>V</Text>
            <Text style={[styles.lhTxt, { color: colors.mutedForeground, flex: 1 }]}>Vuelta</Text>
            <Text style={[styles.lhTxt, { color: colors.mutedForeground, width: 76, textAlign: 'right' }]}>Total</Text>
            {sessionConfig.distancePerLap > 0 && (
              <Text style={[styles.lhTxt, { color: colors.mutedForeground, width: 68, textAlign: 'right' }]}>Vel.</Text>
            )}
            <Text style={[styles.lhTxt, { color: colors.mutedForeground, width: 68, textAlign: 'right' }]}>
              {hasTimeTarget ? 'Objetivo' : 'Δ'}
            </Text>
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
                targetLapTimeMs={targetLapTimeMs}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      <View style={[styles.btns, { paddingBottom: bottomNavSpace }]}>
        {isIdle && (
          <TouchableOpacity style={[styles.bigBtn, { backgroundColor: colors.primary }]} onPress={() => setShowSetup(true)}>
            <Ionicons name="play" size={23} color={colors.primaryForeground} />
            <Text style={[styles.bigBtnTxt, { color: colors.primaryForeground }]}>Nuevo entrenamiento</Text>
          </TouchableOpacity>
        )}

        {isRunning && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.lapBtn, { backgroundColor: colors.card, borderColor: colors.primary }]} onPress={handleLap}>
              <Ionicons name="flag" size={24} color={colors.primary} />
              <Text style={[styles.actionTxt, { color: colors.primary }]}>Vuelta</Text>
            </TouchableOpacity>
            <View style={styles.sideStack}>
              <TouchableOpacity style={[styles.sideBtn, { backgroundColor: colors.secondary }]} onPress={handlePause}>
                <Ionicons name="pause" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sideBtn, { backgroundColor: `${colors.destructive}22` }]} onPress={handleFinish}>
                <Ionicons name="stop" size={22} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isPaused && (
          <View style={styles.pausedRow}>
            <TouchableOpacity style={[styles.halfBtn, { backgroundColor: colors.primary }]} onPress={handleResume}>
              <Ionicons name="play" size={22} color={colors.primaryForeground} />
              <Text style={[styles.actionTxt, { color: colors.primaryForeground }]}>Continuar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.halfBtn, { backgroundColor: colors.destructive }]} onPress={handleFinish}>
              <Ionicons name="stop" size={22} color="#fff" />
              <Text style={[styles.actionTxt, { color: '#fff' }]}>Finalizar</Text>
            </TouchableOpacity>
          </View>
        )}

        {isFinished && (
          <TouchableOpacity
            style={[styles.bigBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              reset();
              setShowSetup(true);
            }}
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

function VolumeTargetPanel({
  actual,
  target,
  compliance,
  remaining,
  complete,
  colors,
}: {
  actual: number;
  target: number;
  compliance: number;
  remaining: number;
  complete: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const statusColor = complete ? colors.lapBest : colors.primary;
  return (
    <View style={[styles.volumePanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.volumeHeader}>
        <View>
          <Text style={[styles.coachEyebrow, { color: colors.mutedForeground }]}>VOLUMEN OBJETIVO</Text>
          <Text style={[styles.volumeValue, { color: statusColor }]}>{actual} / {target} vueltas</Text>
        </View>
        <View style={[styles.volumeStatusPill, { backgroundColor: `${statusColor}18` }]}>
          <Ionicons name={complete ? 'checkmark-circle' : 'flag-outline'} size={15} color={statusColor} />
          <Text style={[styles.volumeStatusText, { color: statusColor }]}>
            {complete ? 'OBJETIVO CUMPLIDO' : `${Math.round(compliance)}%`}
          </Text>
        </View>
      </View>
      <View style={[styles.volumeTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.volumeFill, { width: `${Math.min(100, compliance)}%`, backgroundColor: statusColor }]} />
      </View>
      <Text style={[styles.volumeHint, { color: colors.mutedForeground }]}>
        {complete
          ? 'Puedes seguir registrando vueltas extra.'
          : `Faltan ${remaining} vuelta${remaining !== 1 ? 's' : ''} para completar el volumen.`}
      </Text>
    </View>
  );
}

function LiveCoachPanel({
  laps,
  target,
  lapsOnTarget,
  lapsMissedTarget,
  compliance,
  colors,
}: {
  laps: Lap[];
  target: number;
  lapsOnTarget: number;
  lapsMissedTarget: number;
  compliance: number;
  colors: ReturnType<typeof useColors>;
}) {
  const recent = laps.slice(-5);
  return (
    <View style={[styles.coachPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.coachSummaryRow}>
        <View style={styles.coachTargetBlock}>
          <Text style={[styles.coachEyebrow, { color: colors.mutedForeground }]}>VISTA DE ENTRENADOR · OBJETIVO / VUELTA</Text>
          <Text style={[styles.coachTargetValue, { color: colors.primary }]}>{formatTime(target)}</Text>
        </View>
        <View style={styles.coachCounters}>
          <CoachCounter icon="checkmark" value={lapsOnTarget} label="cumplidas" color={colors.lapBest} textColor={colors.mutedForeground} />
          <CoachCounter icon="close" value={lapsMissedTarget} label="fuera" color={colors.lapWorst} textColor={colors.mutedForeground} />
          <CoachCounter icon="analytics-outline" value={`${Math.round(compliance)}%`} label="cumplimiento" color={colors.primary} textColor={colors.mutedForeground} />
        </View>
      </View>

      {recent.length > 0 && (
        <View style={[styles.trendSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.coachEyebrow, { color: colors.mutedForeground }]}>ÚLTIMAS VUELTAS</Text>
          <View style={styles.trendRow}>
            {recent.map(lap => {
              const onTarget = isLapOnTarget(lap.lapTime, target);
              const delta = lap.lapTime - target;
              const color = onTarget ? colors.lapBest : colors.lapWorst;
              return (
                <View key={lap.number} style={styles.trendItem}>
                  <View style={[styles.trendCircle, { backgroundColor: `${color}1F`, borderColor: `${color}66` }]}>
                    <Ionicons name={onTarget ? 'checkmark' : 'close'} size={15} color={color} />
                  </View>
                  <Text style={[styles.trendLap, { color: colors.mutedForeground }]}>V{lap.number}</Text>
                  <Text style={[styles.trendDelta, { color }]}>{formatSignedDelta(delta)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function CoachCounter({
  icon,
  value,
  label,
  color,
  textColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color: string;
  textColor: string;
}) {
  return (
    <View style={styles.coachCounter}>
      <View style={[styles.coachCounterIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={13} color={color} />
      </View>
      <Text style={[styles.coachCounterValue, { color }]}>{value}</Text>
      <Text style={[styles.coachCounterLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function StripChip({ label, value, color, colors }: any) {
  return (
    <View style={styles.chipItem}>
      <Text style={[styles.chipVal, { color }]}>{value}</Text>
      <Text style={[styles.chipLbl, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function formatCompactDelta(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatSignedDelta(ms: number): string {
  if (ms === 0) return '0.00s';
  return `${ms > 0 ? '+' : '-'}${(Math.abs(ms) / 1000).toFixed(2)}s`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  timerZone: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  sessionMeta: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 5 },
  timer: { fontSize: 56, fontFamily: 'Inter_700Bold', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  finishedZone: { alignItems: 'center', gap: 6, paddingVertical: 5 },
  finishedTitle: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  finishedSub: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  volumeFinishedText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  prTxt: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  targetLapBox: { width: '100%', marginTop: 6, padding: 9, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  currentLapHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lapLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.1 },
  liveStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveStatusText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  targetLapClock: { fontSize: 28, fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] },
  targetDeltaText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  lapInfoRow: { alignItems: 'center', marginTop: 6, gap: 1 },
  lapClock: { fontSize: 23, fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] },
  idleHint: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 5 },
  volumePanel: { marginHorizontal: 14, borderRadius: 12, padding: 10, borderWidth: StyleSheet.hairlineWidth, marginBottom: 7, gap: 7 },
  volumeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  volumeValue: { fontSize: 18, fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] },
  volumeStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12 },
  volumeStatusText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  volumeTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  volumeFill: { height: '100%', borderRadius: 3 },
  volumeHint: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  coachPanel: { marginHorizontal: 14, borderRadius: 12, padding: 11, borderWidth: StyleSheet.hairlineWidth, marginBottom: 7, gap: 9 },
  coachSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  coachTargetBlock: { flex: 1, gap: 2 },
  coachEyebrow: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.7 },
  coachTargetValue: { fontSize: 18, fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] },
  coachCounters: { flexDirection: 'row', gap: 9 },
  coachCounter: { alignItems: 'center', minWidth: 45 },
  coachCounterIcon: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  coachCounterValue: { fontSize: 13, fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] },
  coachCounterLabel: { fontSize: 7, fontFamily: 'Inter_500Medium' },
  trendSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 6 },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between' },
  trendItem: { alignItems: 'center', minWidth: 48, gap: 2 },
  trendCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  trendLap: { fontSize: 8, fontFamily: 'Inter_600SemiBold' },
  trendDelta: { fontSize: 8, fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] },
  strip: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, borderRadius: 12, padding: 8, borderWidth: StyleSheet.hairlineWidth, marginBottom: 7 },
  chipItem: { flex: 1, alignItems: 'center', gap: 2 },
  chipVal: { fontSize: 13, fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] },
  chipLbl: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  div: { width: 1, height: 26 },
  lapsSection: { flex: 1 },
  lapsHead: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  lhTxt: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  btns: { paddingHorizontal: 14, paddingTop: 8, gap: 8 },
  bigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14 },
  bigBtnTxt: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  actionRow: { flexDirection: 'row', gap: 10 },
  lapBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 104, borderRadius: 16, borderWidth: 2 },
  sideStack: { gap: 8 },
  sideBtn: { width: 58, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pausedRow: { flexDirection: 'row', gap: 10 },
  halfBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  actionTxt: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
