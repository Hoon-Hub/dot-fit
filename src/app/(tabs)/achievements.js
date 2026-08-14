import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AchievementCard from '../../components/AchievementCard';
import { Colors, MaxContentWidth, Spacing } from '../../constants/theme';
import {
  claimAchievementReward,
  getAchievementsFromWallet,
} from '../../services/achievementService';
import { getCoinWallet } from '../../services/rewardService';
import { formatNumber } from '../../utils/dateUtils';

const FILTERS = [
  { id: 'owned', label: '보유한 업적' },
  { id: 'all', label: '전체 업적' },
];

export default function AchievementsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] || Colors.light;
  const [filter, setFilter] = useState('owned');
  const [achievements, setAchievements] = useState([]);
  const [coinBalance, setCoinBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [message, setMessage] = useState('');
  const claimInFlightRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setLoading(true);
      setMessage('');

      getCoinWallet()
        .then((wallet) => {
          if (!isActive) return;
          setCoinBalance(wallet.balance);
          setAchievements(getAchievementsFromWallet(wallet));
        })
        .catch((err) => {
          console.error('Failed to load achievements:', err);
          if (isActive) setMessage('업적을 불러오지 못했습니다.');
        })
        .finally(() => {
          if (isActive) setLoading(false);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const handleClaim = useCallback(async (achievementId) => {
    if (claimInFlightRef.current) return;

    try {
      claimInFlightRef.current = true;
      setClaimingId(achievementId);
      setMessage('');
      const result = await claimAchievementReward(achievementId);
      setCoinBalance(result.wallet.balance);
      setAchievements(getAchievementsFromWallet(result.wallet));
      setMessage(
        result.awarded
          ? `${result.transaction.amount}코인을 받았어요.`
          : '이미 보상을 받은 업적이에요.',
      );
    } catch (err) {
      console.error('Failed to claim achievement reward:', err);
      setMessage(err.message || '보상 수령에 실패했습니다.');
    } finally {
      claimInFlightRef.current = false;
      setClaimingId(null);
    }
  }, []);

  const visibleAchievements = useMemo(
    () => filter === 'owned'
      ? achievements.filter((achievement) => achievement.unlocked)
      : achievements,
    [achievements, filter],
  );
  const ownedCount = achievements.filter((achievement) => achievement.unlocked).length;

  const renderAchievement = useCallback(({ item }) => (
    <View style={styles.gridItem}>
      <AchievementCard
        achievement={item}
        colorScheme={colorScheme}
        claiming={claimingId === item.id}
        onClaim={handleClaim}
      />
    </View>
  ), [claimingId, colorScheme, handleClaim]);

  const listHeader = (
    <>
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Text style={[styles.screenTitle, { color: theme.text }]}>업적</Text>
          <Text style={[styles.summary, { color: theme.textSecondary }]}>
            전체 {achievements.length}개 중 {ownedCount}개를 보유하고 있어요.
          </Text>
        </View>
        <View style={[styles.coinBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.coinLabel, { color: theme.textSecondary }]}>보유 코인</Text>
          <Text style={[styles.coinValue, { color: theme.text }]}>🪙 {formatNumber(coinBalance)}</Text>
        </View>
      </View>

      <View style={[styles.toggle, { backgroundColor: theme.primaryLight }]}>
        {FILTERS.map((item) => {
          const selected = filter === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.toggleButton, selected && { backgroundColor: theme.card }]}
              onPress={() => setFilter(item.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: selected ? theme.text : theme.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {Boolean(message) && (
        <Text
          style={[
            styles.message,
            { color: theme.text, backgroundColor: theme.todayHighlight, borderColor: theme.border },
          ]}
          accessibilityLiveRegion="polite"
        >
          {message}
        </Text>
      )}
    </>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <FlatList
        data={loading ? [] : visibleAchievements}
        renderItem={renderAchievement}
        keyExtractor={(item) => item.id}
        numColumns={2}
        extraData={claimingId}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.gridRow}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={loading ? (
          <ActivityIndicator style={styles.loading} size="large" color={theme.primary} />
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>아직 보유한 업적이 없어요</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>전체 업적에서 달성 조건을 확인해 보세요.</Text>
          </View>
        )}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  list: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  listContent: { flexGrow: 1, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  titleText: { flex: 1, minWidth: 0 },
  screenTitle: { fontSize: 28, fontWeight: '800' },
  summary: { fontSize: 13, marginTop: Spacing.xs },
  coinBadge: { flexShrink: 0, borderWidth: 1, borderRadius: 12, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  coinLabel: { fontSize: 10, textAlign: 'right' },
  coinValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  toggle: { flexDirection: 'row', borderRadius: 14, padding: Spacing.xs, marginVertical: Spacing.lg },
  toggleButton: { flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 14, fontWeight: '700' },
  message: { borderWidth: 1, borderRadius: 12, padding: Spacing.sm, fontSize: 13, marginBottom: Spacing.sm },
  loading: { marginTop: Spacing.xxl },
  gridRow: { marginHorizontal: -Spacing.xs },
  gridItem: { width: '50%', padding: Spacing.xs },
  emptyCard: { borderWidth: 1, borderRadius: 18, padding: Spacing.lg, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyText: { fontSize: 13, marginTop: Spacing.sm, textAlign: 'center' },
});
