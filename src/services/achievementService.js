import { ACHIEVEMENT_DEFINITIONS } from '../constants/achievements';
import {
  evaluateAchievements,
  validateAchievementDefinitions,
} from './achievementEngine';
import {
  awardAchievementCoins,
  getCoinWallet,
} from './rewardService';

validateAchievementDefinitions(ACHIEVEMENT_DEFINITIONS);

export function getAchievementsFromWallet(wallet) {
  return evaluateAchievements(ACHIEVEMENT_DEFINITIONS, wallet);
}

export async function claimAchievementReward(achievementId) {
  const wallet = await getCoinWallet();
  const achievement = getAchievementsFromWallet(wallet).find(
    (item) => item.id === achievementId,
  );

  if (!achievement) throw new Error('존재하지 않는 업적입니다.');
  if (!achievement.unlocked) throw new Error('아직 달성하지 않은 업적입니다.');
  if (!achievement.reward) throw new Error('수령할 수 있는 코인 보상이 없습니다.');

  return awardAchievementCoins({
    achievementId: achievement.id,
    amount: achievement.reward.amount,
  });
}
