// Human Design (js/charts/hd/): 36 настоящих каналов, ворота по кругу, местное время → UTC, известная карта.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../js/charts/hd/astronomy.js';
import { CHANNELS, gateOf, zonedToUtc, chart, composite } from '../js/charts/hd/calc.js';
import { pairPythagoras } from '../js/charts/pythagoras/calc.js';

test('каналов 36, без повторов; есть 57–34 и 57–10, нет 10–25', () => {
  const ids = CHANNELS.map(([a, b]) => [a, b].sort((x, y) => x - y).join('-'));
  assert.equal(new Set(ids).size, 36);
  assert.ok(ids.includes('34-57') && ids.includes('10-57'));
  assert.ok(!ids.includes('10-25'));
});

test('круг ворот: 2° Водолея — 41.1; перед ним — 60.6', () => {
  assert.deepEqual(gateOf(302.01), { gate: 41, line: 1 });
  assert.deepEqual(gateOf(301.99), { gate: 60, line: 6 });
});

test('местное время → UTC: Киев летом +3, зимой +2', () => {
  assert.equal(zonedToUtc('1990-07-01', '12:00', 'Europe/Kyiv').toISOString(), '1990-07-01T09:00:00.000Z');
  assert.equal(zonedToUtc('2020-01-15', '12:00', 'Europe/Kyiv').toISOString(), '2020-01-15T10:00:00.000Z');
});

test('Ра Уру Ху (09.04.1948, 00:14, Монреаль): Манифестор, профиль 5/1', () => {
  const r = chart(A, zonedToUtc('1948-04-09', '00:14', 'America/Montreal'));
  assert.equal(r.type, 'Manifestor');
  assert.equal(r.profile, '5/1');
});

test('пара: квадрат — цифры складываются; композит — виды каналов и тип', () => {
  assert.equal(pairPythagoras('1990-05-17', '1990-05-17').counts[1], 4);
  const a = chart(A, zonedToUtc('1948-04-09', '00:14', 'America/Montreal'));
  const c = composite(a, a);
  assert.ok(c.channels.every((x) => x.kind === 'friend'), 'сам с собой — только дружба');
  assert.equal(c.type, a.type);
});
