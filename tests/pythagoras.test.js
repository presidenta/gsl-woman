// Квадрат Пифагора (js/charts/pythagoras/): классические рабочие числа, правило для рождённых с 2000, линии.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pythagoras } from '../js/charts/pythagoras/calc.js';

test('17.05.1990: рабочие числа 32 · 5 · 30 · 3, счёт цифр и линии', () => {
  const r = pythagoras('1990-05-17');
  assert.deepEqual(r.work, [32, 5, 30, 3]);
  // 1,7,5,1,9,9 + 32 5 30 3 → 1:2, 2:1, 3:3, 5:2, 7:1, 9:2
  assert.deepEqual(r.counts, { 1: 2, 2: 1, 3: 3, 4: 0, 5: 2, 6: 0, 7: 1, 8: 0, 9: 2 });
  assert.equal(r.cells[4], '—');
  assert.equal(r.lines.find((l) => l.name === 'Самооценка').total, 6);
});

test('рождённым с 2000: 3-е число = 1-е + 19', () => {
  const r = pythagoras('2005-03-08');
  assert.deepEqual(r.work, [18, 9, 37, 10]);
});

test('день с нулём: первая цифра дня — значащая', () => {
  assert.deepEqual(pythagoras('1985-11-04').work, [29, 11, 21, 3]); // 29 − 2·4 = 21
  assert.equal(pythagoras('не дата'), null);
});

test('пара 26.10.1981 + 28.07.1986: два квадрата сравниваются, а не складываются', async () => {
  const { pairPythagoras } = await import('../js/charts/pythagoras/calc.js');
  const r = pairPythagoras('1981-10-26', '1986-07-28');
  // 26.10.1981: 28 · 10 · 24 · 6 → единиц 4 (одна — из «10»); 28.07.1986: 41 · 5 · 37 · 10 → единиц 3
  assert.equal(r.a.cells[1], '1111');
  assert.equal(r.b.cells[1], '111');
  const st = Object.fromEntries(r.compare.map((c) => [c.digit, c.status]));
  assert.deepEqual(st, { 1: 'even', 2: 'tilt', 3: 'comp', 4: 'even', 5: 'comp', 6: 'even', 7: 'comp', 8: 'both', 9: 'even' });
});
