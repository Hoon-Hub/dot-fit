import {
  aggregateGroupByPeriod,
  aggregateRecord,
  getGrantedPermissions,
  initialize,
  requestPermission,
} from 'react-native-health-connect';
import {
  getDateKeyFromHealthConnectBucket,
  addLocalDays,
  getDateKeysBetween,
  getLocalDateKey,
  parseLocalDateKey,
  getRecentDateKeys,
  getStartOfLocalDay,
  getTodayDateString,
} from '../utils/dateUtils';
import {
  ACTIVITY_AVERAGE_MAX_DAYS,
  calculateActivityAverage,
} from './activityAverage';
import { selectDailyStepsBySource } from './activityDataSource';
import { buildActivityStateCacheFields } from './activityStateEngine';
import {
  ensureActivityTrackingStartedAt,
  getActivityAverageCache,
  getWeeklyActivityCache,
  saveActivityAverageCache,
  saveWeeklyActivityCache,
} from './storageService';

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

async function rememberTrackingStart(referenceDate) {
  try {
    await ensureActivityTrackingStartedAt(getLocalDateKey(referenceDate));
  } catch (err) {
    console.error('Failed to record activity tracking start date:', err);
  }
}

export async function hasStepPermission(referenceDate = new Date()) {
  try {
    if (!isInitialized && !(await initializeHealthConnect())) return false;

    const grantedPermissions = await getGrantedPermissions();
    const hasPermission = grantedPermissions.some(
      (permission) =>
        permission.accessType === 'read' && permission.recordType === 'Steps',
    );
    if (hasPermission) await rememberTrackingStart(referenceDate);
    return hasPermission;
  } catch (err) {
    console.error('Failed to check READ_STEPS permission:', err);
    return false;
  }
}

export async function requestStepPermission(referenceDate = new Date()) {
  try {
    if (!isInitialized && !(await initializeHealthConnect())) return false;

    const grantedPermissions = await requestPermission([
      { accessType: 'read', recordType: 'Steps' },
    ]);

    const hasPermission = grantedPermissions.some(
      (permission) =>
        permission.accessType === 'read' && permission.recordType === 'Steps',
    );
    if (hasPermission) await rememberTrackingStart(referenceDate);
    return hasPermission;
  } catch (err) {
    console.error('Failed to request READ_STEPS permission:', err);
    return false;
  }
}

function createTodayActivity(steps, date = getTodayDateString()) {
  return {
    date,
    steps,
  };
}

function getPhoneOrigins(availableOrigins) {
  return availableOrigins.filter(
    (origin) =>
      origin === 'android' || origin.startsWith('com.android.healthconnect.phone.'),
  );
}

async function ensureStepReadAccess(referenceDate = new Date()) {
  if (!isInitialized && !(await initializeHealthConnect())) {
    throw new Error('Health Connect initialization failed.');
  }

  if (!(await hasStepPermission(referenceDate))) {
    throw new Error('Health Connect step permission is not granted.');
  }

  return ensureActivityTrackingStartedAt(getLocalDateKey(referenceDate));
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

  const result = await aggregateRecord({
    recordType: 'Steps',
    timeRangeFilter,
    dataOriginFilter: phoneOrigins,
  });

  return result?.COUNT_TOTAL ?? null;
}

export async function getTodaySteps(referenceDate = new Date()) {
  await ensureStepReadAccess(referenceDate);

  const tomorrowDateKey = addLocalDays(getLocalDateKey(referenceDate), 1);
  const timeRangeFilter = {
    operator: 'between',
    startTime: getStartOfLocalDay(referenceDate).toISOString(),
    endTime: parseLocalDateKey(tomorrowDateKey).toISOString(),
  };
  const aggregateResult = await getTodayAggregateSteps(timeRangeFilter);
  let phoneSteps = null;
  try {
    phoneSteps = await getTodayPhoneSteps(
      timeRangeFilter,
      aggregateResult.dataOrigins,
    );
  } catch (err) {
    console.error('Failed to get phone steps; using aggregate fallback:', err);
  }

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

async function queryDailyStepsBetween(
  startDateKey,
  endDateKey,
  trackingStartedAt,
) {
  const dateKeys = getDateKeysBetween(startDateKey, endDateKey);
  const startDate = parseLocalDateKey(startDateKey);
  const dayAfterEnd = addLocalDays(endDateKey, 1);
  const endDate = parseLocalDateKey(dayAfterEnd);

  if (dateKeys.length === 0 || !startDate || !endDate) {
    throw new Error('Invalid local date range.');
  }

  const timeRangeFilter = {
    operator: 'between',
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
  };
  const aggregateGroups = await getGroupedSteps(timeRangeFilter);
  const aggregateStepsByDate = mapGroupedSteps(aggregateGroups);
  const phoneOrigins = getPhoneOrigins(getOriginsFromGroups(aggregateGroups));
  if (phoneOrigins.length === 0) {
    return selectDailyStepsBySource({
      dateKeys,
      trackingStartedAt,
      aggregateStepsByDate,
      deviceStepsByDate: null,
      deviceSourceIdentified: false,
    });
  }

  let phoneGroups;
  try {
    phoneGroups = await getGroupedSteps(timeRangeFilter, phoneOrigins);
  } catch (err) {
    console.error(
      'Failed to get daily phone steps; using aggregate fallback:',
      err,
    );
    return selectDailyStepsBySource({
      dateKeys,
      trackingStartedAt,
      aggregateStepsByDate,
      deviceStepsByDate: null,
      deviceSourceIdentified: true,
      deviceQueryFailed: true,
    });
  }

  return selectDailyStepsBySource({
    dateKeys,
    trackingStartedAt,
    aggregateStepsByDate,
    deviceStepsByDate: mapGroupedSteps(phoneGroups),
    deviceSourceIdentified: true,
  });
}

export async function getDailyStepsBetween(
  startDateKey,
  endDateKey,
  referenceDate = new Date(),
) {
  const trackingStartedAt = await ensureStepReadAccess(referenceDate);
  const result = await queryDailyStepsBetween(
    startDateKey,
    endDateKey,
    trackingStartedAt,
  );
  return result.items;
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

export function getCachedActivityAverage() {
  return getActivityAverageCache();
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

      const now = new Date();
      const endDate = getLocalDateKey(now);
      const recentDateKeys = getRecentDateKeys(ACTIVITY_AVERAGE_MAX_DAYS, now);
      const trackingStartedAt = await ensureStepReadAccess(now);
      const previousAverageCache = await getActivityAverageCache({
        throwOnError: true,
      });
      const recentActivityResult = await queryDailyStepsBetween(
        recentDateKeys[0],
        endDate,
        trackingStartedAt,
      );
      const evaluatedAt = new Date().toISOString();
      const averageResult = calculateActivityAverage({
        dailySteps: recentActivityResult.items,
        trackingStartedAt,
        endDate,
        calculatedAt: evaluatedAt,
      });
      const average = {
        ...averageResult,
        dataSource: recentActivityResult.dataSource,
        usedHistoricalAggregate:
          recentActivityResult.usedHistoricalAggregate,
        ...buildActivityStateCacheFields({
          averageResult,
          previousCache: previousAverageCache,
          evaluatedAt,
        }),
      };
      const weekly = recentActivityResult.items.slice(-WEEK_LENGTH);
      const todaySteps = weekly[weekly.length - 1]?.steps ?? 0;
      const activity = {
        today: createTodayActivity(todaySteps, weekly[weekly.length - 1].date),
        weekly,
        average,
      };

      const [weeklySaved, averageSaved] = await Promise.all([
        saveWeeklyActivityCache({
          version: WEEKLY_CACHE_VERSION,
          dateKey: activity.today.date,
          fetchedAt: Date.now(),
          items: weekly,
        }),
        saveActivityAverageCache(average),
      ]);
      if (!weeklySaved || !averageSaved) {
        throw new Error('Failed to cache health activity.');
      }

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
