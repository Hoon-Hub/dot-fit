import { hasStepPermission } from './healthService';
import {
  getCharacter,
  getCharacterType,
  getIntroSeen,
  getOnboardingVersion,
  saveCharacterType,
} from './storageService';
import { getGoalState } from './goalService';

export const CURRENT_ONBOARDING_VERSION = 2;

/**
 * 앱 시작 및 중단 후 재개 시 전체 상태를 확인하여 목적지 라우트를 결정합니다.
 * @returns {Promise<{
 *   targetRoute: string,
 *   hasPermission: boolean,
 *   hasCharacter: boolean,
 *   character: object|null,
 *   characterType: string|null,
 *   onboardingVersion: number,
 *   introSeen: boolean,
 *   hasStepGoal: boolean
 * }>}
 */
export async function checkAppState() {
  try {
    const [character, characterType, onboardingVersion, introSeen, hasPermission, goalState] =
      await Promise.all([
        getCharacter(),
        getCharacterType(),
        getOnboardingVersion(),
        getIntroSeen(),
        hasStepPermission(),
        getGoalState(),
      ]);

    const hasCharacter = Boolean(character && character.name);
    const hasStepGoal = Boolean(goalState);
    const isOnboardingComplete = hasCharacter && hasStepGoal;

    let targetRoute = '/(tabs)';

    if (hasCharacter && !characterType) {
      targetRoute = '/onboarding/character-type';
    } else if (isOnboardingComplete && hasPermission) {
      targetRoute = '/(tabs)';
    } else if (hasCharacter && !hasPermission) {
      targetRoute = '/onboarding/health-connect';
    } else if (hasCharacter && !hasStepGoal) {
      targetRoute = '/onboarding/step-goal';
    } else if (!hasCharacter) {
      if (hasPermission) {
        targetRoute = characterType
          ? '/onboarding/character'
          : '/onboarding/character-type';
      } else if (introSeen) {
        targetRoute = '/onboarding/health-connect';
      } else {
        targetRoute = '/onboarding/intro';
      }
    }

    return {
      targetRoute,
      hasPermission,
      hasCharacter,
      character,
      characterType,
      onboardingVersion,
      introSeen,
      hasStepGoal,
    };
  } catch (err) {
    console.error('Failed to check app state:', err);
    return {
      targetRoute: '/onboarding/intro',
      hasPermission: false,
      hasCharacter: false,
      character: null,
      characterType: null,
      onboardingVersion: 0,
      introSeen: false,
      hasStepGoal: false,
    };
  }
}

export async function completeCharacterTypeSelection(characterType) {
  const saved = await saveCharacterType(characterType);
  if (!saved) {
    throw new Error('Failed to save character type.');
  }

  const state = await checkAppState();
  return state.targetRoute;
}
