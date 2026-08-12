import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { getDayOfWeekShort, formatShortDate, isToday, formatNumber } from '../utils/dateUtils';

export default function WeeklyActivity({ weeklyData = [], dailyGoal = 10000, colorScheme = 'light' }) {
  const theme = Colors[colorScheme] || Colors.light;

  if (!weeklyData || weeklyData.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>최근 7일</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {weeklyData.map((item) => {
          const itemIsToday = isToday(item.date);
          const dayName = getDayOfWeekShort(item.date);
          const shortDate = formatShortDate(item.date);
          const isGoalReached = item.steps >= dailyGoal;

          return (
            <View
              key={item.date}
              style={[
                styles.card,
                {
                  backgroundColor: itemIsToday ? theme.todayHighlight : theme.card,
                  borderColor: itemIsToday ? theme.primary : theme.border,
                },
              ]}
            >
              {/* 요일 */}
              <Text
                style={[
                  styles.dayText,
                  { color: itemIsToday ? theme.primary : theme.textSecondary },
                ]}
              >
                {dayName}
              </Text>

              {/* 날짜 (M/D) */}
              <Text
                style={[
                  styles.dateText,
                  { color: itemIsToday ? theme.primary : theme.textSecondary },
                ]}
              >
                {shortDate}
              </Text>

              {/* 걸음수 */}
              <Text
                style={[
                  styles.stepsText,
                  { color: itemIsToday ? theme.primary : theme.text },
                ]}
              >
                {formatNumber(item.steps)}
              </Text>

              {/* 하단 미니 달성 상태 지표 */}
              <View
                style={[
                  styles.miniIndicator,
                  { backgroundColor: isGoalReached ? theme.primary : theme.border },
                ]}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  scrollContent: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  card: {
    width: 80,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xs,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  stepsText: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  miniIndicator: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
    marginTop: 4,
  },
});
