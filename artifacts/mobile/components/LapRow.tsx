import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Lap } from '@/types/training';
import { formatTime, formatSpeed } from '@/utils/calculations';

interface Props {
  lap: Lap;
  isBest: boolean;
  isWorst: boolean;
  distancePerLap: number;
  avgLapTime: number;
}

export function LapRow({ lap, isBest, isWorst, distancePerLap, avgLapTime }: Props) {
  const colors = useColors();

  const delta = avgLapTime > 0 ? lap.lapTime - avgLapTime : 0;
  const absDelta = Math.abs(delta);
  const deltaStr =
    isBest ? 'Mejor' : isWorst ? 'Peor' : delta === 0 ? '—' : `${delta > 0 ? '+' : '-'}${formatTime(absDelta)}`;
  const deltaColor =
    isBest ? colors.lapBest : isWorst ? colors.lapWorst : delta <= 0 ? colors.lapBest : colors.mutedForeground;

  const rowBg = isBest
    ? `${colors.lapBest}18`
    : isWorst
      ? `${colors.lapWorst}12`
      : undefined;

  return (
    <View style={[styles.row, { backgroundColor: rowBg, borderBottomColor: colors.border }]}>
      <View style={[styles.badge, { backgroundColor: isBest ? colors.lapBest : isWorst ? colors.lapWorst : colors.muted }]}>
        <Text style={[styles.lapNum, { color: isBest || isWorst ? '#fff' : colors.mutedForeground }]}>
          {lap.number}
        </Text>
      </View>

      <Text style={[styles.lapTime, { color: colors.foreground }]} numberOfLines={1}>
        {formatTime(lap.lapTime)}
      </Text>

      <Text style={[styles.cumTime, { color: colors.mutedForeground }]} numberOfLines={1}>
        {formatTime(lap.cumulativeTime)}
      </Text>

      {distancePerLap > 0 && (
        <Text style={[styles.speed, { color: colors.mutedForeground }]} numberOfLines={1}>
          {formatSpeed(lap.speed ?? 0)}
        </Text>
      )}

      <Text style={[styles.delta, { color: deltaColor }]} numberOfLines={1}>
        {deltaStr}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lapNum: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  lapTime: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    fontVariant: ['tabular-nums'],
  },
  cumTime: {
    width: 76,
    fontSize: 13,
    textAlign: 'right',
    fontFamily: 'Inter_400Regular',
    fontVariant: ['tabular-nums'],
  },
  speed: {
    width: 68,
    fontSize: 13,
    textAlign: 'right',
    fontFamily: 'Inter_400Regular',
  },
  delta: {
    width: 60,
    fontSize: 12,
    textAlign: 'right',
    fontFamily: 'Inter_500Medium',
    fontVariant: ['tabular-nums'],
  },
});
