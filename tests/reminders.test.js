// Расписание напоминаний: три в день, тексты по виду дня, форма как у пушей «Кванта».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, complimentFor } from '../js/reminders/plan.js';
import { setLang } from '../js/core/i18n.js';
import fixture from './fixtures/program.js';
import { _use } from '../js/program/source.js';

_use(fixture);   // учебная программа: настоящая — на сервере

const base = {
  onboarded: true,
  lang: 'ru',
  name: 'Анна',
  startDate: '2026-11-11',
  times: { morning: '08:00', noon: '13:00', evening: '20:00' },
  showTaskInNotice: false,
};

test('три напоминания на день в форме push_plan: key, at, title, body, target', () => {
  setLang('ru');
  const items = buildPlan({ settings: base, entries: [], now: new Date(2026, 10, 11, 6, 0), days: 1 });
  assert.equal(items.length, 3);
  for (const it of items) assert.deepEqual(Object.keys(it).sort(), ['at', 'body', 'key', 'target', 'title']);
  assert.equal(items[0].key, 'gsl-woman:1:morning');
  assert.equal(new Date(items[0].at).getHours(), 8);
  assert.equal(items[0].title, 'Доброе утро, Анна');
});

test('по умолчанию текст задания на экран блокировки не попадает', () => {
  setLang('ru');
  const [morning] = buildPlan({ settings: base, entries: [], now: new Date(2026, 10, 11, 6, 0), days: 1 });
  assert.ok(!morning.body.includes('Задание 1.1'));
  const [open] = buildPlan({ settings: { ...base, showTaskInNotice: true }, entries: [], now: new Date(2026, 10, 11, 6, 0), days: 1 });
  assert.ok(open.body.includes('Задание 1.1'));
});

test('записала днём — обед и вечер не спрашивают «как успехи», а хвалят', () => {
  setLang('ru');
  const entries = [{ id: 'a', day: 1, kind: 'task', level: 'full' }];
  const items = buildPlan({ settings: base, entries, now: new Date(2026, 10, 11, 10, 0), days: 1 });
  assert.equal(items.length, 2); // утро уже прошло
  assert.equal(items[1].title, 'Ты сегодня молодец');
});

test('прошедшее не планируется, до старта и после финала — пусто', () => {
  setLang('ua');
  assert.equal(buildPlan({ settings: base, entries: [], now: new Date(2026, 10, 11, 21, 0), days: 1 }).length, 0);
  assert.equal(buildPlan({ settings: base, entries: [], now: new Date(2026, 9, 1, 6, 0), days: 1 }).length, 0);
  assert.equal(buildPlan({ settings: { ...base, startDate: null }, entries: [] }).length, 0);
});

test('седьмой день конца месяца напоминает и об отзыве', () => {
  setLang('ru');
  // День 28 = 11.11 + 27 дней = 08.12.2026
  const [morning] = buildPlan({ settings: base, entries: [], now: new Date(2026, 11, 8, 6, 0), days: 1 });
  assert.equal(morning.key, 'gsl-woman:28:morning');
  assert.match(morning.body, /отзыв/);
});

test('комплимент дня один весь день, назавтра другой', () => {
  setLang('en');
  assert.equal(complimentFor(5), complimentFor(5));
  assert.notEqual(complimentFor(5), complimentFor(6));
});
