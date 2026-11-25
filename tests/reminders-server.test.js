// Напоминания с сервера (js/reminders/server.js): расписание на неделю, красная метка, пределы сервера.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serverItems } from '../js/reminders/server.js';
import { noticeTitle, MARK } from '../js/reminders/plan.js';
import { setLang } from '../js/core/i18n.js';
import fixture from './fixtures/program.js';
import { _use } from '../js/program/source.js';

_use(fixture);
setLang('ru');

const settings = {
  onboarded: true,
  lang: 'ru',
  name: 'Анна',
  startDate: '2026-11-11',
  times: { morning: '08:00', noon: '13:00', evening: '20:00' },
  showTaskInNotice: false,
};
const now = new Date(2026, 10, 12, 7, 0);

test('неделя вперёд: три напоминания в день, у каждого красная метка в заголовке', () => {
  const items = serverItems({ settings, entries: [] }, now);
  assert.equal(items.length, 21);
  for (const it of items) {
    assert.deepEqual(Object.keys(it).sort(), ['at', 'body', 'key', 'target', 'title']);
    assert.ok(it.title.startsWith(`${MARK} `), it.title);
    assert.ok(it.title.length <= 120 && it.body.length <= 400);
    assert.ok(it.key.startsWith('gsl-woman:') && new Date(it.at) > now);
    assert.equal(it.target, '#/today');
  }
  assert.equal(items[0].title, `${MARK} Доброе утро, Анна`);
});

test('без настроек (доступ закрыт) — пустое расписание: сервер снимет прежнее', () => {
  assert.deepEqual(serverItems({ settings: null, entries: [] }, now), []);
});

test('метка ставится один раз', () => {
  assert.equal(noticeTitle(noticeTitle('Вечер')), `${MARK} Вечер`);
});
