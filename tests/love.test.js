// Пять языков любви и я-сообщения (владелец, 12.11.2026).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fixture from './fixtures/program.js';
import { _use } from '../js/program/source.js';
import { dayPlan } from '../js/program/index.js';
import { choose, choices, score, ideaFor, myLanguage, pickFor } from '../js/love/love.js';
import { clearAll } from '../js/core/store.js';

beforeEach(() => {
  clearAll();
  _use(fixture);
});

test('тест: побеждает язык с большим числом ответов, при равенстве — по порядку', () => {
  assert.equal(score(['time', 'touch', 'time', 'words'])[0].kind, 'time');
  assert.equal(score(['touch', 'words'])[0].kind, 'words');
  assert.equal(score([])[0].count, 0);
});

test('выбор хранится, чужие значения отбрасываются', () => {
  choose('him', 'gifts');
  choose('me', 'нечто');
  assert.deepEqual(choices(), { him: 'gifts', me: null, child: null });
});

test('дело дня: язык выбран — каждый день своё, по кругу; не выбран — null', () => {
  assert.equal(ideaFor('him', 1, 'ru'), null);
  choose('him', 'time');
  const a = ideaFor('him', 1, 'ru');
  const b = ideaFor('him', 2, 'ru');
  assert.equal(a.kind, 'time');
  assert.notEqual(a.text, b.text);
  assert.equal(ideaFor('him', 8, 'ru').text, a.text);
  assert.equal(pickFor([], 3), '');
});

test('свой язык: как сказать и чем поблагодарить', () => {
  assert.equal(myLanguage(4, 'ru'), null);
  choose('me', 'touch');
  const m = myLanguage(4, 'ru');
  assert.equal(m.tell, 'Скажи touch');
  assert.match(m.thanks, /^touch спасибо/);
});

test('я-сообщение — только дни 4, 5, 6, по одному примеру на день', () => {
  const kinds = [1, 2, 3, 4, 5, 6, 7].map((d) => dayPlan(d, 'ru').imsg?.title || null);
  assert.deepEqual(kinds, [null, null, null, 'Ситуация 1.1', 'Ситуация 1.2', 'Ситуация 1.3', null]);
  assert.equal(dayPlan(7 * 23 + 5, 'ru').imsg.title, 'Ситуация 24.2');
});
