// «В поиске» (js/search/): шаги недели считаются по календарной неделе с понедельника, в пределах 0…99.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekKey, counts, bump } from '../js/search/steps.js';
import { _TEXTS } from '../js/search/texts.js';
import { COLLECTIONS } from '../js/sync/sync.js';

test('неделя — с понедельника; отметки +1 и −1, ниже нуля — ноль', () => {
  assert.equal(weekKey(new Date(2026, 10, 15)), '2026-11-09', 'воскресенье → понедельник той же недели');
  assert.equal(weekKey(new Date(2026, 10, 16)), '2026-11-16');
  const w = '2026-11-09';
  assert.equal(bump('out', 1, w), 1);
  assert.equal(bump('out', 1, w), 2);
  assert.equal(bump('out', -1, w), 1);
  assert.equal(bump('date', -1, w), 0);
  assert.deepEqual(counts(w), { out: 1, date: 0 });
  assert.deepEqual(counts('2026-11-16'), {}, 'новая неделя — с нуля');
  assert.equal(bump('Плохой ключ', 1, w), 0);
});

test('шаги уходят в копию; подписи — одни ключи на трёх языках', () => {
  assert.ok(COLLECTIONS.some((c) => c.key === 'searchsteps' && c.type === 'map'));
  for (const l of ['ua', 'en']) assert.deepEqual(Object.keys(_TEXTS[l]).sort(), Object.keys(_TEXTS.ru).sort());
});
