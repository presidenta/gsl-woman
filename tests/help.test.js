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
