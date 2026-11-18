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

// Дни доступа в календаре (владелец 18.11.2026): срок с сервера — красим до него; срока нет — пробные три недели.
test('срок с сервера: дни от сегодня до последнего открытого, осталось считается с сегодняшним', () => {
  access.remember('2026-11-25T00:00:00Z', now);
  const d = access.openDays('2026-11-18');
  assert.equal(d.kind, 'paid');
  assert.equal(d.from, '2026-11-18');
  assert.ok(d.to === '2026-11-24' || d.to === '2026-11-25', 'последний день — накануне даты срока (с поправкой на пояс)');
  assert.ok(d.left >= 7 && d.left <= 8);
});

test('срока нет — пробный режим: три недели от первого показа, потом «0 дней»; запоминается и забывается с выходом', () => {
  access.remember(null, now);
  const first = access.openDays('2026-11-18');
  assert.deepEqual([first.kind, first.from, first.to, first.left], ['trial', '2026-11-18', '2026-12-08', 21]);
  const later = access.openDays('2026-11-28');
  assert.deepEqual([later.from, later.to, later.left], ['2026-11-28', '2026-12-08', 11]);
  assert.equal(access.openDays('2026-12-20').left, 0);
  access.forget();
  assert.equal(access.openDays('2027-01-05').to, '2027-01-25');
});
