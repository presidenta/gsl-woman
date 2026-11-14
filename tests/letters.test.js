// Письмо себе в будущее (владелец 14.11.2026): через 1 / 5 / 10 лет или своё число, не больше трёх запечатанных,
// запечатано до дня открытия; тексты положительными словами.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openAtFor, isSealed, daysLeft, canWrite, compose, arrived, MAX_SEALED, ownBox } from '../js/letters/letters.js';
import { LT } from '../js/letters/texts.js';
import { COLLECTIONS } from '../js/sync/sync.js';

const strings = (v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
const NEGATIVE = /(^|[^а-яёА-ЯЁ])(не|нет|ни|без)(?=[^а-яёА-ЯЁ]|$)/i;

test('день открытия: через N лет в тот же день; 29 февраля — 28-го', () => {
  assert.equal(openAtFor(1, new Date(2026, 10, 14)), '2027-11-14');
  assert.equal(openAtFor(10, new Date(2026, 10, 14)), '2036-11-14');
  assert.equal(openAtFor(1, new Date(2028, 1, 29)), '2029-02-28');
  assert.equal(openAtFor(500, new Date(2026, 0, 1)), '2076-01-01', 'не дальше 50 лет');
});

test('запечатано до дня открытия, потом — «пришло письмо»; запечатанных не больше трёх', () => {
  const now = new Date(2026, 10, 14, 10);
  const list = [];
  for (let i = 0; i < MAX_SEALED; i++) {
    const l = compose(list, { text: `письмо ${i}`, years: 1 + i }, now);
    assert.ok(l);
    list.push(l);
  }
  assert.equal(canWrite(list, now), false);
  assert.equal(compose(list, { text: 'четвёртое', years: 1 }, now), null);
  assert.equal(compose([], { text: '   ', years: 1 }, now), null, 'пустое — нет');
  assert.ok(isSealed(list[0], now));
  assert.equal(daysLeft(list[0], now), 365);
  const later = new Date(2027, 10, 14, 9);
  assert.equal(isSealed(list[0], later), false);
  assert.deepEqual(arrived(list, later).map((l) => l.text), ['письмо 0']);
  assert.equal(canWrite(list, later), true, 'одно открылось — можно новое');
});

test('ящик взрослого и синхронизация: письма едут на сервер, как цели', () => {
  const l = compose([], { text: 'Через год я хочу…', years: 5 });
  ownBox.save(l);
  assert.equal(ownBox.list()[0].id, l.id);
  ownBox.remove(l.id);
  assert.equal(ownBox.list().length, 0);
  assert.ok(COLLECTIONS.some((c) => c.key === 'letters' && c.kind === 'letter' && c.type === 'list'));
});

test('тексты писем — положительными словами', () => {
  for (const s of strings(LT)) assert.doesNotMatch(s, NEGATIVE, s);
});
