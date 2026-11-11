// Прогресс недели и «наверстать».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekSummary, bestLevel } from '../js/progress/progress.js';

const entry = (day, level = 'full', kind = 'task') => ({ id: `e${day}${level}`, day, kind, level });

test('лучший уровень дня', () => {
  assert.equal(bestLevel([entry(1, 'min'), entry(1, 'max'), entry(1, 'full')]), 'max');
  assert.equal(bestLevel([]), null);
});

test('процент — доля дней 1–6 с записью; пропуски текущей недели можно наверстать', () => {
  // Сегодня пятый день: записаны 1, 2 и 4, пропущен 3
  const s = weekSummary(1, [entry(1), entry(2, 'max'), entry(4, 'min')], 5);
  assert.equal(s.done, 3);
  assert.equal(s.percent, 50);
  assert.deepEqual(s.catchUp, [3]);
  assert.equal(s.lagDays, 1);
  assert.equal(s.lagPercent, 17);
  assert.equal(s.days[4].status, 'today');
  assert.equal(s.days[5].status, 'future');
  assert.equal(s.days[1].level, 'max');
});

test('пропуск, записанный задним числом, засчитывается', () => {
  const s = weekSummary(1, [entry(1), entry(3)], 4);
  assert.deepEqual(s.catchUp, [2]);
  const after = weekSummary(1, [entry(1), entry(3), entry(2, 'min')], 4);
  assert.deepEqual(after.catchUp, []);
  assert.equal(after.done, 3);
});

test('прошлая неделя закрыта: догонять нечего, процент остаётся', () => {
  const s = weekSummary(1, [entry(1)], 10);
  assert.deepEqual(s.catchUp, []);
  assert.equal(s.lagPercent, 0);
  assert.equal(s.percent, 17);
});

test('седьмой день — итог: отмечается записью созвона, в процент не входит', () => {
  const s = weekSummary(2, [entry(14, 'full', 'call')], 14);
  assert.equal(s.callDone, true);
  assert.equal(s.done, 0);
});
