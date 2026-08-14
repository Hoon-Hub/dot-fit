import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { STEP_GOAL_OPTIONS } from '../constants/activity';
import { Colors, Spacing } from '../constants/theme';
import { formatNumber } from '../utils/dateUtils';

export default function StepGoalSelector({
  selectedGoalSteps,
  onSelect,
  colorScheme = 'light',
  disabled = false,
  disabledGoalSteps = [],
}) {
  const theme = Colors[colorScheme] || Colors.light;

  return (
    <View style={styles.options}>
      {STEP_GOAL_OPTIONS.map((option) => {
        const isSelected = selectedGoalSteps === option.steps;
        const isDisabled = disabled || disabledGoalSteps.includes(option.steps);

        return (
          <TouchableOpacity
            key={option.steps}
            style={[
              styles.optionCard,
              {
                backgroundColor: isSelected ? theme.todayHighlight : theme.card,
                borderColor: isSelected ? theme.primary : theme.border,
                opacity: isDisabled ? 0.45 : 1,
              },
            ]}
            onPress={() => onSelect(option.steps)}
            disabled={isDisabled}
            activeOpacity={0.75}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected, disabled: isDisabled }}
            accessibilityLabel={`${formatNumber(option.steps)}걸음, 달성 시 ${option.rewardCoins}코인`}
          >
            <View style={styles.optionTextArea}>
              <View style={styles.labelRow}>
                <Text style={[styles.optionLabel, { color: theme.text }]}>
                  {option.label}
                </Text>
                {option.recommended && (
                  <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                    <Text style={[styles.badgeText, { color: theme.textInverse }]}>추천</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.steps, { color: theme.text }]}>
                {formatNumber(option.steps)}걸음
              </Text>
            </View>

            <Text style={[styles.reward, { color: theme.textSecondary }]}>
              🪙 {option.rewardCoins}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  options: {
    width: '100%',
    gap: Spacing.sm,
  },
  optionCard: {
    minHeight: 80,
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTextArea: {
    gap: 3,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  steps: {
    fontSize: 20,
    fontWeight: '800',
  },
  reward: {
    fontSize: 16,
    fontWeight: '800',
  },
});
