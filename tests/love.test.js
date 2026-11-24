// Пять языков любви и я-сообщения (владелец, 12.11.2026).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fixture from './fixtures/program.js';
import { _use } from '../js/program/source.js';
import { dayPlan } from '../js/program/index.js';
import { choose, choices, ideaFor, myLanguage, pickFor, setCount, setPerson, groupIdeas } from '../js/love/love.js';
import { write } from '../js/core/store.js';
import * as settings from '../js/settings/settings.js';
import { clearAll } from '../js/core/store.js';

beforeEach(() => {
  clearAll();
  _use(fixture);
});

test('выбор хранится, чужие значения отбрасываются', () => {
  choose('him', 'gifts');
  choose('me', 'нечто');
  assert.deepEqual(choices(), { him: 'gifts', me: null, children: [], family: [], results: { him: null, me: null } });
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

test('свой язык по профилю (17.11.2026): «в поиске» и «встречаемся» — свои фразы, остальные — основные', () => {
  const copy = structuredClone(fixture);
  for (const lang of Object.keys(copy.langs || {})) {
    const k = copy.langs[lang].love?.kinds?.touch;
    if (k) k.by = { single: { tell: 'Маме о touch', thanks: ['Спасибо маме 1', 'Спасибо маме 2', 'Спасибо маме 3'] } };
  }
  _use(copy);
  choose('me', 'touch');
  assert.equal(myLanguage(4, 'ru').tell, 'Скажи touch', 'замужем — основная фраза');
  settings.update({ profile: 'single' });
  assert.equal(myLanguage(4, 'ru').tell, 'Маме о touch');
  assert.match(myLanguage(4, 'ru').thanks, /^Спасибо маме/);
  settings.update({ profile: 'dating' });
  assert.equal(myLanguage(4, 'ru').tell, 'Скажи touch', 'своих фраз у профиля нет — основные');
});

test('я-сообщение — каждый день: дни 4–6 к заданиям недели, дни 1–3 — повторение прошлой, день 7 — одна из недели', () => {
  const first = [1, 2, 3, 4, 5, 6, 7].map((d) => dayPlan(d, 'ru').imsg?.title || null);
  assert.deepEqual(first, ['Ситуация 1.1', 'Ситуация 1.2', 'Ситуация 1.3', 'Ситуация 1.1', 'Ситуация 1.2', 'Ситуация 1.3', 'Ситуация 1.1']);
  const second = [8, 9, 10, 11, 12, 13, 14].map((d) => dayPlan(d, 'ru').imsg?.title || null);
  assert.deepEqual(second, ['Ситуация 1.1', 'Ситуация 1.2', 'Ситуация 1.3', 'Ситуация 2.1', 'Ситуация 2.2', 'Ситуация 2.3', 'Ситуация 2.2']);
  assert.equal(dayPlan(7 * 23 + 5, 'ru').imsg.title, 'Ситуация 24.2');
});

test('дети: сколько детей — столько строк; у каждого имя и свой язык; лишние убираются с конца', () => {
  setCount('children', 3);
  assert.equal(choices().children.length, 3);
  setPerson('children', 0, { name: '  Маша  ', kind: 'touch' });
  setPerson('children', 1, { kind: 'time' });
  setPerson('children', 2, { name: 'Петя', kind: 'нечто' });
  assert.deepEqual(choices().children, [{ name: 'Маша', kind: 'touch', result: null }, { name: '', kind: 'time', result: null }, { name: 'Петя', kind: null, result: null }]);
  setCount('children', 2);
  assert.deepEqual(choices().children.map((c) => c.name), ['Маша', '']);
  setCount('children', 99);
  assert.equal(choices().children.length, 8, 'больше восьми строк не бывает');
});

test('дети: дело дня у каждого ребёнка с языком; у двоих с одним языком — разные дела', () => {
  setCount('children', 3);
  setPerson('children', 0, { name: 'Маша', kind: 'touch' });
  setPerson('children', 1, { name: 'Ваня', kind: 'touch' });
  const ideas = groupIdeas('children', 5, 'ru');
  assert.deepEqual(ideas.map((i) => i.person.name), ['Маша', 'Ваня'], 'ребёнок без языка — без напоминания');
  assert.notEqual(ideas[0].text, ideas[1].text);
  assert.match(ideas[0].text, /^touch ребёнку/);
});

test('дети: прежний один ребёнок (поле child) становится первым', () => {
  write('love', { him: 'time', me: null, child: 'gifts' });
  assert.deepEqual(choices().children, [{ name: '', kind: 'gifts' }]);
});

test('родные — отдельный раздел, как дети: свои строки, свои дела для взрослых', () => {
  setCount('children', 1);
  setPerson('children', 0, { name: 'Маша', kind: 'touch' });
  setCount('family', 2);
  setPerson('family', 0, { name: 'Папа', kind: 'service' });
  setPerson('family', 1, { name: 'Сестра Клава', kind: 'words' });
  assert.deepEqual(choices().family, [{ name: 'Папа', kind: 'service', result: null }, { name: 'Сестра Клава', kind: 'words', result: null }]);
  assert.equal(choices().children.length, 1, 'родные не трогают детей');
  const ideas = groupIdeas('family', 3, 'ru');
  assert.deepEqual(ideas.map((i) => i.person.name), ['Папа', 'Сестра Клава']);
  assert.match(ideas[0].text, /^service родным/);
});

// Владелец 24.11.2026: «результат должен сохраняться открытым… свой результат, детей, родителей — в процентах»
test('итог анкеты хранится у каждого: свой, мужчины, ребёнка, родных; новый заменяет прошлый; мусор не принимается', async () => {
  const { resultOf, setResult } = await import('../js/love/love.js');
  const ranking = [
    { k: 1, kind: 'words', n: 32, pct: 48 }, { k: 2, kind: 'time', n: 20, pct: 30 }, { k: 4, kind: 'service', n: 8, pct: 12 },
    { k: 3, kind: 'gifts', n: 4, pct: 6 }, { k: 5, kind: 'touch', n: 2, pct: 3 },
  ];
  const r = { mode: 'self', group: null, ranking, answered: 22, total: 22, max: 66, shape: 'dual', at: '2026-11-24T10:00:00.000Z' };
  setResult('me', undefined, r);
  assert.deepEqual(resultOf('me').ranking.map((x) => x.pct), [48, 30, 12, 6, 3]);
  setCount('children', 2);
  setResult('children', 1, { ...r, mode: 'observe', group: 'teen' });
  assert.equal(resultOf('children', 1).group, 'teen');
  assert.equal(resultOf('children', 0), null);
  setPerson('children', 1, { name: 'Ваня' });
  assert.equal(resultOf('children', 1).shape, 'dual', 'имя меняется — итог остаётся');
  setResult('me', undefined, { ...r, ranking: [...ranking].reverse() });
  assert.equal(resultOf('me').ranking[0].kind, 'touch', 'новый итог заменяет прошлый');
  setResult('him', undefined, { ranking: [{ k: 9 }] });
  assert.equal(resultOf('him'), null, 'испорченный итог не сохраняется');
});
