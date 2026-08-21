import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const moduleCache = new Map();

async function loadSourceModule(moduleUrl) {
  const identifier = moduleUrl.href;
  if (moduleCache.has(identifier)) return moduleCache.get(identifier);

  const source = await readFile(moduleUrl, 'utf8');
  const sourceModule = new vm.SourceTextModule(source, { identifier });
  moduleCache.set(identifier, sourceModule);
  await sourceModule.link((specifier, referencingModule) =>
    loadSourceModule(new URL(specifier, referencingModule.identifier)),
  );
  await sourceModule.evaluate();
  return sourceModule;
}

const activityAverageModule = await loadSourceModule(
  new URL('../src/services/activityAverage.js', import.meta.url),
);
const {
  calculateActivityAverage,
  getEffectiveCalculationStartDate,
} = activityAverageModule.namespace;

test('returns COLLECTING when a new user has no step records', () => {
  const result = calculateActivityAverage({
    dailySteps: [],
    trackingStartedAt: '2026-08-18',
    endDate: '2026-08-18',
    calculatedAt: '2026-08-18T03:00:00.000Z',
  });

  assert.equal(result.status, 'COLLECTING');
  assert.equal(result.averageSteps, null);
  assert.deepEqual(result.items, [{ date: '2026-08-18', steps: 0 }]);
});

test('uses a one-day average when steps first appear today', () => {
  const result = calculateActivityAverage({
    dailySteps: [{ date: '2026-08-18', steps: 6000 }],
    trackingStartedAt: '2026-08-18',
    endDate: '2026-08-18',
  });

  assert.equal(result.status, 'READY');
  assert.equal(result.dayCount, 1);
  assert.equal(result.averageSteps, 6000);
});

test('fills a missing middle day with zero', () => {
  const result = calculateActivityAverage({
    dailySteps: [
      { date: '2026-08-16', steps: 6000 },
      { date: '2026-08-18', steps: 9000 },
    ],
    trackingStartedAt: '2026-08-16',
    endDate: '2026-08-18',
  });

  assert.equal(result.dayCount, 3);
  assert.equal(result.totalSteps, 15000);
  assert.equal(result.averageSteps, 5000);
  assert.deepEqual(result.items[1], { date: '2026-08-17', steps: 0 });
});

test('extends before tracking start when older Health Connect records exist', () => {
  const result = calculateActivityAverage({
    dailySteps: [
      { date: '2026-08-10', steps: 3000 },
      { date: '2026-08-18', steps: 6000 },
    ],
    trackingStartedAt: '2026-08-18',
    endDate: '2026-08-18',
  });

  assert.equal(result.startDate, '2026-08-10');
  assert.equal(result.dayCount, 9);
  assert.equal(result.averageSteps, 1000);
});

test('caps the calculation at the most recent 30 calendar days', () => {
  const result = calculateActivityAverage({
    dailySteps: [
      { date: '2026-07-01', steps: 10000 },
      { date: '2026-07-20', steps: 3000 },
      { date: '2026-08-18', steps: 6000 },
    ],
    trackingStartedAt: '2026-07-01',
    endDate: '2026-08-18',
  });

  assert.equal(result.startDate, '2026-07-20');
  assert.equal(result.dayCount, 30);
  assert.equal(result.totalSteps, 9000);
  assert.equal(result.averageSteps, 300);
});

test('calculation start never moves beyond the end date', () => {
  assert.equal(
    getEffectiveCalculationStartDate({
      trackingStartedAt: '2026-08-20',
      oldestRecordDate: null,
      endDate: '2026-08-18',
    }),
    '2026-08-18',
  );
});
