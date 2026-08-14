import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors, Spacing } from '../constants/theme';
import {
  getDayOfWeekShort,
  formatShortDate,
  isToday,
  formatNumber,
  getTodayDateString,
} from '../utils/dateUtils';

const SCROLL_OFFSET_EPSILON = 1;
const weeklyScrollMemory = {
  hasUserScrolled: false,
  offsetX: 0,
};

export default function WeeklyActivity({ weeklyData = [], colorScheme = 'light' }) {
  const theme = Colors[colorScheme] || Colors.light;
  const scrollViewRef = useRef(null);
  const itemLayoutsRef = useRef(new Map());
  const viewportWidthRef = useRef(0);
  const contentWidthRef = useRef(0);
  const currentOffsetRef = useRef(0);
  const isUserInteractingRef = useRef(false);

  const restoreScrollPosition = useCallback(() => {
    const scrollView = scrollViewRef.current;
    const viewportWidth = viewportWidthRef.current;
    const contentWidth = contentWidthRef.current;

    if (
      !scrollView ||
      weeklyData.length === 0 ||
      viewportWidth <= 0 ||
      contentWidth <= 0 ||
      isUserInteractingRef.current
    ) {
      return;
    }

    const maxOffset = Math.max(0, contentWidth - viewportWidth);
    let targetOffset;

    if (weeklyScrollMemory.hasUserScrolled) {
      targetOffset = Math.min(Math.max(weeklyScrollMemory.offsetX, 0), maxOffset);
      weeklyScrollMemory.offsetX = targetOffset;
    } else {
      const todayDate = getTodayDateString();
      const targetItem =
        weeklyData.find((item) => item.date === todayDate) ??
        weeklyData[weeklyData.length - 1];
      const targetLayout = itemLayoutsRef.current.get(targetItem?.date);

      if (!targetLayout) return;

      targetOffset = Math.min(
        Math.max(targetLayout.x + targetLayout.width - viewportWidth, 0),
        maxOffset,
      );
    }

    if (Math.abs(currentOffsetRef.current - targetOffset) <= SCROLL_OFFSET_EPSILON) {
      return;
    }

    scrollView.scrollTo({ x: targetOffset, y: 0, animated: false });
    currentOffsetRef.current = targetOffset;
  }, [weeklyData]);

  const handleScroll = useCallback((event) => {
    currentOffsetRef.current = Math.max(event.nativeEvent.contentOffset.x, 0);
  }, []);

  const rememberUserOffset = useCallback((event) => {
    const offsetX = Math.max(event.nativeEvent.contentOffset.x, 0);
    currentOffsetRef.current = offsetX;
    weeklyScrollMemory.offsetX = offsetX;
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    weeklyScrollMemory.hasUserScrolled = true;
    isUserInteractingRef.current = true;
  }, []);

  const handleScrollEndDrag = useCallback((event) => {
    isUserInteractingRef.current = false;
    rememberUserOffset(event);
  }, [rememberUserOffset]);

  const handleMomentumScrollBegin = useCallback(() => {
    isUserInteractingRef.current = true;
  }, []);

  const handleMomentumScrollEnd = useCallback((event) => {
    isUserInteractingRef.current = false;
    rememberUserOffset(event);
  }, [rememberUserOffset]);

  const handleScrollViewLayout = useCallback((event) => {
    viewportWidthRef.current = event.nativeEvent.layout.width;
    restoreScrollPosition();
  }, [restoreScrollPosition]);

  const handleContentSizeChange = useCallback((width) => {
    contentWidthRef.current = width;
    restoreScrollPosition();
  }, [restoreScrollPosition]);

  const handleItemLayout = useCallback((date, event) => {
    itemLayoutsRef.current.set(date, event.nativeEvent.layout);
    restoreScrollPosition();
  }, [restoreScrollPosition]);

  useFocusEffect(
    useCallback(() => {
      restoreScrollPosition();
    }, [restoreScrollPosition]),
  );

  useEffect(() => {
    restoreScrollPosition();
  }, [restoreScrollPosition]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') restoreScrollPosition();
    });

    return () => subscription.remove();
  }, [restoreScrollPosition]);

  if (!weeklyData || weeklyData.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>최근 7일</Text>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onLayout={handleScrollViewLayout}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollBegin={handleMomentumScrollBegin}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {weeklyData.map((item) => {
          const itemIsToday = isToday(item.date);
          const dayName = getDayOfWeekShort(item.date);
          const shortDate = formatShortDate(item.date);
          const isGoalAchieved = item.goalSteps && item.steps >= item.goalSteps;
          const activityStatus = isGoalAchieved
            ? theme.activityAchieved
            : theme.activityDefault;

          return (
            <View
              key={item.date}
              onLayout={(event) => handleItemLayout(item.date, event)}
              style={[
                styles.card,
                {
                  backgroundColor: activityStatus.background,
                  borderColor: itemIsToday ? theme.todayBorder : activityStatus.border,
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
                  { backgroundColor: activityStatus.accent },
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
