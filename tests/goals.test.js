// Цели и номера снимков в записях: данные на телефоне.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as goals from '../js/goals/goals.js';
import * as journal from '../js/journal/journal.js';

test('цель: добавить, сбылось с датой, вернуть, переименовать, удалить', () => {
  assert.equal(goals.add('   '), null, 'пустая цель не добавляется');
  const g = goals.add('  Путешествие к морю  ', new Date('2026-11-12T10:00:00Z'));
  assert.equal(g.text, 'Путешествие к морю');
  goals.toggle(g.id, new Date('2026-12-01T10:00:00Z'));
  let saved = goals.all().find((x) => x.id === g.id);
  assert.equal(saved.done, true);
  assert.equal(saved.doneAt, '2026-12-01T10:00:00.000Z');
  goals.toggle(g.id);
  saved = goals.all().find((x) => x.id === g.id);
  assert.equal(saved.done, false);
  assert.equal(saved.doneAt, null);
  goals.rename(g.id, 'Море');
  assert.equal(goals.all().find((x) => x.id === g.id).text, 'Море');
  goals.remove(g.id);
  assert.ok(!goals.all().some((x) => x.id === g.id));
});

test('новая цель — сверху; длинный текст обрезается', () => {
  const a = goals.add('Первая');
  const b = goals.add('Вторая');
  assert.equal(goals.all()[0].id, b.id);
  assert.equal(goals.add('x'.repeat(goals.MAX_TEXT + 50)).text.length, goals.MAX_TEXT);
  [a, b].forEach((g) => goals.remove(g.id));
});

test('запись хранит до шести снимков, правка заменяет набор, photoIds собирает все', () => {
  const e = journal.add({ day: 1, kind: 'task', photos: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 42] });
  assert.deepEqual(journal.byId(e.id).photos, ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  journal.update(e.id, { photos: ['p9'] });
  assert.deepEqual(journal.byId(e.id).photos, ['p9']);
  journal.update(e.id, { worked: 'текст' });
  assert.deepEqual(journal.byId(e.id).photos, ['p9'], 'правка без фото набор не трогает');
  assert.ok(journal.photoIds().includes('p9'));
  journal.remove(e.id);
});
