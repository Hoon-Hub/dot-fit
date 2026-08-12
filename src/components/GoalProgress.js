import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { formatNumber } from '../utils/dateUtils';

export default function GoalProgress({ steps = 0, goal = 10000, colorScheme = 'light' }) {
  const theme = Colors[colorScheme] || Colors.light;

  const rawPercentage = goal > 0 ? Math.round((steps / goal) * 100) : 0;
  const clampedPercentage = Math.min(100, Math.max(0, rawPercentage));
  const isGoalReached = steps >= goal;

  return (
    <View style={styles.container}>
      {/* 목표 걸음수 및 달성률 */}
      <View style={styles.infoRow}>
        <Text style={[styles.goalText, { color: theme.textSecondary }]}>
          목표 {formatNumber(goal)}걸음
        </Text>
        <Text style={[styles.percentageText, { color: theme.primary }]}>
          {rawPercentage}%
        </Text>
      </View>

      {/* Progress Bar (width capped at 100%) */}
      <View style={[styles.progressTrack, { backgroundColor: theme.progressTrack }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.progressFill,
              width: `${clampedPercentage}%`,
            },
          ]}
        />
      </View>

      {/* 목표를 달성한 경우에만 달성 메시지 표시 */}
      {isGoalReached && (
        <View style={styles.statusRow}>
          <Text style={[styles.statusText, { color: theme.primary }]}>
            🎉 오늘의 목표를 달성했습니다!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  goalText: {
    fontSize: 14,
    fontWeight: '600',
  },
  percentageText: {
    fontSize: 15,
    fontWeight: '800',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  statusRow: {
    marginTop: Spacing.xs,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
