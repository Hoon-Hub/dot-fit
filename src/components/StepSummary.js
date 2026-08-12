import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { formatNumber } from '../utils/dateUtils';

export default function StepSummary({ activity, isRefreshing, onRefresh, colorScheme = 'light' }) {
  const theme = Colors[colorScheme] || Colors.light;

  if (!activity) return null;

  const { steps, distance, calories } = activity;

  return (
    <View style={styles.container}>
      {/* 우측 상단 독립 배치된 새로고침 아이콘 버튼 */}
      <TouchableOpacity
        style={styles.refreshIconButton}
        onPress={onRefresh}
        disabled={isRefreshing}
        activeOpacity={0.7}
        accessibilityLabel="걸음수 새로고침"
        accessibilityRole="button"
      >
        {isRefreshing ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Text style={[styles.refreshIcon, { color: theme.primary }]}>↻</Text>
        )}
      </TouchableOpacity>

      {/* 메인 걸음수 영역 */}
      <View style={styles.stepContainer}>
        <View style={styles.stepNumberRow}>
          <Text style={[styles.stepCount, { color: theme.text }]}>
            {formatNumber(steps)}
          </Text>
          <Text style={[styles.stepUnit, { color: theme.textSecondary }]}>걸음</Text>
        </View>
      </View>

      {/* 보조 지표 (이동 거리 & 운동 칼로리) */}
      <View style={styles.metricsRow}>
        {distance !== null && (
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: theme.text }]}>{distance} km</Text>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>이동 거리</Text>
          </View>
        )}
        {distance !== null && calories !== null && (
          <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />
        )}
        {calories !== null && (
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: theme.text }]}>{calories} kcal</Text>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>운동 칼로리</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    position: 'relative',
  },
  refreshIconButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  refreshIcon: {
    fontSize: 22,
    fontWeight: '700',
  },
  stepContainer: {
    alignItems: 'flex-start',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  stepNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  stepCount: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  stepUnit: {
    fontSize: 20,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  metricItem: {
    marginRight: Spacing.md,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    marginRight: Spacing.md,
  },
});
