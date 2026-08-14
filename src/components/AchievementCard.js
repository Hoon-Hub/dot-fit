import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { formatNumber } from '../utils/dateUtils';

function AchievementCard({
  achievement,
  colorScheme = 'light',
  compact = false,
  claiming = false,
  onClaim,
}) {
  const theme = Colors[colorScheme] || Colors.light;
  const progressText = achievement.condition.metric === 'goalCompletionCount'
    ? `${achievement.progress}/${achievement.target}회`
    : `${formatNumber(achievement.progress)}/${formatNumber(achievement.target)}보`;
  const canClaim = achievement.unlocked && achievement.reward && !achievement.rewardClaimed;

  return (
    <View
      style={[
        styles.card,
        compact && styles.compactCard,
        {
          backgroundColor: theme.card,
          borderColor: achievement.unlocked ? theme.progressFill : theme.border,
          opacity: achievement.unlocked ? 1 : 0.62,
        },
      ]}
      accessibilityLabel={`${achievement.title}, ${achievement.unlocked ? '달성' : '미달성'}`}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: achievement.unlocked ? theme.activityAchieved.background : theme.primaryLight },
        ]}
      >
        <Text style={styles.icon}>{achievement.unlocked ? achievement.icon : '🔒'}</Text>
      </View>
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
        {achievement.title}
      </Text>
      {!compact && (
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {achievement.description}
        </Text>
      )}

      {compact ? (
        <Text style={[styles.progress, { color: theme.textSecondary }]}>{progressText}</Text>
      ) : canClaim ? (
        <TouchableOpacity
          style={[
            styles.claimButton,
            { backgroundColor: theme.primary, opacity: claiming ? 0.55 : 1 },
          ]}
          onPress={() => onClaim?.(achievement.id)}
          disabled={claiming}
          accessibilityRole="button"
          accessibilityLabel={`${achievement.reward.amount}코인 받기`}
        >
          {claiming ? (
            <ActivityIndicator size="small" color={theme.textInverse} />
          ) : (
            <Text style={[styles.claimButtonText, { color: theme.textInverse }]}>
              {achievement.reward.amount}코인 받기
            </Text>
          )}
        </TouchableOpacity>
      ) : achievement.rewardClaimed ? (
        <Text style={[styles.rewardStatus, { color: theme.textSecondary }]}>
          보상 수령 완료
        </Text>
      ) : (
        <Text style={[styles.progress, { color: theme.textSecondary }]}>{progressText}</Text>
      )}
    </View>
  );
}

export default React.memo(AchievementCard);

const styles = StyleSheet.create({
  card: {
    minHeight: 208,
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.md,
    alignItems: 'center',
  },
  compactCard: {
    width: 132,
    minHeight: 142,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  icon: { fontSize: 28 },
  title: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  description: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: Spacing.sm },
  progress: { fontSize: 12, fontWeight: '600', marginTop: 'auto', paddingTop: Spacing.sm },
  claimButton: {
    width: '100%',
    minHeight: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingHorizontal: Spacing.xs,
  },
  claimButtonText: { fontSize: 13, fontWeight: '800' },
  rewardStatus: { fontSize: 12, fontWeight: '700', marginTop: 'auto', paddingTop: Spacing.sm },
});
