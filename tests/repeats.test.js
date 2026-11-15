// Повтор по графику (владелец, 15.11.2026): главные навыки — раз в месяц, важные — раз в два, остальные — раз в три.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueRepeats, tiersForDay, MAX_PER_DAY } from '../js/program/repeats.js';

const weeks = [
  { tasks: [{ title: 'Двери', repeat: 'month' }, { title: 'Взгляд', repeat: 'two' }, { title: 'Подруга' }] },
  { tasks: [{ title: 'Голос', repeat: 'three' }] },
  { tasks: [] },
  { tasks: [{ title: 'Повтор: двери' }] },
];
const names = (list) => list.map((r) => r.task.title);

test('навык возвращается через 4, 8, 12 недель — по своему ритму; задание без ритма — один раз', () => {
  assert.deepEqual(names(dueRepeats(weeks, 5, ['month', 'two'])), ['Двери'], 'неделя 5: через месяц');
  assert.deepEqual(names(dueRepeats(weeks, 9, ['month', 'two'])), ['Двери', 'Взгляд'], 'неделя 9: месяц и два');
  assert.deepEqual(names(dueRepeats(weeks, 14, ['three'])), ['Голос'], 'неделя 14: три месяца от недели 2');
  assert.deepEqual(names(dueRepeats(weeks, 6, ['month', 'two', 'three'])), [], 'неделя 6 — ничего');
  assert.ok(!names(dueRepeats(weeks, 13, ['month', 'two', 'three'])).includes('Подруга'));
});

test('дни практики: 4-й — месяц и два, 5-й — три; не больше трёх за день, главные — первыми', () => {
  assert.deepEqual(tiersForDay(4), ['month', 'two']);
  assert.deepEqual(tiersForDay(5), ['three']);
  assert.deepEqual(tiersForDay(1), []);
  const many = [{ tasks: ['a', 'b', 'c', 'd'].map((x) => ({ title: x, repeat: 'two' })).concat([{ title: 'главное', repeat: 'month' }]) }];
  const due = dueRepeats(many, 9, ['month', 'two']);
  assert.equal(due.length, MAX_PER_DAY);
  assert.equal(due[0].task.title, 'главное');
});
