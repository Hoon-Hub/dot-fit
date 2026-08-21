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

const stateModule = await loadSourceModule(
  new URL('../src/services/activityStateEngine.js', import.meta.url),
);
const {
  buildActivityStateCacheFields,
  determineActivityState,
  evaluateActivityState,
} = stateModule.namespace;

test('uses base thresholds for every initial-state boundary', () => {
  const cases = [
    [3999, 'DROWSY'],
    [4000, 'SPRY'],
    [5999, 'SPRY'],
    [6000, 'ENERGETIC'],
    [9999, 'ENERGETIC'],
    [10000, 'VIGOROUS'],
  ];

  cases.forEach(([averageSteps, expectedState]) => {
    assert.equal(determineActivityState(averageSteps), expectedState);
  });
});

test('applies the 4300 upward and below-3700 downward boundary', () => {
  assert.equal(determineActivityState(4300, 'DROWSY'), 'SPRY');
  assert.equal(determineActivityState(3699, 'SPRY'), 'DROWSY');
});

test('applies the 6300 upward and below-5700 downward boundary', () => {
  assert.equal(determineActivityState(6300, 'SPRY'), 'ENERGETIC');
  assert.equal(determineActivityState(5699, 'ENERGETIC'), 'SPRY');
});

test('applies the 10300 upward and below-9700 downward boundary', () => {
  assert.equal(determineActivityState(10300, 'ENERGETIC'), 'VIGOROUS');
  assert.equal(determineActivityState(9699, 'VIGOROUS'), 'ENERGETIC');
});

test('keeps the previous side within every hysteresis interval', () => {
  assert.equal(determineActivityState(4100, 'DROWSY'), 'DROWSY');
  assert.equal(determineActivityState(4100, 'SPRY'), 'SPRY');
  assert.equal(determineActivityState(6100, 'SPRY'), 'SPRY');
  assert.equal(determineActivityState(6100, 'ENERGETIC'), 'ENERGETIC');
  assert.equal(determineActivityState(10100, 'ENERGETIC'), 'ENERGETIC');
  assert.equal(determineActivityState(10100, 'VIGOROUS'), 'VIGOROUS');
});

test('keeps the state above a boundary at the exact downward value', () => {
  assert.equal(determineActivityState(3700, 'SPRY'), 'SPRY');
  assert.equal(determineActivityState(5700, 'ENERGETIC'), 'ENERGETIC');
  assert.equal(determineActivityState(9700, 'VIGOROUS'), 'VIGOROUS');
});

test('moves directly across multiple upward boundaries', () => {
  assert.equal(determineActivityState(10500, 'DROWSY'), 'VIGOROUS');
});

test('moves directly across multiple downward boundaries', () => {
  assert.equal(determineActivityState(3500, 'VIGOROUS'), 'DROWSY');
});

test('keeps the previous state while data is COLLECTING', () => {
  assert.equal(
    evaluateActivityState({
      dataStatus: 'COLLECTING',
      averageSteps: null,
      previousState: 'ENERGETIC',
    }),
    'ENERGETIC',
  );

  assert.deepEqual(
    buildActivityStateCacheFields({
      averageResult: { status: 'COLLECTING', averageSteps: null },
      previousCache: {
        activityState: 'ENERGETIC',
        activityStateAverageSteps: 6500,
        activityStateEvaluatedAt: '2026-08-17T04:00:00.000Z',
      },
      evaluatedAt: '2026-08-18T04:00:00.000Z',
    }),
    {
      activityState: 'ENERGETIC',
      activityStateAverageSteps: 6500,
      activityStateEvaluatedAt: '2026-08-17T04:00:00.000Z',
    },
  );
});

test('keeps the previous state when average steps are null', () => {
  assert.equal(
    evaluateActivityState({
      dataStatus: 'READY',
      averageSteps: null,
      previousState: 'SPRY',
    }),
    'SPRY',
  );
});

test('supports existing caches that do not have an activity state', () => {
  assert.equal(
    evaluateActivityState({
      dataStatus: 'COLLECTING',
      averageSteps: null,
      previousState: undefined,
    }),
    null,
  );

  assert.deepEqual(
    buildActivityStateCacheFields({
      averageResult: { status: 'READY', averageSteps: 4100 },
      previousCache: { status: 'READY', averageSteps: 4100 },
      evaluatedAt: '2026-08-18T04:00:00.000Z',
    }),
    {
      activityState: 'SPRY',
      activityStateAverageSteps: 4100,
      activityStateEvaluatedAt: '2026-08-18T04:00:00.000Z',
    },
  );
});
