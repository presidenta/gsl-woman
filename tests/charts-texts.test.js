// Расшифровки карт (сборка 216): у каждого элемента расчёта есть текст — ни одна строка расшифровки не останется пустой.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../js/charts/hd/astronomy.js';
import { CHANNELS, ORDER, CENTERS, TYPES, AUTHORITIES, chart, zonedToUtc, angleOf, areas } from '../js/charts/hd/calc.js';
import { HD_TYPE_DB, HD_AUTHORITY_DB, HD_PROFILE_DB, HD_CENTER_DB, HD_GATES, HD_CHANNELS, HD_DEFINITION_DB, HD_ANGLE_DB, HD_PAIR_DB } from '../js/charts/hd/texts.js';
import { PAIR_KINDS } from '../js/charts/hd/calc.js';
import { ARCANA_DB, POINTS_DB, AGES, PURPOSES_DB, CHAKRAS_DB } from '../js/charts/matrix/arcana.js';
import { matrix } from '../js/charts/matrix/calc.js';
import { PYTHAGORAS_DB, LINES_DB, countText, lineBand } from '../js/charts/pythagoras/texts.js';
import { LINES } from '../js/charts/pythagoras/calc.js';

test('HD: тексты у всех 36 каналов, 64 ворот, типов, авторитетов, центров, 12 профилей, видов пары', () => {
  for (const [a, b] of CHANNELS) assert.ok(HD_CHANNELS[`${a}-${b}`]?.[2], `канал ${a}-${b}`);
  assert.equal(Object.keys(HD_CHANNELS).length, 36);
  for (const g of ORDER) assert.ok(HD_GATES[g]?.[1], `ворота ${g}`);
  for (const k of Object.keys(TYPES)) assert.ok(HD_TYPE_DB[k]?.strategy && HD_TYPE_DB[k].aura, k);
  for (const k of Object.keys(AUTHORITIES)) assert.ok(HD_AUTHORITY_DB[k]?.howToDecide && HD_AUTHORITY_DB[k].feel, k);
  for (const k of Object.keys(CENTERS)) assert.ok(HD_CENTER_DB[k]?.question && HD_CENTER_DB[k].theme, k);
  for (const p of ['1/3', '1/4', '2/4', '2/5', '3/5', '3/6', '4/6', '4/1', '5/1', '5/2', '6/2', '6/3']) assert.ok(HD_PROFILE_DB[p]?.text, p);
  for (const k of Object.keys(PAIR_KINDS)) assert.ok(HD_PAIR_DB[k], k);
  for (const k of [0, 1, 2, 3, 4]) assert.ok(HD_DEFINITION_DB[k], `определённость ${k}`);
});

test('HD: подписи по Ра Уру Ху; канал 20–57 — «Мозговой волны»', () => {
  assert.equal(HD_TYPE_DB.ManifestingGenerator.signature, 'Удовлетворение');
  assert.equal(HD_TYPE_DB.Projector.signature, 'Успех');
  assert.equal(HD_CHANNELS['20-57'][0], 'Мозговой волны');
});

test('HD: угол креста по профилю, число областей определённости', () => {
  assert.equal(angleOf('4/1'), 'juxta');
  assert.equal(angleOf('5/1'), 'left');
  assert.equal(angleOf('6/3'), 'left');
  assert.equal(angleOf('2/4'), 'right');
  for (const k of ['right', 'juxta', 'left']) assert.ok(HD_ANGLE_DB[k]);
  assert.equal(areas([], {}), 0);
  assert.equal(areas(['Throat', 'G', 'Sacral', 'Root'], { Throat: ['G'], G: ['Throat'], Sacral: ['Root'], Root: ['Sacral'] }), 2);
  const r = chart(A, zonedToUtc('1948-04-09', '00:14', 'America/Montreal'));
  assert.equal(r.angle, 'left', 'Ра Уру Ху, 5/1 — левый угол');
  assert.ok(r.definition >= 1 && r.definition <= 4);
});

test('Матрица: 22 аркана со всеми полями, точки, возрасты, предназначения, чакры карты здоровья', () => {
  for (let n = 1; n <= 22; n += 1) {
    const x = ARCANA_DB[n];
    for (const f of ['name', 'essence', 'plus', 'minus', 'love', 'money', 'health', 'howTo']) assert.ok(x?.[f], `аркан ${n}: ${f}`);
  }
  const r = matrix('1990-05-17');
  for (const k of ['A', 'B', 'C', 'D', 'E']) assert.ok(POINTS_DB[k].meaning);
  for (const [, k] of AGES) assert.ok(r.points[k] >= 1 && r.points[k] <= 22, k);
  for (const k of Object.keys(r.purposes)) assert.ok(PURPOSES_DB[k], k);
  for (const row of r.health.rows) assert.ok(CHAKRAS_DB[row.name], row.name);
  assert.match(POINTS_DB.D.meaning, /Кармическ/);
});

test('Пифагор: текст для любого числа цифр 0…8, все 8 линий, уровни линий', () => {
  for (let d = 1; d <= 9; d += 1) for (let n = 0; n <= 8; n += 1) assert.ok(countText(d, n), `${d}×${n}`);
  assert.match(countText(1, 3), /Золотая середина/);
  assert.equal(countText(2, 7), PYTHAGORAS_DB[2].byCount[4]);
  for (const [name] of LINES) assert.equal(LINES_DB[name]?.levels.length, 4, name);
  assert.deepEqual([0, 2, 3, 4, 5, 6, 7, 12].map(lineBand), [0, 0, 1, 1, 2, 2, 3, 3]);
});
