// «Помощь» — библиотека (владелец, 14.11.2026): тексты приходят с программой полем help.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fixture from './fixtures/program.js';
import { _use } from '../js/program/source.js';
import { clearAll } from '../js/core/store.js';
import { content } from '../js/help/help.js';

beforeEach(() => clearAll());

test('«Помощь»: без программы — null; с программой — её поле help', () => {
  _use(null);
  assert.equal(content('ru'), null);
  const help = { title: 'Помощь', intro: '…', meetLead: '…', items: [] };
  _use({ ...fixture, langs: { ...fixture.langs, ru: { ...fixture.langs.ru, help } } });
  assert.equal(content('ru'), help);
});

import * as rules from '../js/help/rules.js';
import { COLLECTIONS } from '../js/sync/sync.js';

test('«Правила нашего дома»: начинаются с правил с сервера, дописываются, меняются и убираются; уходят в копию на сервере', () => {
  clearAll();
  const base = ['Любим друг друга.', 'Держим слово.'];
  assert.deepEqual(rules.list(base).map((r) => r.text), base);
  const mine = rules.add('Воскресенье — день семьи.', base);
  assert.ok(mine);
  assert.equal(rules.add('   ', base), null, 'пустое — отказ');
  rules.update(mine.id, 'Воскресенье — только для нас');
  rules.update(mine.id, '');
  const first = rules.list(base)[0];
  rules.remove(first.id);
  assert.deepEqual(rules.list(base).map((r) => r.text), ['Держим слово.', 'Воскресенье — только для нас']);
  rules.remove(rules.list(base)[0].id);
  rules.remove(rules.list(base)[0].id);
  assert.deepEqual(rules.list(base), [], 'убрал все — правила с сервера сами не возвращаются');
  assert.ok(COLLECTIONS.some((c) => c.key === 'houserules'));
});

test('«Правила нашего дома» на языке интерфейса: правило с сервера переводится, своё и изменённое — как написано (21.11.2026)', () => {
  clearAll();
  const ru = ['Любим друг друга.', 'Держим слово.'];
  const ua = ['Любимо одне одного.', 'Тримаємо слово.'];
  const known = [ua, ru];
  // Заполнено по-русски (правила помнят номер), потом — своё правило
  rules.list(ru);
  const mine = rules.add('Воскресенье — день семьи.', ru, known);
  assert.deepEqual(rules.list(ua, known).map((r) => r.text), ['Любимо одне одного.', 'Тримаємо слово.', 'Воскресенье — день семьи.']);
  const ids = rules.list(ru, known).map((r) => r.id);
  // Нажал и ушёл, ничего не поменяв, — правило остаётся переводимым
  rules.update(ids[0], 'Любимо одне одного.', ua, known);
  assert.equal(rules.list(ru, known)[0].text, 'Любим друг друга.');
  // Изменил — теперь его слова на всех языках
  rules.update(ids[1], 'Тримаємо слово завжди.', ua, known);
  assert.equal(rules.list(ru, known)[1].text, 'Тримаємо слово завжди.');
  assert.equal(rules.list(ua, known)[2].text, 'Воскресенье — день семьи.');
  assert.ok(mine);
});

test('«Правила нашего дома»: список, заполненный по-русски до сборки 157 (только текст), на украинском — по-украински', async () => {
  clearAll();
  const { write } = await import('../js/core/store.js');
  write('houserules', { seeded: true, items: [{ id: 'a', text: 'Любим друг друга.' }, { id: 'b', text: 'Своё правило.' }] });
  const ru = ['Любим друг друга.'];
  const ua = ['Любимо одне одного.'];
  assert.deepEqual(rules.list(ua, [ua, ru]).map((r) => r.text), ['Любимо одне одного.', 'Своё правило.']);
});
