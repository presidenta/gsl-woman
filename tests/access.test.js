// Доступ к GSL Woman+ — как у «Кванта»: срок с сервера, телефон закрывается сам (владелец, 13.11.2026).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as access from '../js/access/access.js';
import { clearAll } from '../js/core/store.js';

const DAY = 86_400_000;
const now = Date.parse('2026-11-13T10:00:00Z');

beforeEach(() => clearAll());

test('сервер ещё ни разу не ответил — открыто (закрывать по догадке нельзя)', () => {
  assert.equal(access.isOpen(now), true);
});

test('бессрочно — открыто всегда, даже через годы и с переведёнными часами', () => {
  access.remember(null, now);
  assert.equal(access.isOpen(now + 3650 * DAY), true);
  assert.equal(access.isOpen(now - 365 * DAY), true);
  assert.equal(access.until(), null);
});

test('срок: до даты открыто, дата наступила — закрыто само, без сервера', () => {
  access.remember('2026-12-01T00:00:00Z', now);
  assert.equal(access.isOpen(now), true);
  assert.equal(access.isOpen(Date.parse('2026-11-30T23:59:00Z')), true);
  assert.equal(access.isOpen(Date.parse('2026-12-01T00:00:01Z')), false);
});

test('продлили — новая дата с сервера снова открывает', () => {
  access.remember('2026-11-01T00:00:00Z', now);
  assert.equal(access.isOpen(now), false);
  access.remember('2027-01-01T00:00:00Z', now);
  assert.equal(access.isOpen(now), true);
});

test('сервер сказал «закрыто» — закрыто сразу, пока не придёт новый срок', () => {
  access.remember(null, now);
  access.close();
  assert.equal(access.isOpen(now), false);
  access.remember(null, now);
  assert.equal(access.isOpen(now), true);
});

test('часы перевели назад больше чем на 12 часов — по дате больше не открываем', () => {
  access.remember('2026-12-01T00:00:00Z', now);
  assert.equal(access.isOpen(now + 5 * DAY), true);
  assert.equal(access.isOpen(now + 5 * DAY - 11 * 3_600_000), true, 'полсуток — допуск на пояс и правку часов');
  assert.equal(access.isOpen(now - 3 * DAY), false);
});

test('выход или другой человек — прежний срок забыт', () => {
  access.remember('2020-01-01T00:00:00Z', now);
  access.forget();
  assert.equal(access.isOpen(now), true);
});
