import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  View,
  Text,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StepSummary from '../../components/StepSummary';
import CharacterSection from '../../components/CharacterSection';
import GoalProgress from '../../components/GoalProgress';
import WeeklyActivity from '../../components/WeeklyActivity';
import {
  initializeHealthConnect,
  hasStepPermission,
  requestStepPermission,
  getTodayActivity,
  getCachedWeeklyActivity,
  refreshActivity,
} from '../../services/healthService';
import { Colors, Spacing, MaxContentWidth } from '../../constants/theme';
import { DAILY_GOAL_STEPS } from '../../constants/activity';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] || Colors.light;

  const [todayData, setTodayData] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  const updateTodayAndWeekly = useCallback((today) => {
    setTodayData(today);
    setWeeklyData((currentWeekly) =>
      currentWeekly.map((item) =>
        item.date === today.date ? { ...item, steps: today.steps } : item,
      ),
    );
  }, []);

  const loadInitialData = useCallback(async () => {
    let hasCachedWeeklyData = false;

    try {
      setError(null);

      const cachedWeekly = await getCachedWeeklyActivity();
      hasCachedWeeklyData = Boolean(cachedWeekly);

      if (cachedWeekly && isMountedRef.current) {
        const cachedToday = cachedWeekly[cachedWeekly.length - 1];
        setWeeklyData(cachedWeekly);
        setTodayData({
          date: cachedToday.date,
          steps: cachedToday.steps,
          goal: DAILY_GOAL_STEPS,
          goalCompleted: cachedToday.steps >= DAILY_GOAL_STEPS,
        });
        setLoading(false);
        setRefreshing(true);
      }

      const isInitialized = await initializeHealthConnect();
      if (!isInitialized) {
        throw new Error('Health Connect initialization failed.');
      }

      const hasPermission = await hasStepPermission();
      if (!hasPermission && !(await requestStepPermission())) {
        throw new Error('Health Connect step permission is not granted.');
      }

      if (cachedWeekly) {
        const today = await getTodayActivity();
        if (today.date === cachedWeekly[cachedWeekly.length - 1].date) {
          if (isMountedRef.current) updateTodayAndWeekly(today);
        } else {
          const activity = await refreshActivity();
          if (isMountedRef.current) {
            setTodayData(activity.today);
            setWeeklyData(activity.weekly);
          }
        }
      } else {
        const activity = await refreshActivity();
        if (isMountedRef.current) {
          setTodayData(activity.today);
          setWeeklyData(activity.weekly);
        }
      }
    } catch (err) {
      console.error('Failed to load health activity:', err);
      if (isMountedRef.current) {
        setError('활동 데이터를 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        if (hasCachedWeeklyData) setRefreshing(false);
      }
    }
  }, [updateTodayAndWeekly]);

  useEffect(() => {
    isMountedRef.current = true;
    const loadTimer = setTimeout(() => {
      loadInitialData();
    }, 0);

    return () => {
      clearTimeout(loadTimer);
      isMountedRef.current = false;
    };
  }, [loadInitialData]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      const updated = await refreshActivity();
      if (isMountedRef.current) {
        setTodayData(updated.today);
        setWeeklyData(updated.weekly);
      }
    } catch (err) {
      console.error('Failed to refresh health activity:', err);
      if (isMountedRef.current) {
        setError('데이터 새로고침에 실패했습니다.');
      }
    } finally {
      if (isMountedRef.current) setRefreshing(false);
    }
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            걸음수 데이터를 불러오는 중...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <View style={styles.contentWrapper}>
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: theme.border }]}>
              <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
            </View>
          )}

          {/* 1. 오늘 걸음수 + 이동거리/운동칼로리 + 우측 상단 새로고침 ↻ */}
          <StepSummary
            activity={todayData}
            isRefreshing={refreshing}
            onRefresh={handleRefresh}
            colorScheme={colorScheme}
          />

          {/* 2. 사람 캐릭터 영역 (화면 높이의 약 30%) */}
          <CharacterSection colorScheme={colorScheme} />

          {/* 3. 목표 진행률 및 Progress Bar */}
          <GoalProgress
            steps={todayData?.steps || 0}
            goal={todayData?.goal || DAILY_GOAL_STEPS}
            colorScheme={colorScheme}
          />

          {/* 뷰포트 분리 버퍼 여백 */}
          <View style={styles.foldBuffer} />

          {/* 4. 최근 7일 가로 카드 UI (스크롤 시 노출) */}
          <WeeklyActivity
            weeklyData={weeklyData}
            dailyGoal={todayData?.goal || DAILY_GOAL_STEPS}
            colorScheme={colorScheme}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
  },
  errorContainer: {
    padding: Spacing.md,
    borderRadius: 8,
    marginVertical: Spacing.sm,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  foldBuffer: {
    height: Spacing.lg,
  },
});
