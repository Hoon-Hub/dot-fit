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

const sourceModule = await loadSourceModule(
  new URL('../src/services/activityDataSource.js', import.meta.url),
);
const { selectDailyStepsBySource } = sourceModule.namespace;

const dateKeys = ['2026-08-16', '2026-08-17', '2026-08-18'];

function select(overrides = {}) {
  return selectDailyStepsBySource({
    dateKeys,
    trackingStartedAt: '2026-08-17',
    aggregateStepsByDate: new Map([
      ['2026-08-16', 3000],
      ['2026-08-17', 7000],
      ['2026-08-18', 9000],
    ]),
    deviceStepsByDate: new Map([
      ['2026-08-16', 2000],
      ['2026-08-17', 4000],
    ]),
    deviceSourceIdentified: true,
    ...overrides,
  });
}

test('uses zero after tracking starts when the device date is missing', () => {
  const result = select();

  assert.equal(result.dataSource, 'DEVICE');
  assert.deepEqual(result.items[2], { date: '2026-08-18', steps: 0 });
});

test('allows restored aggregate data before tracking starts', () => {
  const result = select({
    deviceStepsByDate: new Map([['2026-08-17', 4000]]),
  });

  assert.equal(result.dataSource, 'DEVICE');
  assert.equal(result.usedHistoricalAggregate, true);
  assert.deepEqual(result.items[0], { date: '2026-08-16', steps: 3000 });
});

test('uses aggregate fallback when the current device source is unidentified', () => {
  const result = select({
    deviceStepsByDate: null,
    deviceSourceIdentified: false,
  });

  assert.equal(result.dataSource, 'AGGREGATE_FALLBACK');
  assert.deepEqual(result.items[2], { date: '2026-08-18', steps: 9000 });
});

test('uses aggregate fallback when the device query fails', () => {
  const result = select({
    deviceStepsByDate: null,
    deviceQueryFailed: true,
  });

  assert.equal(result.dataSource, 'AGGREGATE_FALLBACK');
  assert.deepEqual(result.items[1], { date: '2026-08-17', steps: 7000 });
});

test('uses the device value without combining same-day aggregate steps', () => {
  const result = select();

  assert.deepEqual(result.items[1], { date: '2026-08-17', steps: 4000 });
});

async function createHealthServiceFailureHarness() {
  const savedCache = {
    status: 'READY',
    averageSteps: 6500,
    activityState: 'ENERGETIC',
    activityStateAverageSteps: 6500,
    activityStateEvaluatedAt: '2026-08-17T04:00:00.000Z',
  };
  const saveCalls = { average: 0, weekly: 0 };
  const healthModuleCache = new Map();

  function createSyntheticModule(identifier, exports) {
    return new vm.SyntheticModule(
      Object.keys(exports),
      function setExports() {
        Object.entries(exports).forEach(([name, value]) => {
          this.setExport(name, value);
        });
      },
      { identifier },
    );
  }

  const nativeModule = createSyntheticModule('react-native-health-connect', {
    aggregateGroupByPeriod: async () => {
      throw new Error('Aggregate steps unavailable.');
    },
    aggregateRecord: async () => null,
    getGrantedPermissions: async () => [
      { accessType: 'read', recordType: 'Steps' },
    ],
    initialize: async () => true,
    requestPermission: async () => [],
  });
  const storageModule = createSyntheticModule('mock-storage-service', {
    ensureActivityTrackingStartedAt: async () => '2026-08-17',
    getActivityAverageCache: async () => savedCache,
    getWeeklyActivityCache: async () => null,
    saveActivityAverageCache: async () => {
      saveCalls.average += 1;
      return true;
    },
    saveWeeklyActivityCache: async () => {
      saveCalls.weekly += 1;
      return true;
    },
  });

  async function loadHealthModule(moduleUrl) {
    const identifier = moduleUrl.href;
    if (healthModuleCache.has(identifier)) {
      return healthModuleCache.get(identifier);
    }

    const source = await readFile(moduleUrl, 'utf8');
    const sourceTextModule = new vm.SourceTextModule(source, { identifier });
    healthModuleCache.set(identifier, sourceTextModule);
    await sourceTextModule.link((specifier, referencingModule) => {
      if (specifier === 'react-native-health-connect') return nativeModule;
      if (specifier === './storageService') return storageModule;

      const resolvedUrl = new URL(specifier, referencingModule.identifier);
      if (!resolvedUrl.pathname.endsWith('.js')) {
        return loadHealthModule(new URL(`${resolvedUrl.href}.js`));
      }
      return loadHealthModule(resolvedUrl);
    });
    await sourceTextModule.evaluate();
    return sourceTextModule;
  }

  const healthServiceModule = await loadHealthModule(
    new URL('../src/services/healthService.js', import.meta.url),
  );
  return { namespace: healthServiceModule.namespace, savedCache, saveCalls };
}

test('keeps the existing cache when aggregate and device lookup cannot run', async () => {
  const { namespace, savedCache, saveCalls } =
    await createHealthServiceFailureHarness();

  assert.equal(await namespace.getCachedActivityAverage(), savedCache);
  await assert.rejects(
    namespace.refreshActivity(),
    /Aggregate steps unavailable/,
  );
  assert.deepEqual(saveCalls, { average: 0, weekly: 0 });
  assert.equal(await namespace.getCachedActivityAverage(), savedCache);
});
