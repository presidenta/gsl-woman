// «Интим 18⁺» (js/intim/, владелец 21.11.2026): карта желаний «Да / Может быть», совпадения пары, задание выходного,
// пункт в «Отношениях», балл «Сделали», надписи на трёх языках.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { write, clearAll } from '../js/core/store.js';
import * as map from '../js/intim/map.js';
import { weekendTask } from '../js/intim/content.js';
import { IT } from '../js/intim/texts.js';
import { ITEMS } from '../js/sections/sections.js';
import { dayScore } from '../js/score/score.js';
import { COLLECTIONS } from '../js/sync/sync.js';

const SHE = '11111111-1111-1111-1111-111111111111';
const HE = '22222222-2222-2222-2222-222222222222';

/** Связанная пара на телефоне «её»; партнёр уже отметил partnerMarks. */
function pairWith(partnerMarks = {}) {
  write('account', { token: 't', userId: SHE, gender: 'female', email: 'a@example.com', name: 'Анна' });
  write('circles', { userId: SHE, list: [{ id: 'c1', kind: 'pair', me: SHE, role: 'partner', version: 1, members: [{ id: SHE, role: 'partner', name: 'Анна', side: 'woman' }, { id: HE, role: 'partner', name: 'Андрей', side: 'man' }] }] });
  const items = {};
  for (const [key, mark] of Object.entries(partnerMarks)) {
    const id = `22222222.${key}`;
    items[`imark/${id}`] = { kind: 'imark', id, author: HE, data: { key, mark }, updatedAt: '2026-11-21T10:00:00Z', deletedAt: null };
  }
  write('circle-data', { c1: { cursor: 1, items, pending: {} } });
}

beforeEach(() => clearAll());

test('карта: только «Да» и «Может быть»; то же ещё раз — снять', () => {
  assert.deepEqual(map.MARKS, ['yes', 'maybe']);
  map.setMark('touch.kiss', 'yes');
  map.setMark('bond.hands', 'maybe');
  assert.deepEqual(map.myMarks(), { 'touch.kiss': 'yes', 'bond.hands': 'maybe' });
  map.setMark('touch.kiss', 'yes');
  assert.deepEqual(map.myMarks(), { 'bond.hands': 'maybe' });
});

test('без пары совпадений нет; своё желание живёт на телефоне', () => {
  assert.equal(map.pairNow(), null);
  map.setMark('touch.kiss', 'yes');
  assert.deepEqual(map.matches(), []);
  const w = map.addOwn('roles', 'Пират и пленница');
  assert.deepEqual(map.ownList('roles').map((x) => x.text), ['Пират и пленница']);
  map.setMark(`roles.${w.id}`, 'yes');
  map.removeOwn(w.id);
  assert.deepEqual(map.ownList('roles'), []);
  assert.equal(map.myMarks()[`roles.${w.id}`], undefined, 'отметка своего желания убирается вместе с ним');
});

test('в паре — только совпадения: оба «да» — первыми, «да» и «может быть» — совпало', () => {
  pairWith({ 'touch.kiss': 'yes', 'caress.ice': 'maybe', 'bond.gag': 'yes' });
  map.setMark('caress.ice', 'yes');
  map.setMark('touch.kiss', 'yes');
  map.setMark('toys.vibe', 'yes'); // у партнёра отметки нет — второму это не видно
  assert.deepEqual(map.matches(), [{ key: 'touch.kiss', match: 'both' }, { key: 'caress.ice', match: 'soft' }]);
});

test('с 161 «Ощущения» влились в «Ласки»: старые отметки sense.* и свои желания читаются как caress.*', async () => {
  write('intimmap', { marks: { 'sense.ice': 'yes', 'touch.kiss': 'maybe' }, own: [{ id: 'iw1', section: 'sense', text: 'Шёлковая лента' }] });
  assert.deepEqual(map.myMarks(), { 'caress.ice': 'yes', 'touch.kiss': 'maybe' });
  assert.deepEqual(map.ownList('caress').map((w) => w.text), ['Шёлковая лента']);
  assert.deepEqual(map.ownList('sense'), []);
  pairWith({ 'sense.ice': 'yes' }); // партнёр отметил ещё по старому ключу
  assert.deepEqual(map.matches(), [{ key: 'caress.ice', match: 'both' }]);
  const circles = await import('../js/circles/circles.js');
  circles.put('c1', 'imark', '11111111.sense.ice', { key: 'sense.ice', mark: 'yes' }); // моя старая отметка в контуре
  map.mirrorToPair();
  const mine = circles.items('c1', 'imark').filter((x) => x.author !== HE).map((x) => x.data.key).sort();
  assert.deepEqual(mine, ['caress.ice', 'touch.kiss'], 'в контуре — только новые ключи');
});

test('в паре отметка уходит в контур пары; отмеченное до пары переносится один раз', async () => {
  map.setMark('touch.kiss', 'yes'); // ещё без пары
  pairWith();
  const circles = await import('../js/circles/circles.js');
  assert.equal(circles.items('c1', 'imark').length, 0);
  map.mirrorToPair();
  assert.deepEqual(circles.items('c1', 'imark').map((x) => x.data), [{ key: 'touch.kiss', mark: 'yes' }]);
  map.mirrorToPair();
  assert.equal(circles.items('c1', 'imark').length, 1, 'повторный перенос ничего не пишет');
  map.setMark('touch.kiss', 'yes'); // снять
  assert.equal(circles.items('c1', 'imark').length, 0);
});

test('задание выходного: 24 по кругу; пункт «Отношений»; балл «Сделали»; карта — в копии на сервере', () => {
  const intim = { weekend: { tasks: Array.from({ length: 24 }, (_, i) => ({ title: `т${i + 1}` })) } };
  assert.equal(weekendTask(intim, 1).title, 'т1');
  assert.equal(weekendTask(intim, 24).title, 'т24');
  assert.equal(weekendTask(intim, 25).title, 'т1', 'неделя 25 — снова первое');
  assert.ok(ITEMS.rel.includes('intim'));
  assert.equal(dayScore('2026-11-21', 7, [], { intim: true }).parts.intim, 1);
  assert.ok(COLLECTIONS.some((c) => c.key === 'intimmap'));
});

test('надписи модуля — на трёх языках, одни ключи', () => {
  const keys = Object.keys(IT.ru).sort();
  for (const l of ['ua', 'en']) assert.deepEqual(Object.keys(IT[l]).sort(), keys, l);
});
