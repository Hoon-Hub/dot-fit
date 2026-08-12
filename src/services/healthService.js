import { getTodayDateString } from '../utils/dateUtils';

/**
 * Health Service Abstraction Layer
 * 
 * 현재는 Mock 데이터를 제공하며, 향후 Android Health Connect API
 * 연동 시 이 파일의 내부 구현만 교체할 수 있도록 설계되었습니다.
 */

const createInitialMockData = () => {
  const todayDateStr = getTodayDateString();
  const [year, month, day] = todayDateStr.split('-').map(Number);
  const baseDate = new Date(year, month - 1, day);

  const mockWeeklySteps = [7210, 9430, 5810, 10230, 6940, 8900, 8421];
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
    steps: 8421,
    goal: 10000,
    distance: 5.8,
    calories: 340,
    goalCompleted: false,
  };

  return { todayActivity, weeklyData };
};

let mockState = createInitialMockData();

/**
 * 오늘 자 활동 데이터를 조회합니다.
 * @returns {Promise<{date: string, steps: number, goal: number, distance: number|null, calories: number|null, goalCompleted: boolean}>}
 */
export async function getTodayActivity() {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return { ...mockState.todayActivity };
}

/**
 * 최근 7일간의 걸음수 데이터 목록을 조회합니다.
 * @returns {Promise<Array<{date: string, steps: number}>>}
 */
export async function getWeeklyActivity() {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return [...mockState.weeklyData];
}

/**
 * 걸음수 데이터를 동기화/새로고침합니다.
 * @returns {Promise<{today: Object, weekly: Array}>}
 */
export async function refreshActivity() {
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  const stepIncrement = Math.floor(Math.random() * 500) + 300;
  const newSteps = mockState.todayActivity.steps + stepIncrement;
  const goal = mockState.todayActivity.goal;

  mockState.todayActivity = {
    ...mockState.todayActivity,
    steps: newSteps,
    distance: parseFloat((newSteps * 0.0007).toFixed(1)),
    calories: Math.round(newSteps * 0.04),
    goalCompleted: newSteps >= goal,
  };

  const lastIndex = mockState.weeklyData.length - 1;
  if (lastIndex >= 0) {
    mockState.weeklyData[lastIndex] = {
      ...mockState.weeklyData[lastIndex],
      steps: newSteps,
    };
  }

  return {
    today: { ...mockState.todayActivity },
    weekly: [...mockState.weeklyData],
  };
}
