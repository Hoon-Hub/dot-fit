import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import AchievementCard from './AchievementCard';
import { Colors, Spacing } from '../constants/theme';

const HOME_ACHIEVEMENT_LIMIT = 10;

export default function OwnedAchievements({ achievements = [], colorScheme = 'light' }) {
  const router = useRouter();
  const theme = Colors[colorScheme] || Colors.light;
  const ownedAchievements = achievements
    .filter((achievement) => achievement.unlocked)
    .slice(0, HOME_ACHIEVEMENT_LIMIT);
  const openAchievements = () => router.push('/achievements');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>보유 업적</Text>
        <TouchableOpacity
          onPress={openAchievements}
          accessibilityRole="button"
          accessibilityLabel="전체 업적 보기"
          hitSlop={8}
        >
          <Text style={[styles.moreText, { color: theme.textSecondary }]}>전체 보기 ›</Text>
        </TouchableOpacity>
      </View>

      {ownedAchievements.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {ownedAchievements.map((achievement) => (
            <TouchableOpacity
              key={achievement.id}
              onPress={openAchievements}
              accessibilityRole="button"
              activeOpacity={0.75}
            >
              <AchievementCard achievement={achievement} colorScheme={colorScheme} compact />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <TouchableOpacity
          style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={openAchievements}
          accessibilityRole="button"
          accessibilityLabel="전체 업적 보기"
          activeOpacity={0.75}
        >
          <Text style={[styles.emptyTitle, { color: theme.text }]}>아직 보유한 업적이 없어요</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>걷기 목표를 달성하고 첫 업적을 획득해 보세요.</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  moreText: { fontSize: 13, fontWeight: '600' },
  scrollContent: { gap: Spacing.sm, paddingRight: Spacing.md },
  emptyCard: { borderWidth: 1, borderRadius: 16, padding: Spacing.md },
  emptyTitle: { fontSize: 14, fontWeight: '700' },
  emptyText: { fontSize: 13, lineHeight: 18, marginTop: Spacing.xs },
});
