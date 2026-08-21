import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const moduleCache = new Map();
const context = vm.createContext({
  require: (specifier) => specifier,
});

async function loadSourceModule(moduleUrl) {
  const identifier = moduleUrl.href;
  if (moduleCache.has(identifier)) return moduleCache.get(identifier);

  const source = await readFile(moduleUrl, 'utf8');
  const sourceModule = new vm.SourceTextModule(source, {
    context,
    identifier,
  });
  moduleCache.set(identifier, sourceModule);
  await sourceModule.link((specifier, referencingModule) => {
    const resolvedSpecifier = specifier.endsWith('.js')
      ? specifier
      : `${specifier}.js`;
    return loadSourceModule(
      new URL(resolvedSpecifier, referencingModule.identifier),
    );
  });
  await sourceModule.evaluate();
  return sourceModule;
}

const imageModule = await loadSourceModule(
  new URL('../src/constants/characterImages.js', import.meta.url),
);
const { getCharacterImageSource } = imageModule.namespace;

test('maps every ready Nuti activity state to its static image', () => {
  const cases = [
    ['DROWSY', '../../assets/images/characters/nuti/drowsy.png'],
    ['SPRY', '../../assets/images/characters/nuti/spry.png'],
    ['ENERGETIC', '../../assets/images/characters/nuti/energetic.png'],
    ['VIGOROUS', '../../assets/images/characters/nuti/vigorous.png'],
  ];

  cases.forEach(([activityState, expectedSource]) => {
    assert.equal(
      getCharacterImageSource({
        characterType: 'nuti',
        activityDataStatus: 'READY',
        activityState,
      }),
      expectedSource,
    );
  });
});

test('returns the next image immediately when the activity state changes', () => {
  const selection = {
    characterType: 'nuti',
    activityDataStatus: 'READY',
  };

  assert.equal(
    getCharacterImageSource({ ...selection, activityState: 'DROWSY' }),
    '../../assets/images/characters/nuti/drowsy.png',
  );
  assert.equal(
    getCharacterImageSource({ ...selection, activityState: 'VIGOROUS' }),
    '../../assets/images/characters/nuti/vigorous.png',
  );
});

test('keeps the existing fallback while activity data is collecting', () => {
  assert.equal(
    getCharacterImageSource({
      characterType: 'nuti',
      activityDataStatus: 'COLLECTING',
      activityState: 'ENERGETIC',
    }),
    null,
  );
});

test('keeps the existing fallback for missing or unknown activity states', () => {
  [null, undefined, 'UNKNOWN'].forEach((activityState) => {
    assert.equal(
      getCharacterImageSource({
        characterType: 'nuti',
        activityDataStatus: 'READY',
        activityState,
      }),
      null,
    );
  });
});

test('never returns a Nuti image for another character type', () => {
  assert.equal(
    getCharacterImageSource({
      characterType: 'luti',
      activityDataStatus: 'READY',
      activityState: 'VIGOROUS',
    }),
    null,
  );
});
