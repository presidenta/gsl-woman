// Матрица судьбы (js/charts/matrix/): точки по Ладини, карта здоровья без повторов, Небо/Земля, род.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matrix, r22, pairMatrix } from '../js/charts/matrix/calc.js';

test('26.10: день 26 → 8 (сложение цифр, не минус 22)', () => {
  assert.equal(matrix('1990-10-26').points.A, 8);
  assert.equal(r22(44), 8);
});

test('17.05.1990: А 17, Б 5, В 19, Г 5, Д 10; род и предназначения', () => {
  const r = matrix('1990-05-17');
  assert.deepEqual(r.points, { A: 17, B: 5, C: 19, D: 5, E: 10, F: 22, G: 6, Y: 6, K: 22 });
  assert.equal(r.purposes.sky, r22(5 + 5), 'Небо = Б + Г');
  assert.equal(r.purposes.earth, r22(17 + 19), 'Земля = А + В');
  assert.equal(r.purposes.male, r22(22 + 6), 'мужской род = Ф + Ы');
});

test('карта здоровья: Сахасрара — А|Б, Муладхара — В|Г, Манипура — Д|Д', () => {
  const rows = matrix('1990-05-17').health.rows;
  assert.deepEqual([rows[0].body, rows[0].energy], [17, 5]);
  assert.deepEqual([rows[6].body, rows[6].energy], [19, 5]);
  assert.deepEqual([rows[4].body, rows[4].energy], [10, 10]);
  const l = matrix('1990-05-17').lines;
  assert.equal(l.father[0], 22); assert.equal(l.father[6], 6); assert.equal(l.mother.length, 7);
  assert.equal(r22(23), 5); // 2 + 3
  assert.equal(matrix('нет'), null);
});

test('матрица пары: точки складываются и сводятся', () => {
  const p = pairMatrix('1990-05-17', '1990-10-26');
  assert.equal(p.points.A, r22(17 + 8));
  assert.ok(p.rays.a.x1 && p.loveMoney.love && p.lines.father.length === 7, 'у пары всё для рисунка: лучи, род, любовь/деньги');
  assert.equal(pairMatrix('x', '1990-10-26'), null);
});

test('пара 26.10.1981 + 28.07.1986: лево 18, верх 17, право 7, низ 15, центр 21; Небо пары = верх + низ = 5', () => {
  // 26.10.1981: А 8 (26→8), Б 10, В 19, Г 10, Д 11; 28.07.1986: А 10 (28→10), Б 7, В 6 (24→6), Г 5, Д 10
  const p = pairMatrix('1981-10-26', '1986-07-28');
  assert.deepEqual([p.points.A, p.points.B, p.points.C, p.points.D, p.points.E], [18, 17, 7, 15, 21]);
  assert.equal(p.purposes.sky, 5);
});

test('круг возрастов (235): 8 отрезков по 7 чисел; образец владельца 01.03.2017 — от 0 до 10 лет', () => {
  const r = matrix('2017-03-01');
  assert.deepEqual([r.points.A, r.points.B, r.points.C, r.points.D, r.points.E], [1, 3, 10, 14, 10]);
  // А 1 → Ф 4: 5 лет = 1+4, 2,5 = 1+5, 1,25 = 1+6, 3,75 = 6+5, 7,5 = 5+4, 6,25 = 5+9, 8,75 = 9+4
  assert.deepEqual(r.ages[0], [7, 6, 11, 5, 14, 9, 13]);
  assert.equal(r.ages.length, 8);
  r.ages.forEach((a) => { assert.equal(a.length, 7); a.forEach((n) => assert.ok(n >= 1 && n <= 22)); });
});
