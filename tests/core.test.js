// Даты, хранилище, настройки и записи — то, на чём стоит всё приложение.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as dates from '../js/core/dates.js';
import * as store from '../js/core/store.js';
import * as settings from '../js/settings/settings.js';
import * as journal from '../js/journal/journal.js';

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    _map: m,
  };
}

test('день программы считается от даты старта, а не от понедельника', () => {
  assert.equal(dates.programDay('2026-11-11', '2026-11-11'), 1);
  assert.equal(dates.programDay('2026-11-11', '2026-11-17'), 7); // старт в среду — седьмой день во вторник
  assert.equal(dates.programDay('2026-11-11', '2026-11-18'), 8);
  assert.equal(dates.programDay('2026-11-11', '2026-11-10'), 0);
});

test('переход на зимнее время не сдвигает номер дня', () => {
  // В Европе 25 октября 2026 сутки длятся 25 часов
  assert.equal(dates.daysBetween('2026-10-24', '2026-10-26'), 2);
  assert.equal(dates.addDays('2026-10-24', 2), '2026-10-26');
  assert.equal(dates.addDays('2026-12-31', 1), '2027-01-01');
});

test('неделя, день недели и месяц по номеру дня', () => {
  assert.equal(dates.weekOf(1), 1);
  assert.equal(dates.weekOf(7), 1);
  assert.equal(dates.weekOf(8), 2);
  assert.equal(dates.dayInWeek(14), 7);
  assert.equal(dates.monthOf(4), 1);
  assert.equal(dates.monthOf(5), 2);
  assert.equal(dates.monthOf(24), 6);
  assert.equal(dates.inProgram(168), true);
  assert.equal(dates.inProgram(169), false);
});

test('проверка дат и времени', () => {
  assert.equal(dates.isValidIso('2026-02-29'), false);
  assert.equal(dates.isValidIso('2028-02-29'), true);
  assert.equal(dates.isValidTime('08:30'), true);
  assert.equal(dates.isValidTime('24:00'), false);
});

test('хранилище: только своя приставка, «стереть всё» не трогает соседей', () => {
  const fake = fakeStorage();
  fake.setItem('planner-settings', 'чужое');
  store._useBackend(fake);
  store.write('x', { a: 1 });
  assert.deepEqual(store.read('x'), { a: 1 });
  assert.ok(fake._map.has('gsl-woman:x'));
  store.clearAll();
  assert.equal(store.read('x'), null);
  assert.equal(fake.getItem('planner-settings'), 'чужое');
});

test('хранилище переживает отказ localStorage', () => {
  store._useBackend({
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('quota'); },
    removeItem() {},
    key: () => null,
    length: 0,
  });
  store.write('y', 5);
  assert.equal(store.read('y'), 5);
});

test('настройки: кривые значения заменяются значениями по умолчанию', () => {
  store._useBackend(fakeStorage());
  store.write('settings', { lang: 'de', startDate: '2026-13-01', times: { morning: '7:00', noon: '12:30' } });
  const s = settings.get();
  assert.equal(s.lang, 'ua');
  assert.equal(s.startDate, null);
  assert.equal(s.times.morning, '08:00');
  assert.equal(s.times.noon, '12:30');
  assert.equal(s.showTaskInNotice, false);
});

test('записи: добавить, поправить, удалить', () => {
  store._useBackend(fakeStorage());
  const e = journal.add({ day: 3, kind: 'task', level: 'max', worked: '  получилось  ', man: 'Андрей' });
  assert.equal(e.worked, 'получилось');
  assert.equal(journal.forDay(3).length, 1);
  journal.update(e.id, { level: 'min', how: 'мягко' });
  assert.equal(journal.byId(e.id).level, 'min');
  assert.equal(journal.byId(e.id).how, 'мягко');
  assert.equal(journal.byId(e.id).man, 'Андрей');
  journal.remove(e.id);
  assert.equal(journal.all().length, 0);
});
