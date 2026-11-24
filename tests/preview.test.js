// Листание дней: администратор — вся программа; человек — 7 прошедших дней, полоска в «Можно наверстать».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { write, remove } from '../js/core/store.js';
import { dayFor, isAdmin, bounds, canOpen } from '../js/preview/preview.js';

test('участница: нет полоски, день — настоящий', () => {
  write('account', { token: 't', displayName: 'Анна', role: 'member' });
  assert.equal(isAdmin(), false);
  assert.equal(dayFor(12), 12);
  remove('account');
});

test('администратор: пока не листал — тоже настоящий день', () => {
  write('account', { token: 't', displayName: 'Владимир', role: 'admin' });
  assert.equal(isAdmin(), true);
  assert.equal(dayFor(5), 5);
  remove('account');
});

test('старая сессия без роли — участница', () => {
  write('account', { token: 't', displayName: 'Анна' });
  assert.equal(isAdmin(), false);
  remove('account');
});

// Человек листает 7 прошедших дней (владелец 24.11.2026)
test('человек: окно — 7 прошедших дней, сдвигается каждый день', () => {
  write('account', { token: 't', displayName: 'Анна', role: 'member' });
  assert.deepEqual(bounds(12), [5, 12]);
  assert.deepEqual(bounds(3), [1, 3]);
  assert.equal(canOpen(5, 12), true);
  assert.equal(canOpen(4, 12), false);
  assert.equal(canOpen(12, 12), false);
  assert.equal(canOpen(13, 12), false);
  remove('account');
});

test('администратор: вся программа', () => {
  write('account', { token: 't', displayName: 'Владимир', role: 'admin' });
  assert.equal(bounds(12)[0], 1);
  assert.ok(bounds(12)[1] > 100);
  remove('account');
});

test('полоска: у администратора — наверху, у человека — своя, для карточки «Можно наверстать»', async () => {
  const { bar, pastBar } = await import('../js/preview/preview.js');
  write('account', { token: 't', displayName: 'Анна', role: 'member' });
  assert.equal(bar(10), null);
  assert.equal(pastBar(1), null);
  remove('account');
  write('account', { token: 't', displayName: 'Владимир', role: 'admin' });
  assert.equal(pastBar(10), null);
  remove('account');
});
