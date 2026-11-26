// Матрица судьбы (js/charts/matrix/): точки по Ладини, карта здоровья без повторов, Небо/Земля, род.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matrix, r22 } from '../js/charts/matrix/calc.js';

test('17.05.1990: А 17, Б 5, В 19, Г 19, Д 16; род и предназначения', () => {
  const r = matrix('1990-05-17');
  assert.deepEqual(r.points, { A: 17, B: 5, C: 19, D: 19, E: 16, F: 22, G: 2, Y: 16, K: 14 });
  assert.equal(r.purposes.sky, r22(5 + 19), 'Небо = Б + Г');
  assert.equal(r.purposes.earth, r22(17 + 19), 'Земля = А + В');
  assert.equal(r.purposes.male, r22(22 + 16), 'мужской род = Ф + Ы');
});

test('карта здоровья: Сахасрара — А|Б, Муладхара — В|Г, Манипура — Д|Д', () => {
  const rows = matrix('1990-05-17').health.rows;
  assert.deepEqual([rows[0].body, rows[0].energy], [17, 5]);
  assert.deepEqual([rows[6].body, rows[6].energy], [19, 19]);
  assert.deepEqual([rows[4].body, rows[4].energy], [16, 16]);
  assert.equal(r22(44), 22);
  assert.equal(r22(23), 1);
  assert.equal(matrix('нет'), null);
});
