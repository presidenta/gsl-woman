// Расшифровки карт (216–218): у каждого элемента расчёта есть текст на трёх языках, ключи совпадают; 192 креста с именами;
// программы кармического хвоста сходятся со счётом матрицы.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../js/charts/hd/astronomy.js';
import { CHANNELS, ORDER, CENTERS, TYPES, AUTHORITIES, BODIES, PAIR_KINDS, chart, zonedToUtc, angleOf, areas } from '../js/charts/hd/calc.js';
import { CROSSES, crossKey } from '../js/charts/hd/crosses.js';
import { SETS as HD, crossName } from '../js/charts/hd/texts/index.js';
import { SETS as MX } from '../js/charts/matrix/texts/index.js';
import { SETS as PY, countText, lineBand } from '../js/charts/pythagoras/texts/index.js';
import { SETS as SCR } from '../js/screens/charts/texts.js';
import { matrix, r22 } from '../js/charts/matrix/calc.js';
import { LINES } from '../js/charts/pythagoras/calc.js';
import { ROLES } from '../js/charts/people.js';

// Все пути ключей (массивы — по длине), чтобы сравнить языки
function shape(o, p = '') {
  if (Array.isArray(o)) return [`${p}[${o.length}]`];
  if (o && typeof o === 'object') return Object.entries(o).flatMap(([k, v]) => shape(v, `${p}.${k}`));
  assert.ok(typeof o === 'string' && o.trim(), `пусто: ${p}`);
  return [p];
}
const sameKeys = (sets, name) => {
  const base = shape(sets.ru).sort();
  for (const l of ['ua', 'en']) assert.deepEqual(shape(sets[l]).sort(), base, `${name}: ${l}`);
};

test('ключи текстов одинаковы в ru / ua / en, пустых строк нет', () => {
  sameKeys(PY, 'Пифагор');
  sameKeys(MX, 'Матрица');
  sameKeys(HD, 'Human Design');
  sameKeys(SCR, 'экран');
});

test('HD: тексты у всех 36 каналов, 64 ворот, типов, авторитетов, центров, 12 профилей, видов пары, планет', () => {
  const T = HD.ru;
  for (const [a, b] of CHANNELS) assert.ok(T.channels[`${a}-${b}`]?.[2], `канал ${a}-${b}`);
  assert.equal(Object.keys(T.channels).length, 36);
  for (const g of ORDER) assert.ok(T.gates[g]?.[1], `ворота ${g}`);
  for (const k of Object.keys(TYPES)) assert.ok(T.types[k]?.strategy && T.types[k].aura, k);
  for (const k of Object.keys(AUTHORITIES)) assert.ok(T.authorities[k]?.howToDecide, k);
  for (const k of Object.keys(CENTERS)) assert.ok(T.centers[k]?.question, k);
  for (const p of ['1/3', '1/4', '2/4', '2/5', '3/5', '3/6', '4/6', '4/1', '5/1', '5/2', '6/2', '6/3']) assert.ok(T.profiles[p], p);
  for (const k of Object.keys(PAIR_KINDS)) assert.ok(T.pairKinds[k], k);
  for (const b of BODIES) assert.ok(T.bodies[b], b);
  for (const k of [0, 1, 2, 3, 4]) assert.ok(T.definition[k], `определённость ${k}`);
  assert.equal(T.types.ManifestingGenerator.signature, 'Удовлетворение');
  assert.equal(T.channels['20-57'][0], 'Мозговой волны');
});

test('HD: 192 креста — у каждых ворот три угла, у каждого имя на трёх языках; канонические сверки', () => {
  assert.equal(Object.keys(CROSSES).length, 64);
  for (const g of ORDER) for (const a of ['right', 'juxta', 'left']) {
    for (const l of ['ru', 'ua', 'en']) assert.ok(crossName(HD[l], crossKey(g, a), a), `${l}: ворота ${g}, ${a}`);
  }
  // правый угол: одно имя на 4 ворот креста
  for (const g of [1, 2, 7, 13]) assert.equal(crossKey(g, 'right'), 'Sphinx');
  for (const g of [10, 15, 25, 46]) assert.equal(crossKey(g, 'right'), 'VesselOfLove');
  for (const g of [6, 11, 12, 36]) assert.equal(crossKey(g, 'right'), 'Eden');
  assert.equal(crossName(HD.en, crossKey(13, 'right'), 'right'), 'Right Angle Cross of the Sphinx');
  // Ра Уру Ху (Солнце 51, профиль 5/1) — Левый угловой крест Горна
  const r = chart(A, zonedToUtc('1948-04-09', '00:14', 'America/Montreal'));
  assert.equal(r.cross[0], 51);
  assert.equal(crossName(HD.ru, crossKey(r.cross[0], r.angle), r.angle), 'Левый угловой крест Горна');
});

test('HD: угол креста по профилю, число областей определённости', () => {
  assert.equal(angleOf('4/1'), 'juxta');
  assert.equal(angleOf('5/1'), 'left');
  assert.equal(angleOf('6/3'), 'left');
  assert.equal(angleOf('2/4'), 'right');
  assert.equal(areas([], {}), 0);
  assert.equal(areas(['Throat', 'G', 'Sacral', 'Root'], { Throat: ['G'], G: ['Throat'], Sacral: ['Root'], Root: ['Sacral'] }), 2);
});

test('Матрица: 22 аркана со всеми полями, точки, возрасты, предназначения, чакры', () => {
  const T = MX.ru;
  for (let n = 1; n <= 22; n += 1) {
    for (const f of ['name', 'essence', 'plus', 'minus', 'love', 'money', 'health', 'howTo']) assert.ok(T.arcana[n]?.[f], `аркан ${n}: ${f}`);
  }
  const r = matrix('1990-05-17');
  for (const k of Object.keys(r.purposes)) assert.ok(T.purposes[k], k);
  for (const row of r.health.rows) assert.ok(T.chakras[row.id], row.id);
  assert.equal(T.ages.length, 8);
  assert.match(T.points.D[1], /Кармическ/);
});

test('Матрица: 22 программы хвоста «Г2-Г1-Г» сходятся со счётом (Г2 кратно 3, Г1 = Г2 + Г)', () => {
  const keys = Object.keys(MX.ru.tails);
  assert.equal(keys.length, 22);
  for (const k of keys) {
    const [g2, g1, g] = k.split('-').map(Number);
    assert.equal(g2 % 3, 0, `${k}: первое кратно трём`);
    assert.equal(r22(g2 + g), g1, `${k}: второе = первое + третье`);
  }
  // настоящая дата даёт хвост в том же порядке: Г2 = Г + Д, Г1 = Г + Г2
  const r = matrix('1990-05-17');
  assert.equal(r.rays.d.x2, r22(r.points.D + r.points.E));
  assert.equal(r.rays.d.x1, r22(r.points.D + r.rays.d.x2));
});

test('Пифагор: текст для любого числа цифр 0…8, все 8 линий по ключам, уровни линий', () => {
  for (const l of ['ru', 'ua', 'en']) {
    for (let d = 1; d <= 9; d += 1) for (let n = 0; n <= 8; n += 1) assert.ok(countText(PY[l], d, n), `${l} ${d}×${n}`);
    for (const [, , id] of LINES) assert.equal(PY[l].lines[id]?.levels.length, 4, `${l} ${id}`);
  }
  assert.match(countText(PY.ru, 1, 3), /Золотая середина/);
  assert.deepEqual([0, 2, 3, 4, 5, 6, 7, 12].map(lineBand), [0, 0, 1, 1, 2, 2, 3, 3]);
});

test('экран: подписи всех ролей на трёх языках', () => {
  for (const l of ['ru', 'ua', 'en']) for (const k of ROLES) assert.ok(SCR[l].roles[k] && SCR[l].groups[k] && SCR[l].with[k], `${l} ${k}`);
});

// Тексты по местам матрицы (229): у каждой ячейки три языка с одинаковыми ключами и текст для всех 22 чисел
import { PLACES } from '../js/charts/matrix/places/index.js';
test('Матрица, места: хвост, работа, центр, верх, деньги, полное описание — 22 числа, ru / ua / en одинаковы', () => {
  for (const [name, sets] of Object.entries(PLACES)) {
    sameKeys(sets, `место ${name}`);
    for (let n = 1; n <= 22; n++) assert.ok(sets.ru.text[n], `${name}: нет числа ${n}`);
  }
});
