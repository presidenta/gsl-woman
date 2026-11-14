// Профиль отношений, строка для детей, подсказка по делам и «Знакомство» (владелец, 14.11.2026).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clearAll } from '../js/core/store.js';
import * as settings from '../js/settings/settings.js';
import { applyTask, current, hasKids, showKids, bizFor } from '../js/profile/profile.js';
import { setCount } from '../js/love/love.js';
import * as meet from '../js/meet/meet.js';
import { COLLECTIONS } from '../js/sync/sync.js';

beforeEach(() => clearAll());

const task = {
  title: 'Дверь — моя',
  text: 'Для жены.',
  say: [{ label: 'Общее', text: 'Общая фраза.' }],
  variants: {
    together: { text: 'Живём вместе.', say: [{ label: 'Своё', text: 'Своя фраза.' }] },
    dating: { text: 'Встречаемся.' },
    single: { text: 'В поиске.', say: [{ label: 'Рядом', text: 'Женщине рядом.' }] },
  },
};

test('профиль по умолчанию — основной; чужое значение отбрасывается', () => {
  assert.equal(current(), 'married');
  settings.update({ profile: 'нечто' });
  assert.equal(current(), 'married');
  settings.update({ profile: 'dating' });
  assert.equal(current(), 'dating');
});

test('слова профиля: основной — как есть; у пары свои фразы первыми; в поиске — только свои', () => {
  assert.equal(applyTask(task, 'married'), task);
  const together = applyTask(task, 'together');
  assert.equal(together.text, 'Живём вместе.');
  assert.deepEqual(together.say.map((s) => s.label), ['Своё', 'Общее']);
  const dating = applyTask(task, 'dating');
  assert.equal(dating.text, 'Встречаемся.');
  assert.equal(dating.say, task.say, 'своих фраз нет — общие');
  assert.deepEqual(applyTask(task, 'single').say.map((s) => s.label), ['Рядом']);
  const self = { title: 'Зеркало', text: 'Про неё саму.' };
  assert.equal(applyTask(self, 'single'), self, 'задание про себя — одно для всех');
});

test('строка для детей — когда дети добавлены и семья под одной крышей', () => {
  const t = { kids: 'Открой дверь маме при детях.' };
  assert.equal(hasKids(), false);
  assert.equal(showKids(t, 'married'), false);
  setCount('children', 2);
  assert.equal(showKids(t, 'married'), true);
  assert.equal(showKids(t, 'together'), true);
  assert.equal(showKids(t, 'dating'), false);
  assert.equal(showKids(t, 'single'), false);
  assert.equal(showKids({}, 'married'), false);
});

test('подсказка по делам: день 1 — начало, 2–5 — каждый день, 6 — итог, 7 — отдых', () => {
  const biz = { title: 'Главное — первым', start: 'Начало', daily: 'Каждый день', review: 'Итог' };
  assert.deepEqual([1, 2, 5, 6, 7].map((n) => bizFor(biz, n)), ['Начало', 'Каждый день', 'Каждый день', 'Итог', null]);
  assert.equal(bizFor(null, 1), null);
});

test('«Знакомство»: запись после свидания хранится, пустая — отказ, новые сверху; уходит в копию на сервере', () => {
  assert.equal(meet.add({ name: ' ', answers: ['', ''] }), null);
  const a = meet.add({ name: 'Маша', date: '2026-11-10', answers: ['Любит море'] }, new Date('2026-11-10T20:00:00Z'));
  const b = meet.add({ name: 'Катя', answers: ['Рисует'] }, new Date('2026-11-12T20:00:00Z'));
  assert.equal(b.date, '2026-11-12', 'дата по умолчанию — сегодня');
  assert.deepEqual(meet.all().map((n) => n.name), ['Катя', 'Маша']);
  meet.remove(a.id);
  assert.deepEqual(meet.all().map((n) => n.name), ['Катя']);
  assert.ok(COLLECTIONS.some((c) => c.key === 'meetnotes' && c.type === 'list'));
});

test('«Знакомство»: подсказка по сигналам — строить, присмотрись, своей дорогой; сигналы хранятся в записи', () => {
  assert.equal(meet.verdictOf([], []), null);
  assert.equal(meet.verdictOf(['past.0', 'future.0', 'present.0'], []), 'build');
  assert.equal(meet.verdictOf(['past.0', 'future.0', 'present.0'], ['past.1']), 'build');
  assert.equal(meet.verdictOf(['past.0'], ['past.1', 'future.2']), 'pass');
  assert.equal(meet.verdictOf(['past.0', 'future.1'], ['past.1']), 'look');
  const n = meet.add({ name: 'Олег', green: ['past.0', 'нечто', 'present.2'], red: ['future.1'] });
  assert.deepEqual(n.green, ['past.0', 'present.2'], 'чужие ключи отбрасываются');
  assert.equal(n.verdict, 'look');
  assert.ok(meet.add({ green: ['past.0'] }), 'только сигналы, без имени и ответов — запись тоже сохраняется');
});
