import { hasStepPermission } from './healthService';
import {
  getCharacter,
  getIntroSeen,
  getOnboardingVersion,
} from './storageService';

export const CURRENT_ONBOARDING_VERSION = 1;

/**
 * 앱 시작 및 중단 후 재개 시 전체 상태를 확인하여 목적지 라우트를 결정합니다.
 * @returns {Promise<{
 *   targetRoute: string,
 *   hasPermission: boolean,
 *   hasCharacter: boolean,
 *   character: object|null,
 *   onboardingVersion: number,
 *   introSeen: boolean
 * }>}
 */
export async function checkAppState() {
  try {
    const [character, onboardingVersion, introSeen, hasPermission] =
      await Promise.all([
        getCharacter(),
        getOnboardingVersion(),
        getIntroSeen(),
        hasStepPermission(),
      ]);

    const hasCharacter = Boolean(character && character.name);
    const isOnboardingComplete =
      hasCharacter && onboardingVersion >= CURRENT_ONBOARDING_VERSION;

    let targetRoute = '/(tabs)';

    if (isOnboardingComplete && hasPermission) {
      targetRoute = '/(tabs)';
    } else if (hasCharacter && !hasPermission) {
      targetRoute = '/onboarding/health-connect';
    } else if (!hasCharacter) {
      if (hasPermission) {
        targetRoute = '/onboarding/character';
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
      onboardingVersion,
      introSeen,
    };
  } catch (err) {
    console.error('Failed to check app state:', err);
    return {
      targetRoute: '/onboarding/intro',
      hasPermission: false,
      hasCharacter: false,
      character: null,
      onboardingVersion: 0,
      introSeen: false,
    };
  }
}
