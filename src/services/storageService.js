import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

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
