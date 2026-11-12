// Просмотр дней: участница всегда видит настоящий день, полоска со стрелками — только у администратора.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { write, remove } from '../js/core/store.js';
import { dayFor, isAdmin } from '../js/preview/preview.js';

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
