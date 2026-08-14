import { getStepGoalOption } from '../constants/activity';
import {
  addLocalDays,
  getTodayDateString,
  parseLocalDateKey,
} from '../utils/dateUtils';
import {
  getStoredStepGoal,
  saveStoredStepGoal,
} from './storageService';

let goalChangeQueue = Promise.resolve();

function isValidDateKey(value) {
  return Boolean(parseLocalDateKey(value));
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  const entriesByDate = new Map();
  history.forEach((entry) => {
    if (getStepGoalOption(entry?.goalSteps) && isValidDateKey(entry?.effectiveFrom)) {
      entriesByDate.set(entry.effectiveFrom, {
        goalSteps: entry.goalSteps,
        effectiveFrom: entry.effectiveFrom,
      });
    }
  });

  return [...entriesByDate.values()].sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom),
  );
}

function normalizeGoalState(storedState) {
  if (!storedState || !getStepGoalOption(storedState.activeGoalSteps)) {
    return null;
  }

  const history = normalizeHistory(storedState.history);
  const rewardsEnabledDate = isValidDateKey(storedState.rewardsEnabledDate)
    ? storedState.rewardsEnabledDate
    : history[0]?.effectiveFrom;

  if (!rewardsEnabledDate) return null;

  if (!history.some((entry) => entry.effectiveFrom === rewardsEnabledDate)) {
    history.push({
      goalSteps: storedState.activeGoalSteps,
      effectiveFrom: rewardsEnabledDate,
    });
    history.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  }

  const hasPendingGoal =
    getStepGoalOption(storedState.pendingGoalSteps) &&
    isValidDateKey(storedState.pendingEffectiveDate);

  return {
    activeGoalSteps: storedState.activeGoalSteps,
    pendingGoalSteps: hasPendingGoal ? storedState.pendingGoalSteps : null,
    pendingEffectiveDate: hasPendingGoal ? storedState.pendingEffectiveDate : null,
    lastGoalChangedDate: isValidDateKey(storedState.lastGoalChangedDate)
      ? storedState.lastGoalChangedDate
      : null,
    rewardsEnabledDate,
    history,
  };
}

async function persistGoalState(goalState) {
  if (!(await saveStoredStepGoal(goalState))) {
    throw new Error('Failed to save step goal.');
  }
  return goalState;
}

export async function createInitialGoal(goalSteps, referenceDate = new Date()) {
  if (!getStepGoalOption(goalSteps)) {
    throw new Error('지원하지 않는 목표 걸음 수입니다.');
  }

  const dateKey = getTodayDateString(referenceDate);
  return persistGoalState({
    activeGoalSteps: goalSteps,
    pendingGoalSteps: null,
    pendingEffectiveDate: null,
    lastGoalChangedDate: null,
    rewardsEnabledDate: dateKey,
    history: [{ goalSteps, effectiveFrom: dateKey }],
  });
}

export async function getGoalState(referenceDate = new Date()) {
  const storedState = await getStoredStepGoal();
  const goalState = normalizeGoalState(storedState);
  if (!goalState) return null;

  const todayDateKey = getTodayDateString(referenceDate);
  if (
    goalState.pendingGoalSteps &&
    goalState.pendingEffectiveDate <= todayDateKey
  ) {
    goalState.activeGoalSteps = goalState.pendingGoalSteps;
    goalState.pendingGoalSteps = null;
    goalState.pendingEffectiveDate = null;
    await persistGoalState(goalState);
  }

  return goalState;
}

export function getGoalForDate(goalState, dateKey) {
  if (!goalState || !isValidDateKey(dateKey)) return null;
  if (dateKey < goalState.rewardsEnabledDate) return null;

  return [...goalState.history]
    .reverse()
    .find((entry) => entry.effectiveFrom <= dateKey)?.goalSteps ?? null;
}

async function scheduleGoalChangeInternal(goalSteps, referenceDate) {
  if (!getStepGoalOption(goalSteps)) {
    throw new Error('지원하지 않는 목표 걸음 수입니다.');
  }

  const goalState = await getGoalState(referenceDate);
  if (!goalState) throw new Error('설정된 목표가 없습니다.');

  const todayDateKey = getTodayDateString(referenceDate);
  if (goalState.lastGoalChangedDate === todayDateKey) {
    throw new Error('목표 걸음 수는 하루에 한 번만 변경할 수 있습니다.');
  }
  if (goalSteps === goalState.activeGoalSteps) {
    throw new Error('현재 목표와 다른 값을 선택해 주세요.');
  }

  const effectiveDate = addLocalDays(todayDateKey, 1);
  goalState.pendingGoalSteps = goalSteps;
  goalState.pendingEffectiveDate = effectiveDate;
  goalState.lastGoalChangedDate = todayDateKey;
  goalState.history = [
    ...goalState.history.filter((entry) => entry.effectiveFrom !== effectiveDate),
    { goalSteps, effectiveFrom: effectiveDate },
  ].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));

  return persistGoalState(goalState);
}

export function scheduleGoalChange(goalSteps, referenceDate = new Date()) {
  const change = goalChangeQueue.then(() =>
    scheduleGoalChangeInternal(goalSteps, referenceDate),
  );
  goalChangeQueue = change.catch(() => {});
  return change;
}
