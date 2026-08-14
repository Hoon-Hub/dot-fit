import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { isCharacterType } from '../constants/profile';

/**
 * Storage Service
 * AsyncStorage 기반 예외 방어 및 데이터 영속성 관리 인터페이스
 */

export async function getOnboardingVersion() {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_VERSION);
    if (!val) return 0;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
  } catch (err) {
    console.error('Failed to get onboarding version:', err);
    return 0;
  }
}

export async function setOnboardingVersion(version = 1) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_VERSION, String(version));
    return true;
  } catch (err) {
    console.error('Failed to set onboarding version:', err);
    return false;
  }
}

export async function getIntroSeen() {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.INTRO_SEEN);
    return val === 'true';
  } catch (err) {
    console.error('Failed to get intro seen state:', err);
    return false;
  }
}

export async function setIntroSeen(seen = true) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.INTRO_SEEN, String(seen));
    return true;
  } catch (err) {
    console.error('Failed to set intro seen state:', err);
    return false;
  }
}

export async function getCharacter() {
  try {
    const jsonStr = await AsyncStorage.getItem(STORAGE_KEYS.CHARACTER);
    if (!jsonStr) return null;
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === 'object' && parsed.name) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.error('Failed to get character from storage:', err);
    return null;
  }
}

export async function saveCharacter(characterObj) {
  try {
    if (!characterObj || typeof characterObj !== 'object') return false;
    await AsyncStorage.setItem(STORAGE_KEYS.CHARACTER, JSON.stringify(characterObj));
    return true;
  } catch (err) {
    console.error('Failed to save character:', err);
    return false;
  }
}

export async function getCharacterType() {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.CHARACTER_TYPE);
    return isCharacterType(value) ? value : null;
  } catch (err) {
    console.error('Failed to get character type from storage:', err);
    return null;
  }
}

export async function saveCharacterType(characterType) {
  if (!isCharacterType(characterType)) return false;

  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CHARACTER_TYPE, characterType);
    return true;
  } catch (err) {
    console.error('Failed to save character type:', err);
    return false;
  }
}

export async function getStoredStepGoal() {
  try {
    const jsonStr = await AsyncStorage.getItem(STORAGE_KEYS.STEP_GOAL);
    return jsonStr ? JSON.parse(jsonStr) : null;
  } catch (err) {
    console.error('Failed to get step goal from storage:', err);
    return null;
  }
}

export async function saveStoredStepGoal(goalState) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.STEP_GOAL, JSON.stringify(goalState));
    return true;
  } catch (err) {
    console.error('Failed to save step goal:', err);
    return false;
  }
}

export async function getStoredCoinWallet() {
  try {
    const jsonStr = await AsyncStorage.getItem(STORAGE_KEYS.COIN_WALLET);
    return jsonStr ? JSON.parse(jsonStr) : null;
  } catch (err) {
    console.error('Failed to get coin wallet from storage:', err);
    return null;
  }
}

export async function saveStoredCoinWallet(wallet) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.COIN_WALLET, JSON.stringify(wallet));
    return true;
  } catch (err) {
    console.error('Failed to save coin wallet:', err);
    return false;
  }
}

export async function getWeeklyActivityCache() {
  try {
    const jsonStr = await AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_ACTIVITY_CACHE);
    if (!jsonStr) return null;

    const cache = JSON.parse(jsonStr);
    if (
      !cache ||
      cache.version !== 1 ||
      typeof cache.dateKey !== 'string' ||
      !Array.isArray(cache.items)
    ) {
      return null;
    }

    return cache;
  } catch (err) {
    console.error('Failed to get weekly activity cache:', err);
    return null;
  }
}

export async function saveWeeklyActivityCache(cache) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.WEEKLY_ACTIVITY_CACHE,
      JSON.stringify(cache),
    );
    return true;
  } catch (err) {
    console.error('Failed to save weekly activity cache:', err);
    return false;
  }
}
