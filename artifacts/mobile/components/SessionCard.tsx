import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Session } from '@/types/training';
import { calculateStats, formatDate, formatTime } from '@/utils/calculations';

interface Props {
  session: Session;
  onPress: () => void;
}

type VolumeStatus = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

export function SessionCard({ session, onPress }: Props) {
  const colors = useColors();
  const stats = calculateStats(session.laps, session.distancePerLap, session.targetLapTimeMs);
  const hasVolumeTarget = !!session.targetLapCount && session.targetLapCount > 0;
  const volumePct = hasVolumeTarget
    ? Math.min(100, (session.laps.length / session.targetLapCount!) * 100)
    : 0;
  const volumeComplete = hasVolumeTarget && session.laps.length >= session.targetLapCount!;

  let volumeStatus: VolumeStatus | null = null;
  if (hasVolumeTarget) {
    if (session.laps.length > session.targetLapCount!) {
      volumeStatus = {
        label: 'Sobrecumplido',
        icon: 'arrow-up-circle',
        color: colors.primary,
      };
    } else if (session.laps.length === session.targetLapCount!) {
      volumeStatus = {
        label: 'Cumplido',
        icon: 'checkmark-circle',
        color: colors.lapBest,
      };
    } else {
      volumeStatus = {
        label: 'Incompleto',
        icon: 'close-circle',
        color: colors.lapWorst,
      };
    }
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.72}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.typePill, { backgroundColor: `${colors.primary}22` }]}>
            <Text style={[styles.type, { color: colors.primary }]}>{session.trainingType}</Text>
          </View>

          {session.athleteCategory && (
            <View style={[styles.categoryPill, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}40` }]}>
              <Ionicons name="ribbon-outline" size={12} color={colors.primary} />
              <Text style={[styles.categoryText, { color: colors.primary }]}>{session.athleteCategory}</Text>
            </View>
          )}

          {volumeStatus && (
            <View style={[styles.statusPill, { backgroundColor: `${volumeStatus.color}18` }]}>
              <Ionicons name={volumeStatus.icon} size={13} color={volumeStatus.color} />
              <Text style={[styles.statusText, { color: volumeStatus.color }]}>{volumeStatus.label}</Text>
              <Text style={[styles.statusCount, { color: volumeStatus.color }]}>
                {session.laps.length}/{session.targetLapCount}
              </Text>
            </View>
          )}

          {session.distancePerLap > 0 && (
            <Text style={[styles.distance, { color: colors.mutedForeground }]}>{session.distancePerLap}m/v</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      </View>

      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {formatDate(session.date)}{session.athleteName ? ` · ${session.athleteName}` : ''}
      </Text>

      <View style={styles.statsRow}>
        <Chip label="Tiempo" value={formatTime(session.totalTime)} colors={colors} />
        <Chip
          label="Vueltas"
          value={hasVolumeTarget ? `${session.laps.length}/${session.targetLapCount}` : String(session.laps.length)}
          colors={colors}
          accent={hasVolumeTarget ? (volumeComplete ? colors.lapBest : colors.lapWorst) : undefined}
        />
        {hasVolumeTarget && (
          <Chip
            label="Volumen"
            value={`${Math.round(volumePct)}%`}
            colors={colors}
            accent={volumeComplete ? colors.lapBest : colors.lapWorst}
          />
        )}
        {stats.bestLap && (
          <Chip label="Mejor v." value={formatTime(stats.bestLap.lapTime)} colors={colors} accent={colors.lapBest} />
        )}
        {session.targetLapTimeMs && session.laps.length > 0 && (
          <Chip
            label="Ritmo"
            value={`${Math.round(stats.targetCompliance)}%`}
            colors={colors}
            accent={stats.targetCompliance >= 80 ? colors.lapBest : colors.primary}
          />
        )}
        {stats.averageSpeed > 0 && (
          <Chip label="Vel. med." value={`${stats.averageSpeed.toFixed(1)} km/h`} colors={colors} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function Chip({
  label,
  value,
  colors,
  accent,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  accent?: string;
}) {
  return (
    <View style={styles.chip}>
      <Text style={[styles.chipValue, { color: accent ?? colors.foreground }]}>{value}</Text>
      <Text style={[styles.chipLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  type: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  statusCount: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    fontVariant: ['tabular-nums'],
  },
  distance: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  chip: {
    gap: 1,
  },
  chipValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    fontVariant: ['tabular-nums'],
  },
  chipLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
});
