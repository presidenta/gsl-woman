// «В поиске» (js/search/): один журнал действий по дням; полоски — сумма дней семидневки, балл дня — из того же журнала.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekKey, counts, bump, today } from '../js/search/steps.js';
import { _TEXTS } from '../js/search/texts.js';
import { COLLECTIONS } from '../js/sync/sync.js';
import { read, write } from '../js/core/store.js';
import { isoDate, addDays } from '../js/core/dates.js';

test('старта нет — семидневка с понедельника', () => {
  assert.equal(weekKey(new Date(2026, 10, 15), null), '2026-11-09', 'воскресенье → понедельник той же недели');
  assert.equal(weekKey(new Date(2026, 10, 16), null), '2026-11-16');
});

test('отметки +1 и −1, ниже нуля — ноль; неверный ключ не пишется', () => {
  write('searchlog', {});
  assert.equal(bump('out', 1), 1);
  assert.equal(bump('out', 1), 2);
  assert.equal(bump('out', -1), 1);
  assert.equal(bump('date', -1), 0);
  assert.deepEqual(counts(), { out: 1 });
  assert.equal(bump('Плохой ключ', 1), 0);
});

// Владелец 16.11.2026: «везде 0, а вверху +1 — это как понимать?» — балл и полоски из одного журнала
test('балл дня и полоски не расходятся: есть балл — есть и число на полоске', () => {
  write('searchlog', {});
  const iso = isoDate(new Date());
  assert.equal(today(iso), 0);
  bump('chat', 1);
  assert.equal(today(iso), 1);
  assert.equal(counts().chat, 1);
  bump('chat', -1);
  assert.equal(today(iso), 0, 'сняла отметку — балла нет');
  assert.deepEqual(counts(), {});
  assert.deepEqual(read('searchlog', {}), {}, 'пустой день из журнала убран');
});

test('«−» без сегодняшних отметок снимает последнюю в семидневке; чужие семидневки не считаются', () => {
  const now = new Date();
  const iso = isoDate(now);
  const week = weekKey(now);
  const old = addDays(week, -1); // день прошлой семидневки
  const log = { [old]: { out: 5 } };
  if (week !== iso) log[week] = { out: 2 };
  write('searchlog', log);
  const had = week !== iso ? 2 : 0;
  assert.equal(counts().out || 0, had, 'прошлая семидневка в счёт не идёт');
  if (had) {
    assert.equal(bump('out', -1), 1);
    assert.deepEqual(read('searchlog', {})[week], { out: 1 }, 'снята отметка первого дня семидневки');
    assert.equal(today(iso), 0, 'сегодня отметок нет — и балла нет');
  }
  assert.deepEqual(read('searchlog', {})[old], { out: 5 }, 'прошлая семидневка не тронута');
});

test('шаги уходят в копию; подписи — одни ключи на трёх языках', () => {
  assert.ok(COLLECTIONS.some((c) => c.key === 'searchlog' && c.type === 'map'));
  for (const l of ['ua', 'en']) assert.deepEqual(Object.keys(_TEXTS[l]).sort(), Object.keys(_TEXTS.ru).sort());
});

// Владелец 16.11.2026: «проплатил и подключился в среду — как будет?» — 7 дней считаются от дня старта
test('7 дней — от дня старта: начала в среду — со среды по вторник, потом новая семидневка', () => {
  const start = '2026-11-18'; // среда
  assert.equal(weekKey(new Date(2026, 10, 18), start), '2026-11-18', 'день 1');
  assert.equal(weekKey(new Date(2026, 10, 24), start), '2026-11-18', 'день 7 — вторник, та же семидневка');
  assert.equal(weekKey(new Date(2026, 10, 25), start), '2026-11-25', 'день 8 — новая семидневка');
  assert.equal(weekKey(new Date(2026, 10, 17), start), '2026-11-16', 'до старта — как раньше, с понедельника');
});
