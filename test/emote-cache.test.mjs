// Emote cache validation: a damaged cache file must never break the picker.
import assert from 'node:assert/strict';
import { test } from 'node:test';
const { parseCache } = await import('../src/main/emote-cache.ts');

const ID = '01GAFTZ9K80003DHH026MC7JW0';
const EMPTY = { version: 1, sets: {} };

test('keeps a well-formed cache as it is', () => {
  const file = {
    version: 1,
    sets: {
      global: {
        fetchedAt: 123,
        name: 'Global',
        emotes: [{ id: ID, name: 'Pepe', animated: false }],
      },
    },
  };
  assert.deepEqual(parseCache(file), file);
});

test('anything that is not a version 1 cache becomes an empty one', () => {
  for (const bad of [
    null,
    5,
    'x',
    [],
    {},
    { version: 2, sets: {} },
    { version: 1 },
    { version: 1, sets: null },
  ]) {
    assert.deepEqual(parseCache(bad), EMPTY);
  }
});

test('drops broken sets and broken emotes, keeps the rest', () => {
  const parsed = parseCache({
    version: 1,
    sets: {
      global: {
        fetchedAt: 'yesterday',
        name: 42,
        emotes: [
          { id: ID, name: 'Pepe', animated: 'yes' },
          { id: 'nope', name: 'Bad' },
          { id: ID, name: '' },
          null,
          'text',
        ],
      },
      [ID]: { fetchedAt: 1, emotes: 'not a list' },
      'not-an-id': { fetchedAt: 1, emotes: [] },
      __proto__: null,
    },
  });
  assert.deepEqual(parsed, {
    version: 1,
    sets: {
      // An unknown age counts as stale, so the set is fetched again.
      global: {
        fetchedAt: 0,
        emotes: [{ id: ID, name: 'Pepe', animated: false }],
      },
    },
  });
});
