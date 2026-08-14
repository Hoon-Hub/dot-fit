import {
  aggregateGroupByPeriod,
  aggregateRecord,
  getGrantedPermissions,
  initialize,
  requestPermission,
} from 'react-native-health-connect';
import {
  getDateKeyFromHealthConnectBucket,
  getLocalDateKey,
  getRecentDateKeys,
  getStartOfLocalDay,
  getTodayDateString,
} from '../utils/dateUtils';
import {
  getWeeklyActivityCache,
  saveWeeklyActivityCache,
} from './storageService';
import { DAILY_GOAL_STEPS } from '../constants/activity';

const WEEKLY_CACHE_VERSION = 1;
const WEEK_LENGTH = 7;

let isInitialized = false;
let currentTodayActivityPromise = null;
let currentActivityRefreshPromise = null;

export async function initializeHealthConnect() {
  try {
    const result = await initialize();
    isInitialized = Boolean(result);
    return isInitialized;
  } catch (err) {
    console.error('Health Connect initialization failed:', err);
    isInitialized = false;
    return false;
  }
}

export async function hasStepPermission() {
  try {
    if (!isInitialized && !(await initializeHealthConnect())) return false;

    const grantedPermissions = await getGrantedPermissions();
    return grantedPermissions.some(
      (permission) =>
        permission.accessType === 'read' && permission.recordType === 'Steps',
    );
  } catch (err) {
    console.error('Failed to check READ_STEPS permission:', err);
    return false;
  }
}

export async function requestStepPermission() {
  try {
    if (!isInitialized && !(await initializeHealthConnect())) return false;

    const grantedPermissions = await requestPermission([
      { accessType: 'read', recordType: 'Steps' },
    ]);

    return grantedPermissions.some(
      (permission) =>
        permission.accessType === 'read' && permission.recordType === 'Steps',
    );
  } catch (err) {
    console.error('Failed to request READ_STEPS permission:', err);
    return false;
  }
}

function createTodayActivity(steps, date = getTodayDateString()) {
  return {
    date,
    steps,
    goal: DAILY_GOAL_STEPS,
    goalCompleted: steps >= DAILY_GOAL_STEPS,
  };
}

function getPhoneOrigins(availableOrigins) {
  return availableOrigins.filter(
    (origin) =>
      origin === 'android' || origin.startsWith('com.android.healthconnect.phone.'),
  );
}

function createWeeklyTimeRange(now = new Date()) {
  const startOfToday = getStartOfLocalDay(now);
  const startOfRange = new Date(startOfToday);
  startOfRange.setDate(startOfToday.getDate() - (WEEK_LENGTH - 1));

  return {
    operator: 'between',
    // The native module converts these instants to the device's local date-time
    // before applying the period slicer.
    startTime: startOfRange.toISOString(),
    endTime: now.toISOString(),
  };
}

async function ensureStepReadAccess() {
  if (!isInitialized && !(await initializeHealthConnect())) {
    throw new Error('Health Connect initialization failed.');
  }

  if (!(await hasStepPermission())) {
    throw new Error('Health Connect step permission is not granted.');
  }
}

async function getTodayAggregateSteps(timeRangeFilter) {
  const result = await aggregateRecord({
    recordType: 'Steps',
    timeRangeFilter,
  });

  return {
    steps: result?.COUNT_TOTAL ?? null,
    dataOrigins: result?.dataOrigins ?? [],
  };
}

async function getTodayPhoneSteps(timeRangeFilter, availableOrigins) {
  const phoneOrigins = getPhoneOrigins(availableOrigins);
  if (phoneOrigins.length === 0) return null;

  try {
    const result = await aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter,
      dataOriginFilter: phoneOrigins,
    });

    return result?.COUNT_TOTAL ?? null;
  } catch (err) {
    console.error('Failed to get phone steps:', err);
    return null;
  }
}

export async function getTodaySteps(referenceDate = new Date()) {
  await ensureStepReadAccess();

  const timeRangeFilter = {
    operator: 'between',
    startTime: getStartOfLocalDay(referenceDate).toISOString(),
    endTime: referenceDate.toISOString(),
  };
  const aggregateResult = await getTodayAggregateSteps(timeRangeFilter);
  const phoneSteps = await getTodayPhoneSteps(
    timeRangeFilter,
    aggregateResult.dataOrigins,
  );

  if (phoneSteps !== null) return phoneSteps;
  if (aggregateResult.steps !== null) return aggregateResult.steps;
  return 0;
}

async function updateCachedTodaySteps(todayActivity) {
  const cache = await getWeeklyActivityCache();
  if (!cache || cache.dateKey !== todayActivity.date) return;

  const items = cache.items.map((item) =>
    item.date === todayActivity.date
      ? { ...item, steps: todayActivity.steps }
      : item,
  );

  await saveWeeklyActivityCache({
    ...cache,
    fetchedAt: Date.now(),
    items,
  });
}

export function getTodayActivity() {
  if (currentActivityRefreshPromise) {
    return currentActivityRefreshPromise.then((activity) => activity.today);
  }

  if (!currentTodayActivityPromise) {
    currentTodayActivityPromise = (async () => {
      const now = new Date();
      const todayActivity = createTodayActivity(
        await getTodaySteps(now),
        getLocalDateKey(now),
      );
      await updateCachedTodaySteps(todayActivity);
      return todayActivity;
    })().finally(() => {
      currentTodayActivityPromise = null;
    });
  }

  return currentTodayActivityPromise;
}

async function getGroupedSteps(timeRangeFilter, dataOriginFilter) {
  const request = {
    recordType: 'Steps',
    timeRangeFilter,
    timeRangeSlicer: { period: 'DAYS', length: 1 },
  };

  if (dataOriginFilter) request.dataOriginFilter = dataOriginFilter;

  return aggregateGroupByPeriod(request);
}

function mapGroupedSteps(groups) {
  return groups.reduce((stepsByDate, group) => {
    const date = getDateKeyFromHealthConnectBucket(group?.startTime);
    const steps = group?.result?.COUNT_TOTAL;

    if (date && typeof steps === 'number') {
      stepsByDate.set(date, steps);
    }

    return stepsByDate;
  }, new Map());
}

function getOriginsFromGroups(groups) {
  return [
    ...new Set(
      groups.flatMap((group) => group?.result?.dataOrigins ?? []),
    ),
  ];
}

async function fetchWeeklyActivity() {
  await ensureStepReadAccess();

  const now = new Date();
  const dateKeys = getRecentDateKeys(WEEK_LENGTH, now);
  const timeRangeFilter = createWeeklyTimeRange(now);
  const aggregateGroups = await getGroupedSteps(timeRangeFilter);
  const aggregateStepsByDate = mapGroupedSteps(aggregateGroups);
  const phoneOrigins = getPhoneOrigins(getOriginsFromGroups(aggregateGroups));
  let phoneStepsByDate = null;

  if (phoneOrigins.length > 0) {
    try {
      const phoneGroups = await getGroupedSteps(timeRangeFilter, phoneOrigins);
      phoneStepsByDate = mapGroupedSteps(phoneGroups);
    } catch (err) {
      console.error('Failed to get weekly phone steps:', err);
    }
  }

  return dateKeys.map((date) => {
    const phoneSteps = phoneStepsByDate?.get(date);
    const aggregateSteps = aggregateStepsByDate.get(date);

    if (phoneSteps !== undefined) return { date, steps: phoneSteps };
    if (aggregateSteps !== undefined) return { date, steps: aggregateSteps };
    return { date, steps: 0 };
  });
}

function hasValidWeeklyItems(items) {
  const expectedDateKeys = getRecentDateKeys(WEEK_LENGTH);

  return (
    Array.isArray(items) &&
    items.length === WEEK_LENGTH &&
    items.every(
      (item, index) =>
        item?.date === expectedDateKeys[index] && Number.isFinite(item.steps),
    )
  );
}

function isCurrentWeeklyCache(cache) {
  return (
    cache?.dateKey === getTodayDateString() &&
    hasValidWeeklyItems(cache.items)
  );
}

export async function getCachedWeeklyActivity() {
  const cache = await getWeeklyActivityCache();
  return isCurrentWeeklyCache(cache) ? cache.items : null;
}

export async function getWeeklyActivity() {
  const cachedActivity = await getCachedWeeklyActivity();
  if (cachedActivity) return cachedActivity;

  return refreshWeeklyActivity().then((activity) => activity.weekly);
}

function refreshWeeklyActivity() {
  if (!currentActivityRefreshPromise) {
    currentActivityRefreshPromise = (async () => {
      if (currentTodayActivityPromise) await currentTodayActivityPromise;

      const weekly = await fetchWeeklyActivity();
      const todaySteps = weekly[weekly.length - 1]?.steps ?? 0;
      const activity = {
        today: createTodayActivity(todaySteps, weekly[weekly.length - 1].date),
        weekly,
      };

      await saveWeeklyActivityCache({
        version: WEEKLY_CACHE_VERSION,
        dateKey: activity.today.date,
        fetchedAt: Date.now(),
        items: weekly,
      });

      return activity;
    })().finally(() => {
      currentActivityRefreshPromise = null;
    });
  }

  return currentActivityRefreshPromise;
}

export function refreshActivity() {
  return refreshWeeklyActivity();
}
