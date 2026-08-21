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
import { useFocusEffect } from 'expo-router';
import StepSummary from '../../components/StepSummary';
import CharacterSection from '../../components/CharacterSection';
import GoalProgress from '../../components/GoalProgress';
import WeeklyActivity from '../../components/WeeklyActivity';
import OwnedAchievements from '../../components/OwnedAchievements';
import {
  initializeHealthConnect,
  hasStepPermission,
  requestStepPermission,
  getCachedActivityAverage,
  getCachedWeeklyActivity,
  refreshActivity,
} from '../../services/healthService';
import { Colors, Spacing, MaxContentWidth } from '../../constants/theme';
import { ACTIVITY_DATA_STATUS } from '../../constants/activity';
import { getGoalForDate, getGoalState } from '../../services/goalService';
import {
  evaluateDailyStepRewards,
  getCoinWallet,
} from '../../services/rewardService';
import { formatNumber } from '../../utils/dateUtils';
import { getAchievementsFromWallet } from '../../services/achievementService';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] || Colors.light;

  const [todayData, setTodayData] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [activityAverage, setActivityAverage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [coinBalance, setCoinBalance] = useState(0);
  const [achievements, setAchievements] = useState([]);
  const [rewardMessage, setRewardMessage] = useState('');
  const [pendingGoal, setPendingGoal] = useState(null);
  const isMountedRef = useRef(true);

  const applyActivityAverage = useCallback((nextAverage) => {
    setActivityAverage((previousAverage) => {
      if (
        previousAverage?.status === nextAverage?.status &&
        previousAverage?.activityState === nextAverage?.activityState
      ) {
        return previousAverage;
      }
      return nextAverage;
    });
  }, []);

  const applyGoalData = useCallback((activity, goalState) => {
    const weekly = activity.weekly.map((item) => ({
      ...item,
      goalSteps: getGoalForDate(goalState, item.date),
    }));
    const goal = getGoalForDate(goalState, activity.today.date);
    const today = {
      ...activity.today,
      goal,
      goalCompleted: Boolean(goal && activity.today.steps >= goal),
    };

    setTodayData(today);
    setWeeklyData(weekly);
    setPendingGoal(
      goalState.pendingGoalSteps
        ? {
            steps: goalState.pendingGoalSteps,
            effectiveDate: goalState.pendingEffectiveDate,
          }
        : null,
    );
  }, []);

  const applyRewards = useCallback(async (activityItems) => {
    const result = await evaluateDailyStepRewards(activityItems);
    if (!isMountedRef.current) return;

    setCoinBalance(result.wallet.balance);
    setAchievements(getAchievementsFromWallet(result.wallet));
    if (result.awardedTransactions.length > 0) {
      const awardedCoins = result.awardedTransactions.reduce(
        (total, transaction) => total + transaction.coins,
        0,
      );
      setRewardMessage(`목표 달성! 🪙 ${awardedCoins}코인이 지급되었어요.`);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    let hasCachedWeeklyData = false;

    try {
      setError(null);

      const [cachedWeekly, cachedAverage, goalState, wallet] = await Promise.all([
        getCachedWeeklyActivity(),
        getCachedActivityAverage(),
        getGoalState(),
        getCoinWallet(),
      ]);
      hasCachedWeeklyData = Boolean(cachedWeekly);

      if (!goalState) throw new Error('Step goal is not configured.');
      if (isMountedRef.current) {
        setCoinBalance(wallet.balance);
        setAchievements(getAchievementsFromWallet(wallet));
        applyActivityAverage(cachedAverage);
      }

      if (cachedWeekly && isMountedRef.current) {
        const cachedToday = cachedWeekly[cachedWeekly.length - 1];
        applyGoalData(
          {
            today: { date: cachedToday.date, steps: cachedToday.steps },
            weekly: cachedWeekly,
          },
          goalState,
        );
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

      const activity = await refreshActivity();
      if (isMountedRef.current) {
        applyGoalData(activity, goalState);
        applyActivityAverage(activity.average);
        if (activity.average.status === ACTIVITY_DATA_STATUS.READY) {
          await applyRewards(activity.weekly);
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
  }, [applyActivityAverage, applyGoalData, applyRewards]);

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

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      Promise.all([getCoinWallet(), getGoalState()])
        .then(([wallet, goalState]) => {
          if (!isActive || !isMountedRef.current) return;
          setCoinBalance(wallet.balance);
          setAchievements(getAchievementsFromWallet(wallet));
          setPendingGoal(
            goalState?.pendingGoalSteps
              ? {
                  steps: goalState.pendingGoalSteps,
                  effectiveDate: goalState.pendingEffectiveDate,
                }
              : null,
          );
        })
        .catch((err) => {
          console.error('Failed to reload home state:', err);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      setRewardMessage('');
      const updated = await refreshActivity();
      if (isMountedRef.current) {
        const goalState = await getGoalState();
        applyGoalData(updated, goalState);
        applyActivityAverage(updated.average);
        if (updated.average.status === ACTIVITY_DATA_STATUS.READY) {
          await applyRewards(updated.weekly);
        }
      }
    } catch (err) {
      console.error('Failed to refresh health activity:', err);
      if (isMountedRef.current) {
        setError('데이터 새로고침에 실패했습니다.');
      }
    } finally {
      if (isMountedRef.current) setRefreshing(false);
    }
  }, [applyActivityAverage, applyGoalData, applyRewards]);

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

          {/* 1. 오늘 걸음수 + 우측 상단 새로고침 및 보유 코인 */}
          <StepSummary
            activity={todayData}
            coinBalance={coinBalance}
            isRefreshing={refreshing}
            onRefresh={handleRefresh}
            colorScheme={colorScheme}
          />

          {Boolean(rewardMessage) && (
            <View style={[styles.rewardContainer, { backgroundColor: theme.todayHighlight, borderColor: theme.border }]}>
              <Text style={[styles.rewardText, { color: theme.text }]}>{rewardMessage}</Text>
            </View>
          )}

          {/* 2. 사람 캐릭터 영역 (화면 높이의 약 30%) */}
          <CharacterSection
            activityDataStatus={activityAverage?.status}
            activityState={activityAverage?.activityState}
            colorScheme={colorScheme}
          />

          {/* 3. 목표 진행률 및 Progress Bar */}
          <GoalProgress
            steps={todayData?.steps || 0}
            goal={todayData?.goal}
            colorScheme={colorScheme}
          />

          {pendingGoal && (
            <Text style={[styles.pendingGoalText, { color: theme.textSecondary }]}>
              {pendingGoal.effectiveDate}부터 목표 {formatNumber(pendingGoal.steps)}걸음
            </Text>
          )}

          {/* 뷰포트 분리 버퍼 여백 */}
          <View style={styles.foldBuffer} />

          {/* 4. 최근 7일 가로 카드 UI (스크롤 시 노출) */}
          <WeeklyActivity
            weeklyData={weeklyData}
            colorScheme={colorScheme}
          />

          <OwnedAchievements
            achievements={achievements}
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
  rewardContainer: {
    borderWidth: 1,
    padding: Spacing.sm,
    borderRadius: 10,
    marginTop: Spacing.sm,
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  pendingGoalText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
  foldBuffer: {
    height: Spacing.lg,
  },
});
