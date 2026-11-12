// Итоги: реакции мужчин и победы за неделю, месяц, всё время — считаются из записей.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fixture from './fixtures/program.js';
import { _use } from '../js/program/source.js';
import { periodRange, summarize } from '../js/insights/insights.js';
import * as journal from '../js/journal/journal.js';

_use(fixture);

test('сроки: неделя дня, его месяц, всё время', () => {
  assert.deepEqual(periodRange('week', 10), { from: 8, to: 14 });
  assert.deepEqual(periodRange('month', 10), { from: 1, to: 28 });
  assert.deepEqual(periodRange('month', 30), { from: 29, to: 56 });
  assert.equal(periodRange('all', 10).from, 1);
});

test('запись хранит реакцию мужчины', () => {
  const e = journal.add({ day: 2, kind: 'task', level: 'max', man: 'Игорь', reaction: '  Улыбнулся и открыл дверь  ' });
  assert.equal(journal.byId(e.id).reaction, 'Улыбнулся и открыл дверь');
  journal.remove(e.id);
});

test('итоги недели: дни, уровни, реакции свежие сверху, победы', () => {
  const made = [
    journal.add({ day: 1, kind: 'task', level: 'min', reaction: 'Открыл дверь', worked: 'Остановилась у двери' }),
    journal.add({ day: 3, kind: 'task', level: 'max', man: 'Игорь', reaction: 'Сам взял пакеты' }),
    journal.add({ day: 7, kind: 'call', worked: 'Главное за неделю' }),
    journal.add({ day: 9, kind: 'task', level: 'full', reaction: 'Другая неделя' }),
  ];
  const s = summarize(journal.all(), periodRange('week', 3), 'ru');
  assert.equal(s.records, 3);
  assert.equal(s.days, 2, 'созвон — не день задания');
  assert.deepEqual(s.levels, { min: 1, full: 0, max: 1 });
  assert.deepEqual(s.reactions.map((r) => r.reaction), ['Сам взял пакеты', 'Открыл дверь']);
  assert.equal(s.reactions[0].man, 'Игорь');
  assert.equal(s.reactions[0].title, 'Задание 1.3');
  assert.equal(s.wins.length, 2);
  assert.equal(summarize(journal.all(), periodRange('all', 9), 'ru').reactions.length, 3);
  made.forEach((e) => journal.remove(e.id));
});
