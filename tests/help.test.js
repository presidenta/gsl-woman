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
