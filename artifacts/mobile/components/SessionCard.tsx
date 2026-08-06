import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@/types/training';
import { formatTime, formatDate, calculateStats } from '@/utils/calculations';

interface Props {
  session: Session;
  onPress: () => void;
}

export function SessionCard({ session, onPress }: Props) {
  const colors = useColors();
  const stats = calculateStats(session.laps, session.distancePerLap);

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
          {session.distancePerLap > 0 && (
            <Text style={[styles.distance, { color: colors.mutedForeground }]}>
              {session.distancePerLap}m/v
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      </View>

      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {formatDate(session.date)}
        {session.athleteName ? ` · ${session.athleteName}` : ''}
      </Text>

      <View style={styles.statsRow}>
        <Chip label="Tiempo" value={formatTime(session.totalTime)} colors={colors} />
        <Chip label="Vueltas" value={String(session.laps.length)} colors={colors} />
        {stats.bestLap && (
          <Chip label="Mejor v." value={formatTime(stats.bestLap.lapTime)} colors={colors} accent={colors.lapBest} />
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
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
