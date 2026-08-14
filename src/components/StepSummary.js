import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { formatNumber } from '../utils/dateUtils';

export default function StepSummary({
  activity,
  coinBalance = 0,
  isRefreshing,
  onRefresh,
  colorScheme = 'light',
}) {
  const theme = Colors[colorScheme] || Colors.light;

  if (!activity) return null;

  const { steps } = activity;

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <View style={styles.stepNumberRow}>
          <Text style={[styles.stepCount, { color: theme.text }]}>
            {formatNumber(steps)}
          </Text>
          <Text style={[styles.stepUnit, { color: theme.textSecondary }]}>걸음</Text>
        </View>

        <View style={styles.topActions}>
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

          <View
            style={[styles.coinBalance, { backgroundColor: theme.card, borderColor: theme.border }]}
            accessibilityLabel={`보유 코인 ${coinBalance}개`}
          >
            <Text style={styles.coinIcon}>🪙</Text>
            <Text style={[styles.coinText, { color: theme.text }]}>{formatNumber(coinBalance)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 0,
  },
  refreshIconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: {
    fontSize: 22,
    fontWeight: '700',
  },
  stepNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexShrink: 1,
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
  coinBalance: {
    minHeight: 36,
    minWidth: 66,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  coinIcon: {
    fontSize: 16,
  },
  coinText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
