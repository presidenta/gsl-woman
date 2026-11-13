// Две части одного приложения GSL (W+M)⁺ (владелец, 13.11.2026): часть по полу из сессии, свои адреса, тексты,
// программа и данные на телефоне.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { write, clearAll } from '../js/core/store.js';
import * as side from '../js/side/side.js';
import * as program from '../js/program/source.js';
import { setLang, t } from '../js/core/i18n.js';
import * as sync from '../js/sync/sync.js';
import * as water from '../js/water/water.js';
import * as settings from '../js/settings/settings.js';
import * as waterLog from '../js/water/water-log.js';
import * as morningLog from '../js/journal/morning-log.js';
import { habits } from '../js/insights/habits.js';
import { periodRange } from '../js/insights/insights.js';
import { dateOfDay } from '../js/core/dates.js';

beforeEach(() => {
  clearAll();
  side._use(null);
  setLang('ru');
});

test('часть по сессии: пол — своя часть; сессия старше GSL (W+M)⁺ — женская; пол пустой — нужен выбор', () => {
  assert.equal(side.ofSession({ userId: 'u', gender: 'male' }), 'man');
  assert.equal(side.ofSession({ userId: 'u', gender: 'female' }), 'woman');
  assert.equal(side.ofSession({ userId: 'u' }), 'woman', 'прежние участницы — без выбора');
  assert.equal(side.ofSession({ userId: 'u', gender: null }), null);
  assert.equal(side.needsChoice({ userId: 'u', gender: null }), true);
  assert.equal(side.needsChoice({ userId: 'u' }), false);
  assert.equal(side.needsChoice(null), false, 'без входа — сначала вход, а не выбор');
});

test('своя часть: адрес на сервере, тексты и ключ данных на телефоне', () => {
  assert.equal(side.follow({ userId: 'u7', gender: 'male' }), true);
  assert.equal(side.get(), 'man');
  assert.equal(side.api(), '/api/men');
  assert.equal(side.ownerKey('u7'), 'u7:man');
  assert.equal(t('app.name'), 'GSL Man+');
  assert.equal(t('entry.reaction'), 'Реакция женщины');

  assert.equal(side.follow({ userId: 'u7', gender: 'female' }), true);
  assert.equal(side.api(), '/api/woman');
  assert.equal(side.ownerKey('u7'), 'u7', 'у женской части ключ прежний — данные участниц на месте');
  assert.equal(t('app.name'), 'GSL Woman+');
  assert.equal(side.follow({ userId: 'u7', gender: 'female' }), false, 'та же часть — без перемен');
});

test('программа другой части за свою не считается; прежняя копия без отметки — женская', () => {
  side._use('woman');
  program._use({ version: 'v1', langs: { ru: { months: [], weeks: [] } } });
  assert.equal(program.loaded(), true);
  side._use('man');
  assert.equal(program.loaded(), false, 'мужчине — своя программа');
  assert.equal(program.langData('ru'), null);
  program._use({ version: 'v2', side: 'man', langs: { ru: { months: [], weeks: [] } } });
  assert.equal(program.loaded(), true);
});

test('синхронизация мужской части — на /api/men, данные женской части того же кабинета на телефоне стираются', async () => {
  const calls = [];
  sync._useRequest(async (path, { body } = {}) => {
    calls.push(path);
    if (path.endsWith('/photos')) return [];
    return { cursor: body.cursor, changes: [], more: false, rejected: [] };
  });
  write('account', { token: 't', userId: 'u1', gender: 'female' });
  side.follow({ userId: 'u1', gender: 'female' });
  write('goals', [{ id: 'g1', text: 'женская цель', createdAt: '2026-11-01T10:00:00.000Z' }]);
  await sync.now();
  assert.ok(calls.includes('/api/woman/sync'));

  calls.length = 0;
  write('account', { token: 't', userId: 'u1', gender: 'male' });
  side.follow({ userId: 'u1', gender: 'male' });
  await sync.now();
  assert.ok(calls.includes('/api/men/sync'), 'мужская часть ходит на свой адрес');
  assert.ok(!calls.includes('/api/woman/sync'));
  const { read } = await import('../js/core/store.js');
  assert.deepEqual(read('goals', []), [], 'женская цель на телефоне мужской части стёрта (она на сервере женской)');
});

test('пол ещё не выбран — синхронизация ждёт', async () => {
  const calls = [];
  sync._useRequest(async (path) => { calls.push(path); return { cursor: 0, changes: [], more: false, rejected: [] }; });
  write('account', { token: 't', userId: 'u2', gender: null });
  await sync.now();
  assert.deepEqual(calls, []);
});

test('стакан тёплой воды: человек сам кладёт составляющие, выбор хранится в настройках, вода меняет цвет', () => {
  assert.deepEqual(water.chosen(), [], 'сначала — просто тёплая вода');
  assert.equal(water.label(), 'тёплая вода');
  const plain = water.waterColor([]);
  water.setItem('turmeric', true);
  water.setItem('lemon', true);
  assert.deepEqual(water.chosen(), ['lemon', 'turmeric'], 'порядок — как в столбике');
  assert.deepEqual(settings.get().water, ['lemon', 'turmeric'], 'выбор — в настройках: синхронизируется и остаётся наутро');
  assert.equal(water.label(), 'тёплая вода: лимон, куркума');
  assert.notDeepEqual(water.waterColor(water.chosen()), plain, 'куркума и лимон красят воду');
  water.setItem('lemon', false);
  assert.deepEqual(water.chosen(), ['turmeric']);
  assert.deepEqual(water.chosen(['чужое', 'mint']), ['mint'], 'незнакомое отбрасывается');
});

test('золотая смесь кладётся разом: мёд, куркума и перец; гвоздика — восьмая составляющая', () => {
  water.setItem('lemon', true);
  water.setItems(water.GOLDEN, true);
  assert.deepEqual(water.chosen(), ['lemon', 'honey', 'turmeric', 'pepper']);
  water.setItem('clove', true);
  assert.deepEqual(water.chosen(), ['lemon', 'honey', 'turmeric', 'pepper', 'clove']);
  water.setItems(['pepper', 'чужое'], false);
  assert.deepEqual(water.chosen(), ['lemon', 'honey', 'turmeric', 'clove']);
});

test('итоги утра: стакан выпит — отметка человека, минута — своя; серия подряд идёт со вчера, пока сегодня впереди', () => {
  const start = '2026-11-01';
  for (const d of [1, 2, 4, 5, 6]) waterLog.setDone(dateOfDay(start, d), true);
  for (const d of [2, 3]) morningLog.markDone(dateOfDay(start, d));
  assert.equal(waterLog.isDone(dateOfDay(start, 4)), true);
  waterLog.setDone(dateOfDay(start, 4), false);
  assert.equal(waterLog.isDone(dateOfDay(start, 4)), false, 'отметку можно снять');
  waterLog.setDone(dateOfDay(start, 4), true);

  const s = habits({ from: 1, to: 7 }, 7, start);
  assert.equal(s.total, 7, 'неделя — до сегодняшнего дня включительно');
  assert.equal(s.water, 5);
  assert.equal(s.minute, 2);
  assert.equal(s.streak.water, 3, 'сегодня (7) ещё впереди — серия 4, 5, 6');
  assert.equal(s.streak.minute, 0);
  assert.equal(s.days[6].today, true);
  const early = habits({ from: 1, to: 7 }, 3, start);
  assert.equal(early.total, 3, 'будущие дни в счёт не входят');
  assert.equal(early.days.length, 7, 'но неделя видна целиком');
  assert.equal(early.days[5].future, true);
  assert.equal(early.days[5].water, false, 'день впереди — пустой, даже если отметка есть');
  assert.equal(habits({ from: 1, to: 84 }, 10, start).days.length, 10, 'длинный срок — до сегодня');
  assert.equal(habits({ from: 1, to: 7 }, 0, start).total, 0, 'до старта — пусто');
});

test('сроки итогов: месяц, 2 и 3 месяца — по месяцам программы, считая текущий', () => {
  assert.deepEqual(periodRange('week', 10), { from: 8, to: 14 });
  assert.deepEqual(periodRange('month', 60), { from: 57, to: 84 });
  assert.deepEqual(periodRange('two', 60), { from: 29, to: 84 });
  assert.deepEqual(periodRange('three', 60), { from: 1, to: 84 });
  assert.deepEqual(periodRange('three', 10), { from: 1, to: 28 }, 'в начале — с первого дня');
});

test('выпитый стакан синхронизируется: вид записи water', () => {
  assert.ok(sync.COLLECTIONS.some((c) => c.key === 'waterlog' && c.kind === 'water' && c.type === 'map'));
});
