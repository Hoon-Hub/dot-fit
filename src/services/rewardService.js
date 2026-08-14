import { getStepGoalOption } from '../constants/activity';
import {
  addLocalDays,
  getDateKeysBetween,
  getTodayDateString,
  parseLocalDateKey,
} from '../utils/dateUtils';
import { getDailyStepsBetween } from './healthService';
import { getGoalForDate, getGoalState } from './goalService';
import {
  getStoredCoinWallet,
  saveStoredCoinWallet,
} from './storageService';

const TRANSACTION_TYPE = 'DAILY_STEP_GOAL';
const TRANSACTION_ID_PREFIX = 'daily-step-goal:';
const ACHIEVEMENT_REWARD_TYPE = 'achievement_reward';
const ACHIEVEMENT_SOURCE_PREFIX = 'achievement:';

let walletMutationQueue = Promise.resolve();

function createEmptyWallet() {
  return {
    balance: 0,
    transactions: [],
    lastEvaluatedDate: null,
  };
}

function normalizeWallet(storedWallet) {
  if (!storedWallet || typeof storedWallet !== 'object') return createEmptyWallet();

  const transactionKeys = new Set();
  const transactions = Array.isArray(storedWallet.transactions)
    ? storedWallet.transactions.filter((transaction) => {
        const isDailyReward =
          typeof transaction?.id === 'string' &&
          transaction.type === TRANSACTION_TYPE &&
          typeof transaction.date === 'string' &&
          getStepGoalOption(transaction.goalSteps) &&
          Number.isFinite(transaction.achievedSteps) &&
          Number.isFinite(transaction.coins) &&
          typeof transaction.awardedAt === 'string';
        const isAchievementReward =
          transaction?.type === ACHIEVEMENT_REWARD_TYPE &&
          typeof transaction.sourceId === 'string' &&
          transaction.sourceId === `${ACHIEVEMENT_SOURCE_PREFIX}${transaction.achievementId}` &&
          typeof transaction.achievementId === 'string' &&
          Number.isFinite(transaction.amount) &&
          transaction.amount > 0 &&
          typeof transaction.createdAt === 'string';
        const transactionKey = isDailyReward
          ? transaction.id
          : isAchievementReward
            ? transaction.sourceId
            : null;
        const isValid = Boolean(transactionKey) && !transactionKeys.has(transactionKey);

        if (isValid) transactionKeys.add(transactionKey);
        return isValid;
      })
    : [];

  return {
    balance: transactions.reduce(
      (total, transaction) => total + (transaction.coins ?? transaction.amount),
      0,
    ),
    transactions,
    lastEvaluatedDate:
      parseLocalDateKey(storedWallet.lastEvaluatedDate)
        ? storedWallet.lastEvaluatedDate
        : null,
  };
}

export async function getCoinWallet() {
  return normalizeWallet(await getStoredCoinWallet());
}

function getEvaluationStartDate(goalState, wallet, todayDateKey, activityItems) {
  let startDateKey;

  if (!wallet.lastEvaluatedDate) {
    startDateKey = goalState.rewardsEnabledDate;
  } else if (wallet.lastEvaluatedDate >= todayDateKey) {
    startDateKey = todayDateKey;
  } else {
    const nextDate = addLocalDays(wallet.lastEvaluatedDate, 1);
    startDateKey = nextDate > goalState.rewardsEnabledDate
      ? nextDate
      : goalState.rewardsEnabledDate;
  }

  const earliestKnownDate = activityItems
    .map((item) => item?.date)
    .filter((dateKey) => dateKey >= goalState.rewardsEnabledDate && dateKey <= todayDateKey)
    .sort()[0];

  return earliestKnownDate && earliestKnownDate < startDateKey
    ? earliestKnownDate
    : startDateKey;
}

async function evaluateRewards(activityItems, referenceDate) {
  const goalState = await getGoalState(referenceDate);
  const wallet = await getCoinWallet();
  if (!goalState) return { wallet, awardedTransactions: [] };

  const todayDateKey = getTodayDateString(referenceDate);
  const startDateKey = getEvaluationStartDate(
    goalState,
    wallet,
    todayDateKey,
    activityItems,
  );
  const dateKeys = getDateKeysBetween(startDateKey, todayDateKey);
  const stepsByDate = new Map(
    activityItems
      .filter((item) => dateKeys.includes(item?.date) && Number.isFinite(item?.steps))
      .map((item) => [item.date, item.steps]),
  );
  const missingDateKeys = dateKeys.filter((dateKey) => !stepsByDate.has(dateKey));

  if (missingDateKeys.length > 0) {
    const fetchedItems = await getDailyStepsBetween(
      missingDateKeys[0],
      missingDateKeys[missingDateKeys.length - 1],
      referenceDate,
    );
    fetchedItems.forEach((item) => stepsByDate.set(item.date, item.steps));
  }

  const existingTransactionIds = new Set(
    wallet.transactions.map((transaction) => transaction.id),
  );
  const awardedTransactions = [];

  dateKeys.forEach((dateKey) => {
    const goalSteps = getGoalForDate(goalState, dateKey);
    const goalOption = getStepGoalOption(goalSteps);
    const achievedSteps = stepsByDate.get(dateKey);
    const transactionId = `${TRANSACTION_ID_PREFIX}${dateKey}`;

    if (
      goalOption &&
      Number.isFinite(achievedSteps) &&
      achievedSteps >= goalSteps &&
      !existingTransactionIds.has(transactionId)
    ) {
      const transaction = {
        id: transactionId,
        type: TRANSACTION_TYPE,
        date: dateKey,
        goalSteps,
        achievedSteps,
        coins: goalOption.rewardCoins,
        awardedAt: new Date().toISOString(),
      };
      wallet.transactions.push(transaction);
      wallet.balance += transaction.coins;
      existingTransactionIds.add(transactionId);
      awardedTransactions.push(transaction);
    }
  });

  wallet.lastEvaluatedDate = todayDateKey;
  if (!(await saveStoredCoinWallet(wallet))) {
    throw new Error('Failed to save coin wallet.');
  }

  return { wallet, awardedTransactions };
}

export function evaluateDailyStepRewards(activityItems = [], referenceDate = new Date()) {
  const evaluation = walletMutationQueue.then(() =>
    evaluateRewards(activityItems, referenceDate),
  );
  walletMutationQueue = evaluation.catch(() => {});
  return evaluation;
}

async function awardAchievement({ achievementId, amount }) {
  const wallet = await getCoinWallet();
  const sourceId = `${ACHIEVEMENT_SOURCE_PREFIX}${achievementId}`;
  const existingTransaction = wallet.transactions.find(
    (transaction) => transaction.sourceId === sourceId,
  );

  if (existingTransaction) {
    return { wallet, transaction: existingTransaction, awarded: false };
  }

  const transaction = {
    type: ACHIEVEMENT_REWARD_TYPE,
    sourceId,
    achievementId,
    amount,
    createdAt: new Date().toISOString(),
  };
  wallet.transactions.push(transaction);
  wallet.balance += amount;

  if (!(await saveStoredCoinWallet(wallet))) {
    throw new Error('Failed to save achievement reward.');
  }

  return { wallet, transaction, awarded: true };
}

export function awardAchievementCoins({ achievementId, amount }) {
  if (typeof achievementId !== 'string' || !achievementId) {
    return Promise.reject(new Error('Invalid achievement id.'));
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return Promise.reject(new Error('Invalid achievement reward amount.'));
  }

  const award = walletMutationQueue.then(() =>
    awardAchievement({ achievementId, amount }),
  );
  walletMutationQueue = award.catch(() => {});
  return award;
}
