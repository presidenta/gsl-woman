// «Секретные материалы» (js/secret/, владелец 22.11.2026): глава через 2 дня, 7 глав; с первого дня — первая на 2-й день.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openedOn, daysTo, cardOn } from '../js/secret/schedule.js';
import { ST } from '../js/secret/texts.js';

test('главы — раз в 2 дня, всего 7; карточка — до дня после последней', () => {
  const start = 2;
  assert.deepEqual([1, 2, 3, 4, 5, 14, 20].map((d) => openedOn(d, start)), [0, 1, 1, 2, 2, 7, 7]);
  assert.equal(daysTo(2, 2, start), 2);
  assert.equal(daysTo(1, 2, start), 0);
  assert.ok(cardOn(15, start) && !cardOn(16, start) && !cardOn(1, start));
  assert.equal(openedOn(5, null), 0, 'без старта — ничего');
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
  assert.equal(openedOn(3, startOf(3)), 1, 'день 3 — первая глава');
  assert.equal(openedOn(14, startOf(14)), 7, 'день 14 — седьмая');
  assert.equal(startOf(44), 40, 'свой день — от запомненного старта');
});
