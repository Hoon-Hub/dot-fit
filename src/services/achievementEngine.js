const REQUIRED_STRING_FIELDS = [
  'id',
  'category',
  'seriesId',
  'visibility',
  'icon',
  'title',
  'description',
];
const SUPPORTED_METRICS = new Set(['goalCompletionCount', 'maxDailySteps']);
const SUPPORTED_REWARD_TYPES = new Set(['coin']);

const OPERATOR_EVALUATORS = {
  gte: (value, target) => value >= target,
};

const CONDITION_EVALUATORS = {
  metricThreshold: (condition, metrics) =>
    OPERATOR_EVALUATORS[condition.operator](metrics[condition.metric], condition.target),
};

function assertValidDefinition(definition, index) {
  const label = definition?.id ? `"${definition.id}"` : `index ${index}`;

  if (!definition || typeof definition !== 'object') {
    throw new Error(`Invalid achievement at ${label}: definition must be an object.`);
  }

  REQUIRED_STRING_FIELDS.forEach((field) => {
    if (typeof definition[field] !== 'string' || !definition[field].trim()) {
      throw new Error(`Invalid achievement ${label}: "${field}" is required.`);
    }
  });

  if (!Number.isFinite(definition.sortOrder)) {
    throw new Error(`Invalid achievement ${label}: "sortOrder" must be a number.`);
  }
  if (!Number.isInteger(definition.tier) || definition.tier <= 0) {
    throw new Error(`Invalid achievement ${label}: "tier" must be a positive integer.`);
  }
  if (typeof definition.enabled !== 'boolean') {
    throw new Error(`Invalid achievement ${label}: "enabled" must be a boolean.`);
  }

  const condition = definition.condition;
  if (!condition || !CONDITION_EVALUATORS[condition.type]) {
    throw new Error(`Invalid achievement ${label}: unsupported condition type.`);
  }
  if (!SUPPORTED_METRICS.has(condition.metric)) {
    throw new Error(`Invalid achievement ${label}: unsupported metric "${condition.metric}".`);
  }
  if (!OPERATOR_EVALUATORS[condition.operator]) {
    throw new Error(`Invalid achievement ${label}: unsupported operator "${condition.operator}".`);
  }
  if (!Number.isFinite(condition.target) || condition.target <= 0) {
    throw new Error(`Invalid achievement ${label}: condition target must be a positive number.`);
  }

  if (!Array.isArray(definition.rewards) || definition.rewards.length === 0) {
    throw new Error(`Invalid achievement ${label}: "rewards" must be a non-empty array.`);
  }
  definition.rewards.forEach((reward) => {
    if (!reward || !SUPPORTED_REWARD_TYPES.has(reward.type)) {
      throw new Error(`Invalid achievement ${label}: unsupported reward type.`);
    }
    if (!Number.isFinite(reward.amount) || reward.amount <= 0) {
      throw new Error(`Invalid achievement ${label}: coin reward must be a positive number.`);
    }
  });
}

export function validateAchievementDefinitions(definitions) {
  if (!Array.isArray(definitions)) {
    throw new Error('Achievement definitions must be an array.');
  }

  const ids = new Set();
  definitions.forEach((definition, index) => {
    assertValidDefinition(definition, index);
    if (ids.has(definition.id)) {
      throw new Error(`Duplicate achievement id: "${definition.id}".`);
    }
    ids.add(definition.id);
  });

  return true;
}

export function buildAchievementMetrics(transactions = []) {
  return transactions.reduce(
    (metrics, transaction) => {
      if (transaction?.type !== 'DAILY_STEP_GOAL') return metrics;

      metrics.goalCompletionCount += 1;
      metrics.maxDailySteps = Math.max(
        metrics.maxDailySteps,
        transaction.achievedSteps,
      );
      return metrics;
    },
    { goalCompletionCount: 0, maxDailySteps: 0 },
  );
}

function getCoinReward(definition) {
  return definition.rewards.find((reward) => reward.type === 'coin') ?? null;
}

function getStatusRank(achievement) {
  if (achievement.unlocked && !achievement.rewardClaimed) return 0;
  if (achievement.unlocked) return 1;
  return 2;
}

export function sortAchievements(achievements) {
  return [...achievements].sort((first, second) => {
    const statusDifference = getStatusRank(first) - getStatusRank(second);
    if (statusDifference !== 0) return statusDifference;

    const orderDifference = first.sortOrder - second.sortOrder;
    return orderDifference || first.id.localeCompare(second.id);
  });
}

export function evaluateAchievements(definitions, wallet) {
  const transactions = wallet?.transactions ?? [];
  const metrics = buildAchievementMetrics(transactions);
  const claimedSourceIds = new Set(
    transactions
      .filter((transaction) => transaction?.type === 'achievement_reward')
      .map((transaction) => transaction.sourceId),
  );

  const achievements = definitions
    .filter((definition) => definition.enabled)
    .map((definition) => {
      const currentValue = metrics[definition.condition.metric];
      const unlocked = CONDITION_EVALUATORS[definition.condition.type](
        definition.condition,
        metrics,
      );
      const reward = getCoinReward(definition);
      const rewardClaimed = claimedSourceIds.has(`achievement:${definition.id}`);

      return {
        ...definition,
        unlocked,
        progress: Math.min(currentValue, definition.condition.target),
        target: definition.condition.target,
        reward,
        rewardClaimed,
      };
    });

  return sortAchievements(achievements);
}
