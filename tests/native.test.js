// Родная часть в приложении для Android (владелец, 13.11.2026): расписание на неделю и виджет — из учебной программы.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fixture from './fixtures/program.js';
import { _use } from '../js/program/source.js';
import { setLang } from '../js/core/i18n.js';
import { clearAll } from '../js/core/store.js';
import { choose, setCount, setPerson } from '../js/love/love.js';
import { nativeItems, widgetDays, isApp } from '../js/native/native.js';

const now = new Date('2026-11-13T06:00:00');
const settings = { startDate: '2026-11-13', times: { morning: '08:00', noon: '13:00', evening: '20:00' }, alarms: { morning: true, noon: false, evening: true } };

beforeEach(() => {
  clearAll();
  _use(fixture);
  setLang('ru');
});

test('в браузере родной части нет — приложение ничего не ставит', () => {
  assert.equal(isApp(), false);
});

test('напоминания на неделю: три в день, будильником — те времена, что включены', () => {
  const items = nativeItems({ settings, entries: [] }, now);
  assert.equal(items.length, 21);
  const first = items.slice(0, 3);
  assert.deepEqual(first.map((i) => i.loud), [true, false, true]);
  assert.equal(new Date(first[0].at).getHours(), 8);
  assert.ok(items.every((i) => typeof i.at === 'number' && i.title && i.key.startsWith('gsl-woman:')));
  assert.deepEqual(nativeItems({ settings: { ...settings, startDate: null }, entries: [] }, now), [], 'без даты старта — ничего');
});

test('виджет на неделю: день, задание, утренняя минута и дела на языке любви по именам', () => {
  choose('him', 'time');
  setCount('children', 1);
  setPerson('children', 0, { name: 'Маша', kind: 'touch' });
  const days = widgetDays({ settings }, now);
  assert.equal(days.length, 7);
  assert.equal(days[0].date, '2026-11-13');
  assert.match(days[0].eyebrow, /День 1/);
  assert.match(days[0].title, /Задание 1\.1/);
  assert.ok(days[0].lines.some((l) => l.startsWith('☀ ')), 'утренняя минута');
  assert.ok(days[0].lines.some((l) => l.startsWith('♡ time для него')), 'дело для него');
  assert.ok(days[0].lines.some((l) => l.startsWith('• Маша: touch ребёнку')), 'дело ребёнку по имени');
});
