import {
  ACTIVITY_DATA_STATUS,
  ACTIVITY_STATE,
  ACTIVITY_STATE_HYSTERESIS_STEPS,
  ACTIVITY_STATE_THRESHOLDS,
  isActivityState,
} from '../constants/activity.js';

const ACTIVITY_STATE_ORDER = [
  ACTIVITY_STATE.DROWSY,
  ACTIVITY_STATE.SPRY,
  ACTIVITY_STATE.ENERGETIC,
  ACTIVITY_STATE.VIGOROUS,
];

function getInitialActivityState(averageSteps) {
  const stateIndex = ACTIVITY_STATE_THRESHOLDS.filter(
    (threshold) => averageSteps >= threshold,
  ).length;
  return ACTIVITY_STATE_ORDER[stateIndex];
}

export function determineActivityState(averageSteps, previousState = null) {
  if (!Number.isFinite(averageSteps) || averageSteps < 0) {
    return isActivityState(previousState) ? previousState : null;
  }
  if (!isActivityState(previousState)) {
    return getInitialActivityState(averageSteps);
  }

  const previousStateIndex = ACTIVITY_STATE_ORDER.indexOf(previousState);
  const nextStateIndex = ACTIVITY_STATE_THRESHOLDS.filter(
    (threshold, boundaryIndex) => {
      const wasAboveBoundary = previousStateIndex > boundaryIndex;
      const comparisonThreshold = wasAboveBoundary
        ? threshold - ACTIVITY_STATE_HYSTERESIS_STEPS
        : threshold + ACTIVITY_STATE_HYSTERESIS_STEPS;
      return averageSteps >= comparisonThreshold;
    },
  ).length;

  return ACTIVITY_STATE_ORDER[nextStateIndex];
}

export function evaluateActivityState({
  dataStatus,
  averageSteps,
  previousState = null,
}) {
  const validPreviousState = isActivityState(previousState)
    ? previousState
    : null;

  if (
    dataStatus !== ACTIVITY_DATA_STATUS.READY ||
    !Number.isFinite(averageSteps)
  ) {
    return validPreviousState;
  }

  return determineActivityState(averageSteps, validPreviousState);
}

export function buildActivityStateCacheFields({
  averageResult,
  previousCache,
  evaluatedAt,
}) {
  const previousState = isActivityState(previousCache?.activityState)
    ? previousCache.activityState
    : null;
  const activityState = evaluateActivityState({
    dataStatus: averageResult?.status,
    averageSteps: averageResult?.averageSteps,
    previousState,
  });

  if (
    averageResult?.status !== ACTIVITY_DATA_STATUS.READY ||
    !Number.isFinite(averageResult?.averageSteps)
  ) {
    return {
      activityState: previousState,
      activityStateAverageSteps: previousState
        ? Number.isFinite(previousCache?.activityStateAverageSteps)
          ? previousCache.activityStateAverageSteps
          : null
        : null,
      activityStateEvaluatedAt: previousState
        ? typeof previousCache?.activityStateEvaluatedAt === 'string'
          ? previousCache.activityStateEvaluatedAt
          : null
        : null,
    };
  }

  return {
    activityState,
    activityStateAverageSteps: averageResult.averageSteps,
    activityStateEvaluatedAt: evaluatedAt,
  };
}
