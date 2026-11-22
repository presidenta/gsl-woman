// «Секретные материалы» (js/secret/, владелец 22.11.2026): глава через 2 дня, 7 глав; с первого дня — первая на 2-й день.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openedOn, daysTo, cardOn, releaseDays } from '../js/secret/schedule.js';
import { ST } from '../js/secret/texts.js';

test('глава 1 — в день старта, главы 2…7 — по субботам; карточка — суббота и воскресенье', () => {
  // старт 2026-11-15 (воскресенье): день 2 — понедельник 16.11; субботы — дни 7, 14, 21, 28, 35, 42
  const days = releaseDays(2, '2026-11-15');
  assert.deepEqual(days, [2, 7, 14, 21, 28, 35, 42]);
  assert.deepEqual([1, 2, 6, 7, 8, 13, 42, 60].map((d) => openedOn(d, days)), [0, 1, 1, 2, 2, 2, 7, 7]);
  assert.ok(cardOn(2, days) && cardOn(3, days) && !cardOn(4, days), 'глава 1 — её день и следующий');
  assert.ok(cardOn(7, days) && cardOn(8, days) && !cardOn(9, days), 'суббота и воскресенье');
  assert.equal(daysTo(2, 3, days), 4);
  assert.deepEqual(releaseDays(null, '2026-11-15'), [], 'без старта — ничего');
});

test('надписи — одни ключи на ru, ua, en', () => {
  const keys = (o) => Object.keys(o).sort().join();
  assert.equal(keys(ST.ua), keys(ST.ru));
  assert.equal(keys(ST.en), keys(ST.ru));
});

// 22.11.2026, владелец: «пролистал первые 7 дней — ни одного секретного материала»: старт запомнился поздним днём, а
// стрелки вели на дни раньше него. День на экране раньше старта — главы по дням программы (2, 4 … 14).
import { startOf } from '../js/secret/schedule.js';
import { write, _useBackend } from '../js/core/store.js';
test('листание назад: день раньше запомненного старта — главы по дням программы', () => {
  const m = new Map();
  _useBackend({ getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; } });
  write('secret:start', 40);
  assert.equal(startOf(3), 2);
  assert.equal(openedOn(3, releaseDays(startOf(3), '2026-11-15')), 1, 'день 3 — первая глава');
  assert.equal(startOf(44), 40, 'свой день — от запомненного старта');
});
