// Пять языков любви и я-сообщения (владелец, 12.11.2026).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fixture from './fixtures/program.js';
import { _use } from '../js/program/source.js';
import { dayPlan } from '../js/program/index.js';
import { choose, choices, score, ideaFor, myLanguage, pickFor, setChildCount, setChild, childIdeas } from '../js/love/love.js';
import { write } from '../js/core/store.js';
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
  assert.deepEqual(choices(), { him: 'gifts', me: null, children: [] });
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

test('дети: сколько детей — столько строк; у каждого имя и свой язык; лишние убираются с конца', () => {
  setChildCount(3);
  assert.equal(choices().children.length, 3);
  setChild(0, { name: '  Маша  ', kind: 'touch' });
  setChild(1, { kind: 'time' });
  setChild(2, { name: 'Петя', kind: 'нечто' });
  assert.deepEqual(choices().children, [{ name: 'Маша', kind: 'touch' }, { name: '', kind: 'time' }, { name: 'Петя', kind: null }]);
  setChildCount(2);
  assert.deepEqual(choices().children.map((c) => c.name), ['Маша', '']);
  setChildCount(99);
  assert.equal(choices().children.length, 8, 'больше восьми строк не бывает');
});

test('дети: дело дня у каждого ребёнка с языком; у двоих с одним языком — разные дела', () => {
  setChildCount(3);
  setChild(0, { name: 'Маша', kind: 'touch' });
  setChild(1, { name: 'Ваня', kind: 'touch' });
  const ideas = childIdeas(5, 'ru');
  assert.deepEqual(ideas.map((i) => i.child.name), ['Маша', 'Ваня'], 'ребёнок без языка — без напоминания');
  assert.notEqual(ideas[0].text, ideas[1].text);
  assert.match(ideas[0].text, /^touch ребёнку/);
});

test('дети: прежний один ребёнок (поле child) становится первым', () => {
  write('love', { him: 'time', me: null, child: 'gifts' });
  assert.deepEqual(choices().children, [{ name: '', kind: 'gifts' }]);
});
