export const STEP_GOAL_OPTIONS = [
  {
    steps: 6000,
    rewardCoins: 10,
    label: '가볍게',
  },
  {
    steps: 8000,
    rewardCoins: 15,
    label: '균형 있게',
    recommended: true,
  },
  {
    steps: 10000,
    rewardCoins: 20,
    label: '도전',
  },
];

export const ACTIVITY_DATA_STATUS = {
  READY: 'READY',
  COLLECTING: 'COLLECTING',
};

export const ACTIVITY_DATA_SOURCE = {
  DEVICE: 'DEVICE',
  AGGREGATE_FALLBACK: 'AGGREGATE_FALLBACK',
};

export const ACTIVITY_STATE = {
  DROWSY: 'DROWSY',
  SPRY: 'SPRY',
  ENERGETIC: 'ENERGETIC',
  VIGOROUS: 'VIGOROUS',
};

export const ACTIVITY_STATE_LABELS = {
  [ACTIVITY_STATE.DROWSY]: '나른한',
  [ACTIVITY_STATE.SPRY]: '보통',
  [ACTIVITY_STATE.ENERGETIC]: '활기찬',
  [ACTIVITY_STATE.VIGOROUS]: '왕성한',
};

export const ACTIVITY_STATE_THRESHOLDS = [4000, 6000, 10000];
export const ACTIVITY_STATE_HYSTERESIS_STEPS = 300;

export function isActivityState(value) {
  return Object.values(ACTIVITY_STATE).includes(value);
}

export function getStepGoalOption(goalSteps) {
  return STEP_GOAL_OPTIONS.find((option) => option.steps === goalSteps) ?? null;
}
