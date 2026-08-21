import { ACTIVITY_DATA_SOURCE } from '../constants/activity.js';

function getSteps(stepsByDate, date) {
  const steps = stepsByDate.get(date);
  return Number.isFinite(steps) && steps >= 0 ? steps : undefined;
}

export function selectDailyStepsBySource({
  dateKeys,
  trackingStartedAt,
  aggregateStepsByDate,
  deviceStepsByDate,
  deviceSourceIdentified,
  deviceQueryFailed = false,
}) {
  if (!Array.isArray(dateKeys) || !(aggregateStepsByDate instanceof Map)) {
    throw new Error('Successful aggregate step data is required.');
  }

  const useAggregateFallback =
    !deviceSourceIdentified || deviceQueryFailed;

  if (useAggregateFallback) {
    return {
      dataSource: ACTIVITY_DATA_SOURCE.AGGREGATE_FALLBACK,
      usedHistoricalAggregate: false,
      items: dateKeys.map((date) => ({
        date,
        steps: getSteps(aggregateStepsByDate, date) ?? 0,
      })),
    };
  }

  if (!(deviceStepsByDate instanceof Map)) {
    throw new Error('Successful device step data is required.');
  }

  let usedHistoricalAggregate = false;
  const items = dateKeys.map((date) => {
    const deviceSteps = getSteps(deviceStepsByDate, date);
    if (deviceSteps !== undefined) return { date, steps: deviceSteps };

    if (date < trackingStartedAt) {
      const aggregateSteps = getSteps(aggregateStepsByDate, date);
      if (aggregateSteps !== undefined) {
        usedHistoricalAggregate = true;
        return { date, steps: aggregateSteps };
      }
    }

    return { date, steps: 0 };
  });

  return {
    dataSource: ACTIVITY_DATA_SOURCE.DEVICE,
    usedHistoricalAggregate,
    items,
  };
}
