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

export function getStepGoalOption(goalSteps) {
  return STEP_GOAL_OPTIONS.find((option) => option.steps === goalSteps) ?? null;
}
