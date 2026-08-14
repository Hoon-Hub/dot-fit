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

let rewardEvaluationQueue = Promise.resolve();

function createEmptyWallet() {
  return {
    balance: 0,
    transactions: [],
    lastEvaluatedDate: null,
  };
}

function normalizeWallet(storedWallet) {
  if (!storedWallet || typeof storedWallet !== 'object') return createEmptyWallet();

  const transactionIds = new Set();
  const transactions = Array.isArray(storedWallet.transactions)
    ? storedWallet.transactions.filter((transaction) => {
        const isValid =
          typeof transaction?.id === 'string' &&
          transaction.type === TRANSACTION_TYPE &&
          typeof transaction.date === 'string' &&
          getStepGoalOption(transaction.goalSteps) &&
          Number.isFinite(transaction.achievedSteps) &&
          Number.isFinite(transaction.coins) &&
          typeof transaction.awardedAt === 'string' &&
          !transactionIds.has(transaction.id);

        if (isValid) transactionIds.add(transaction.id);
        return isValid;
      })
    : [];

  return {
    balance: transactions.reduce((total, transaction) => total + transaction.coins, 0),
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
  const evaluation = rewardEvaluationQueue.then(() =>
    evaluateRewards(activityItems, referenceDate),
  );
  rewardEvaluationQueue = evaluation.catch(() => {});
  return evaluation;
}
