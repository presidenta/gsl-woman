// Баллы дня (владелец 14.11.2026, сборка 56): Минимум — 1, 100% — 2, Максимум — 3, стакан — 1; личные, из отметок.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clearAll, write } from '../js/core/store.js';
import { pointsOf, taskPoints, dayScore } from '../js/score/score.js';
import * as morningLog from '../js/journal/morning-log.js';
import * as waterLog from '../js/water/water-log.js';
import { markKegel, setSteps } from '../js/habits/logs.js';
import * as deeds from '../js/score/deeds.js';

beforeEach(() => clearAll());

const ISO = '2026-11-14';

test('уровни: Минимум 1, 100% 2, Максимум 3, без уровня 0', () => {
  assert.deepEqual(['min', 'full', 'max', null, 'x'].map(pointsOf), [1, 2, 3, 0, 0]);
});

test('задание дня — лучший уровень записей этого дня, созвон — 2', () => {
  const entries = [
    { day: 2, kind: 'task', level: 'min' },
    { day: 2, kind: 'task', level: 'max' },
    { day: 3, kind: 'task', level: 'max' },
  ];
  assert.equal(taskPoints(entries, 2), 3);
  assert.equal(taskPoints([{ day: 7, kind: 'call', level: 'min' }], 7), 2);
  assert.equal(taskPoints([], 2), 0);
});

test('утренняя минута: уровень по длине, остаётся лучший; старая отметка true — Минимум', () => {
  morningLog.markDone(ISO, 'full');
  morningLog.markDone(ISO, 'min');
  assert.equal(morningLog.levelOf(ISO), 'full');
  write('morning', { '2026-11-01': true });
  assert.equal(morningLog.levelOf('2026-11-01'), 'min');
  assert.equal(morningLog.isDone('2026-11-01'), true);
  assert.equal(morningLog.isDone('2026-11-02'), false);
});

test('сумма дня складывается из всех отметок', () => {
  waterLog.setDone(ISO, true);
  morningLog.markDone(ISO, 'max');
  markKegel(ISO, 'full');
  setSteps(ISO, 6500);
  waterLog.night.setDone(ISO, true);
  deeds.toggle(ISO, 'love');
  deeds.toggle(ISO, 'imsg');
  deeds.toggle(ISO, 'imsg'); // второе нажатие снимает
  deeds.toggle(ISO, 'evening'); // «Мы поговорили» — вопрос на вечер (evening/)
  const s = dayScore(ISO, 2, [{ day: 2, kind: 'task', level: 'min' }], { talk: true });
  assert.deepEqual(s.parts, { water: 1, minute: 3, task: 1, imsg: 0, love: 1, evening: 1, talk: 1, kegel: 2, steps: 2, night: 1 });
  assert.equal(s.total, 13);
});
