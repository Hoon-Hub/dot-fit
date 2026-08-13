import {
  aggregateRecord,
  getGrantedPermissions,
  initialize,
  requestPermission,
} from 'react-native-health-connect';
import { getTodayDateString } from '../utils/dateUtils';

/**
 * Health Service Layer
 * 
 * Android Health Connect API(react-native-health-connect) 연동으로
 * 실제 걸음수 데이터를 조회합니다.
 */

const createInitialMockData = () => {
  const todayDateStr = getTodayDateString();
  const [year, month, day] = todayDateStr.split('-').map(Number);
  const baseDate = new Date(year, month - 1, day);

  const mockWeeklySteps = [7210, 9430, 5810, 10230, 6940, 8900, 0];
  const weeklyData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    const dYear = d.getFullYear();
    const dMonth = String(d.getMonth() + 1).padStart(2, '0');
    const dDay = String(d.getDate()).padStart(2, '0');
    const dateStr = `${dYear}-${dMonth}-${dDay}`;

    weeklyData.push({
      date: dateStr,
      steps: mockWeeklySteps[6 - i],
    });
  }

  const todayActivity = {
    date: todayDateStr,
    steps: 0,
    goal: 10000,
    distance: null,
    calories: null,
    goalCompleted: false,
  };

  return { todayActivity, weeklyData };
};

let mockState = createInitialMockData();
let isInitialized = false;

/**
 * Health Connect SDK를 초기화합니다.
 * @returns {Promise<boolean>}
 */
export async function initializeHealthConnect() {
  try {
    const result = await initialize();
    isInitialized = Boolean(result);
    console.log('Health Connect initialized:', isInitialized);
    return isInitialized;
  } catch (err) {
    console.error('Health Connect initialization failed:', err);
    isInitialized = false;
    return false;
  }
}

/**
 * READ_STEPS 권한이 허용되어 있는지 확인합니다.
 * @returns {Promise<boolean>}
 */
export async function hasStepPermission() {
  try {
    if (!isInitialized) {
      const initOk = await initializeHealthConnect();
      if (!initOk) return false;
    }
    const grantedPermissions = await getGrantedPermissions();
    const hasPerm = grantedPermissions.some(
      (p) => p.accessType === 'read' && p.recordType === 'Steps'
    );
    console.log('READ_STEPS permission status:', hasPerm);
    return hasPerm;
  } catch (err) {
    console.error('Failed to check READ_STEPS permission:', err);
    return false;
  }
}

/**
 * READ_STEPS 권한을 요청합니다.
 * @returns {Promise<boolean>}
 */
export async function requestStepPermission() {
  try {
    if (!isInitialized) {
      const initOk = await initializeHealthConnect();
      if (!initOk) return false;
    }
    const grantedPermissions = await requestPermission([
      { accessType: 'read', recordType: 'Steps' },
    ]);

    console.log(
      'requestPermission raw result:',
      JSON.stringify(grantedPermissions, null, 2),
    )

    const isGranted = grantedPermissions.some(
      (p) => p.accessType === 'read' && p.recordType === 'Steps'
    );
    console.log('READ_STEPS permission requested result:', isGranted);
    return isGranted;
  } catch (err) {
    console.error('Failed to request READ_STEPS permission:', err);
    return false;
  }
}

/**
 * 전체 통합(Aggregate) 걸음수를 조회합니다.
 * DataOrigin 필터 없이 Health Connect의 activity deduplication / priority가 적용된 값입니다.
 * @param {Object} timeRangeFilter 
 * @returns {Promise<{steps: number | null, dataOrigins: string[]}>}
 */
async function getTodayAggregateSteps(timeRangeFilter) {
  try {
    const result = await aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter,
    });
    
    const steps = result?.COUNT_TOTAL !== undefined ? result.COUNT_TOTAL : null;
    const dataOrigins = result?.dataOrigins || [];
    return { steps, dataOrigins };
  } catch (err) {
    console.error('Failed to get aggregate steps:', err);
    return { steps: null, dataOrigins: [] };
  }
}

/**
 * Android Phone 자체에서 기록한 걸음수만 조회합니다.
 * @param {Object} timeRangeFilter 
 * @param {string[]} availableOrigins 
 * @returns {Promise<number | null>}
 */
async function getTodayPhoneSteps(timeRangeFilter, availableOrigins) {
  if (!availableOrigins || availableOrigins.length === 0) return null;

  // Phone DataOrigin 식별
  const phoneOrigins = availableOrigins.filter(
    (origin) =>
      origin === 'android' || origin.startsWith('com.android.healthconnect.phone.')
  );

  if (phoneOrigins.length === 0) return null;

  try {
    const deviceResult = await aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter,
      dataOriginFilter: phoneOrigins,
    });
    
    return deviceResult?.COUNT_TOTAL !== undefined ? deviceResult.COUNT_TOTAL : null;
  } catch (err) {
    console.error('Failed to get phone steps:', err);
    return null;
  }
}

/**
 * 로컬 시간 기준 오늘 00:00:00부터 현재 시각까지의 실제 걸음수 합계를 조회합니다.
 * 현재 정책: Phone steps 우선, 실패 시 aggregate fallback
 * @returns {Promise<number>}
 */
export async function getTodaySteps() {
  try {
    if (!isInitialized) {
      const initOk = await initializeHealthConnect();
      if (!initOk) return 0;
    }

    const hasPerm = await hasStepPermission();
    if (!hasPerm) {
      console.log('READ_STEPS permission is not granted.');
      return 0;
    }

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0, 0, 0, 0
    );

    const timeRangeFilter = {
      operator: 'between',
      startTime: startOfDay.toISOString(),
      endTime: now.toISOString(),
    };

    // 1. Standard Aggregate 및 Origin 파악
    const aggregateResult = await getTodayAggregateSteps(timeRangeFilter);
    const aggregateSteps = aggregateResult.steps;
    
    // 2. Phone Steps 조회
    const phoneSteps = await getTodayPhoneSteps(timeRangeFilter, aggregateResult.dataOrigins);

    // 3. Selection Policy (Phone-first)
    let selectedSteps = 0;
    let selectedSource = 'none';

    if (phoneSteps !== null) {
      selectedSteps = phoneSteps;
      selectedSource = 'phone';
    } else if (aggregateSteps !== null) {
      selectedSteps = aggregateSteps;
      selectedSource = 'aggregate-fallback';
    } else {
      selectedSteps = 0;
      selectedSource = 'none';
    }

    // 디버깅 로그 출력
    console.log('Health aggregate steps:', aggregateSteps !== null ? aggregateSteps : 'null');
    console.log('Phone steps:', phoneSteps !== null ? phoneSteps : 'null');
    console.log('Selected step source:', selectedSource);
    console.log('Selected today steps:', selectedSteps);

    return selectedSteps;
  } catch (err) {
    console.error('Failed to get today steps:', err);
    return 0;
  }
}

/**
 * 오늘 자 활동 데이터를 조회합니다. (실제 걸음수 반영)
 * @returns {Promise<{date: string, steps: number, goal: number, goalCompleted: boolean}>}
 */
export async function getTodayActivity() {
  const todayDateStr = getTodayDateString();
  const steps = await getTodaySteps();
  const goal = 10000;

  const todayActivity = {
    date: todayDateStr,
    steps: steps,
    goal: goal,
    goalCompleted: steps >= goal,
  };

  const lastIndex = mockState.weeklyData.length - 1;
  if (lastIndex >= 0) {
    mockState.weeklyData[lastIndex] = {
      ...mockState.weeklyData[lastIndex],
      steps: steps,
    };
  }

  mockState.todayActivity = todayActivity;
  return { ...todayActivity };
}

/**
 * 최근 7일간의 걸음수 데이터 목록을 조회합니다. (Mock 데이터 유지)
 * @returns {Promise<Array<{date: string, steps: number}>>}
 */
export async function getWeeklyActivity() {
  return [...mockState.weeklyData];
}

/**
 * 걸음수 데이터를 동기화/새로고침합니다.
 * @returns {Promise<{today: Object, weekly: Array}>}
 */
export async function refreshActivity() {
  const today = await getTodayActivity();

  return {
    today: today,
    weekly: [...mockState.weeklyData],
  };
}

