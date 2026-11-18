// Программа: ритм недели и особые недели. Тексты и их сверку на трёх языках проверяет сервер
// (test/woman.test.js в planner) — здесь учебная программа того же устройства.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fixture from './fixtures/program.js';
import { _use, loaded, langData } from '../js/program/source.js';
import { dayPlan, weekPlan, outline } from '../js/program/index.js';
import { morningFor } from '../js/program/morning.js';
import { WEEKS, PROGRAM_DAYS } from '../js/config.js';

test('программа не пришла — дни и путь пустые, а не ошибка', () => {
  _use(null);
  assert.equal(loaded(), false);
  assert.equal(dayPlan(1, 'ru'), null);
  assert.equal(weekPlan(1, 'ru'), null);
  assert.deepEqual(outline('ru'), []);
});

test('нет языка — берётся основной', () => {
  _use(fixture);
  assert.equal(langData('de'), fixture.langs.ru);
});

test('ритм 3 + 2 + 1 + 1: задания, свободный поток, выходной, созвон (владелец 17.11.2026)', () => {
  _use(fixture);
  assert.equal(dayPlan(1, 'ru').kind, 'task');
  assert.equal(dayPlan(3, 'ru').kind, 'task');
  assert.equal(dayPlan(4, 'ru').kind, 'flow');
  assert.equal(dayPlan(5, 'ru').kind, 'flow');
  assert.equal(dayPlan(6, 'ru').kind, 'rest', 'созвон на 7-й день — выходной 6-й');
  assert.equal(dayPlan(7, 'ru').kind, 'call');
  assert.equal(dayPlan(1, 'ru').task.levels.full, 'сто');
});

test('неделя 5 (зеркало) — шесть дней заданий без свободного потока', () => {
  for (let d = 29; d <= 34; d++) assert.equal(dayPlan(d, 'ru').kind, 'task', `день ${d}`);
  assert.equal(dayPlan(35, 'ru').kind, 'call');
});

// Неделя 24 — три повтора главных навыков (сервер, владелец 18.11.2026), потом практика, выходной и итоговый созвон
test('последняя неделя — три повтора, практика и итоговый созвон', () => {
  for (let d = 162; d <= 164; d++) assert.equal(dayPlan(d, 'ua').kind, 'task');
  for (let d = 165; d <= 166; d++) assert.equal(dayPlan(d, 'ua').kind, 'flow');
  assert.equal(dayPlan(167, 'ua').kind, 'rest');
  const last = dayPlan(PROGRAM_DAYS, 'ua');
  assert.equal(last.kind, 'call');
  assert.equal(last.final, true);
  assert.equal(dayPlan(PROGRAM_DAYS + 1, 'ua'), null);
  assert.equal(dayPlan(0, 'ua'), null);
});

test('отзыв месяца — в конце каждой четвёртой недели', () => {
  const reviews = [];
  for (let w = 1; w <= WEEKS; w++) if (weekPlan(w, 'en').review) reviews.push(w * 7);
  assert.deepEqual(reviews, Array.from({ length: 12 }, (_, i) => (i + 1) * 28));
});

// Год по кругу (владелец 18.11.2026): 12 месяцев, месяц 7 — снова текст месяца 1, неделя 25 — снова неделя 1
test('квест на год: 12 месяцев по 4 недели, после 24-й недели — снова с первой', () => {
  const o = outline('ru');
  assert.equal(o.length, 12);
  assert.ok(o.every((m) => m.weeks.length === 4));
  assert.equal(o[6].title, o[0].title);
  assert.equal(o[6].weeks[0].week, 25);
  assert.deepEqual(weekPlan(25, 'ru').tasks.map((x) => x.title), weekPlan(1, 'ru').tasks.map((x) => x.title));
  assert.deepEqual(weekPlan(48, 'ru').tasks.map((x) => x.title), weekPlan(24, 'ru').tasks.map((x) => x.title));
  assert.equal(weekPlan(24, 'ru').final, false);
  assert.equal(weekPlan(48, 'ru').final, true);
});

test('утренняя минута: пятки каждый день, добавка по кругу', () => {
  const addons = [1, 2, 3, 4, 5].map((d) => morningFor(d).addon);
  assert.deepEqual(addons, [null, 'hum', 'voice', 'shake', null]);
  assert.ok([1, 50, 168].every((d) => morningFor(d).base === 'heels' && morningFor(d).seconds === 60));
});

test('весёлая фраза в шапке: у задания своя, в дни практики — по кругу, нет фраз — пусто (владелец 15.11.2026)', () => {
  const ru = fixture.langs.ru;
  const w1 = { ...ru.weeks[0], tasks: ru.weeks[0].tasks.map((t, i) => ({ ...t, teaser: `задание ${i + 1}` })), teasers: ['раз', 'два'] };
  _use({ ...fixture, langs: { ...fixture.langs, ru: { ...ru, weeks: [w1, ...ru.weeks.slice(1)] } } });
  assert.equal(dayPlan(1, 'ru').teaser, 'задание 1');
  assert.equal(dayPlan(3, 'ru').teaser, 'задание 3');
  assert.equal(dayPlan(4, 'ru').teaser, 'раз');
  assert.equal(dayPlan(5, 'ru').teaser, 'два');
  assert.equal(dayPlan(6, 'ru').teaser, '', 'выходной — без фразы');
  assert.equal(dayPlan(7, 'ru').teaser, '');
  assert.equal(dayPlan(8, 'ru').teaser, '', 'старая программа без фраз — шапка как раньше');
  _use(fixture);
});
