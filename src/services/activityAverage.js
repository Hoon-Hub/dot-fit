import { ACTIVITY_DATA_STATUS } from '../constants/activity.js';
import {
  getDateKeysBetween,
  getRecentDateKeys,
  parseLocalDateKey,
} from '../utils/dateUtils.js';

export const ACTIVITY_AVERAGE_MAX_DAYS = 30;

function isValidStepItem(item) {
  return (
    Boolean(parseLocalDateKey(item?.date)) &&
    Number.isFinite(item?.steps) &&
    item.steps >= 0
  );
}

function clampTrackingStartDate(trackingStartedAt, windowStartDate, endDate) {
  if (!parseLocalDateKey(trackingStartedAt)) return endDate;
  if (trackingStartedAt < windowStartDate) return windowStartDate;
  if (trackingStartedAt > endDate) return endDate;
  return trackingStartedAt;
}

export function getEffectiveCalculationStartDate({
  trackingStartedAt,
  oldestRecordDate,
  endDate,
}) {
  if (!parseLocalDateKey(endDate)) {
    throw new Error('Invalid activity average end date.');
  }

  const windowStartDate = getRecentDateKeys(
    ACTIVITY_AVERAGE_MAX_DAYS,
    parseLocalDateKey(endDate),
  )[0];
  const trackingStartDate = clampTrackingStartDate(
    trackingStartedAt,
    windowStartDate,
    endDate,
  );
  const validOldestRecordDate =
    parseLocalDateKey(oldestRecordDate) && oldestRecordDate <= endDate
      ? oldestRecordDate
      : null;
  const earliestKnownDate = validOldestRecordDate
    ? [trackingStartDate, validOldestRecordDate].sort()[0]
    : trackingStartDate;

  return earliestKnownDate < windowStartDate
    ? windowStartDate
    : earliestKnownDate;
}

export function calculateActivityAverage({
  dailySteps = [],
  trackingStartedAt,
  endDate,
  calculatedAt = new Date().toISOString(),
}) {
  const validItems = dailySteps.filter(isValidStepItem);
  const stepsByDate = new Map(validItems.map((item) => [item.date, item.steps]));
  const oldestRecordDate = validItems
    .filter((item) => item.steps > 0 && item.date <= endDate)
    .map((item) => item.date)
    .sort()[0] ?? null;
  const startDate = getEffectiveCalculationStartDate({
    trackingStartedAt,
    oldestRecordDate,
    endDate,
  });
  const dateKeys = getDateKeysBetween(startDate, endDate);
  const items = dateKeys.map((date) => ({
    date,
    steps: stepsByDate.get(date) ?? 0,
  }));
  const totalSteps = items.reduce((total, item) => total + item.steps, 0);
  const hasStepRecord = items.some((item) => item.steps > 0);

  return {
    version: 1,
    startDate,
    endDate,
    dayCount: items.length,
    totalSteps,
    averageSteps: hasStepRecord ? totalSteps / items.length : null,
    status: hasStepRecord
      ? ACTIVITY_DATA_STATUS.READY
      : ACTIVITY_DATA_STATUS.COLLECTING,
    calculatedAt,
    items,
  };
}
