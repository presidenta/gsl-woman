// Ритуал нежности и два языка любви (владелец 25.11.2026).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fixture from './fixtures/program.js';
import { _use } from '../js/program/source.js';
import { clearAll } from '../js/core/store.js';
import * as settings from '../js/settings/settings.js';
import { ritualFor, ritualDay, touchDeed, tenderOf, tenderDone } from '../js/tender/tender.js';
import { choose, chooseBoth, choices, ideaFor, groupIdeas, myLanguage, setCount, setPerson, dayKind } from '../js/love/love.js';
import { autoTwo, TWO_GAP } from '../js/love-quiz/quiz.js';
import { applyTask } from '../js/profile/profile.js';
import * as deeds from '../js/score/deeds.js';

beforeEach(() => {
  clearAll();
  _use(fixture);
});

test('ритуал недели: шесть по кругу; у «встречаемся» и «в поиске» — свой', () => {
  const pack = tenderOf('ru');
  assert.equal(ritualFor(pack, 1, 0, 'married').title, 'Ритуал 1');
  assert.equal(ritualFor(pack, 6, 0, 'together').title, 'Ритуал 6');
  assert.equal(ritualFor(pack, 7, 0, 'married').title, 'Ритуал 1', 'седьмая неделя — снова первый');
  assert.equal(ritualFor(pack, 1, 3, 'married').title, 'Ритуал 4', 'сдвиг на три — другой ритуал');
  assert.equal(ritualFor(pack, 1, 0, 'dating').title, 'Встреча');
  assert.equal(ritualFor(pack, 1, 0, 'single').title, 'Близкие');
  assert.equal(ritualFor(null, 1), null);
});

test('день ритуала — выходной, а в неделе без выходного — седьмой', () => {
  assert.equal(ritualDay({ call: 7, rest: 6 }), 6);
  assert.equal(ritualDay({ call: 6, rest: 7 }), 7);
  assert.equal(ritualDay({ call: 7, rest: null }), 7);
});

test('«Получилось» — балл ритуала в тот день, когда отмечено', () => {
  const ctx = { todayIso: '2026-11-29' };
  assert.equal(tenderDone(ctx), false);
  deeds.toggle(ctx.todayIso, 'tender');
  assert.equal(tenderDone(ctx), true);
});

test('язык партнёра «Прикосновения» — на 4-й день дело дня в «Пяти языках любви» — ритуал прикосновений', () => {
  assert.equal(touchDeed(5, 'ru'), null);
  assert.equal(touchDeed(4, 'ru').text, 'Ритуал 4 дело');
  choose('him', 'touch');
  const d4 = ideaFor('him', 4, 'ru');
  assert.equal(d4.kind, 'touch');
  assert.equal(d4.name, 'ru ритуал прикосновений');
  assert.equal(d4.text, 'Ритуал 4 дело');
  assert.match(ideaFor('him', 11, 'ru').text, /Ритуал 5 дело/, 'вторая неделя — следующий ритуал');
  assert.match(ideaFor('him', 5, 'ru').text, /^touch для него/, 'в остальные дни — обычное дело языка');
  // второй язык «Прикосновения» — тоже
  chooseBoth('him', 'words', 'touch');
  assert.equal(ideaFor('him', 4, 'ru').text, 'Ритуал 4 дело');
  // без прикосновений — обычное дело
  chooseBoth('him', 'words', 'time');
  assert.match(ideaFor('him', 4, 'ru').text, /для него/);
});

test('два языка: хранятся у каждого, второй — только при главном и отличный от него', () => {
  chooseBoth('him', 'time', 'gifts');
  chooseBoth('me', 'words', 'words');
  let c = choices();
  assert.equal(c.him2, 'gifts');
  assert.equal(c.me2, null, 'второй совпал с главным — второго нет');
  choose('him', 'gifts');
  assert.equal(choices().him2, null, 'новый главный совпал со вторым — второй снят');
  choose('me', 'touch', true);
  assert.equal(choices().me2, 'touch');
  setCount('children', 1);
  setPerson('children', 0, { kind2: 'time' });
  assert.equal(choices().children[0].kind2, null, 'второй без главного — нет');
  setPerson('children', 0, { kind: 'touch', kind2: 'time' });
  assert.deepEqual([choices().children[0].kind, choices().children[0].kind2], ['touch', 'time']);
  c = choices();
  assert.equal(c.me, 'words');
});

test('два языка: дела дня идут по очереди — нечётный день главный, чётный второй', () => {
  assert.equal(dayKind('time', 'gifts', 1), 'time');
  assert.equal(dayKind('time', 'gifts', 2), 'gifts');
  assert.equal(dayKind('time', null, 2), 'time');
  chooseBoth('him', 'time', 'gifts');
  assert.equal(ideaFor('him', 1, 'ru').kind, 'time');
  assert.equal(ideaFor('him', 2, 'ru').kind, 'gifts');
  setCount('family', 1);
  setPerson('family', 0, { name: 'Мама', kind: 'words', kind2: 'service' });
  assert.equal(groupIdeas('family', 1, 'ru')[0].kind, 'words');
  assert.equal(groupIdeas('family', 2, 'ru')[0].kind, 'service');
  chooseBoth('me', 'touch', 'time');
  assert.equal(myLanguage(1, 'ru').kind, 'touch');
  assert.equal(myLanguage(2, 'ru').kind, 'time');
});

test('анкета ставит два языка сама, когда первые два разделяет 10% и меньше', () => {
  const r = (a, b) => ({ ranking: [{ pct: a }, { pct: b }, { pct: 0 }, { pct: 0 }, { pct: 0 }] });
  assert.equal(TWO_GAP, 10);
  assert.equal(autoTwo(r(50, 45)), true);
  assert.equal(autoTwo(r(50, 40)), true);
  assert.equal(autoTwo(r(97, 40)), false);
  assert.equal(autoTwo(r(51, 40)), false);
});

test('фразы «встречаемся»: свои — только свои; «живём вместе» — свои и общие', () => {
  const task = { title: 'Т', text: 'общий', say: [{ label: 'Ей', text: 'общая' }], variants: {
    dating: { text: 'встреча', say: [{ label: 'Ей', text: 'своя' }] },
    together: { text: 'вместе', say: [{ label: 'Ей', text: 'своя вместе' }] },
  } };
  assert.deepEqual(applyTask(task, 'dating').say.map((s) => s.text), ['своя']);
  assert.deepEqual(applyTask(task, 'together').say.map((s) => s.text), ['своя вместе', 'общая']);
  assert.deepEqual(applyTask({ ...task, variants: { dating: { text: 'встреча' } } }, 'dating').say.map((s) => s.text), ['общая'], 'своих нет — общие');
  settings.update({ profile: 'married' });
});
