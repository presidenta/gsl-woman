// Своя кнопка на панели (js/shortcut/, 239): варианты, тексты на трёх языках, адреса ведут на существующие экраны.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OPTIONS, option } from '../js/shortcut/options.js';
import { ALL } from '../js/shortcut/texts.js';
import { place, READING } from '../js/shortcut/bookmarks.js';

const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const routes = new Set([...main.matchAll(/router\.define\('([a-z]+)'/g)].map((m) => m[1]));

test('варианты: «Недели» нет (владелец 28.11.2026), «Мои закладки» есть, ключи не повторяются', () => {
  const ids = OPTIONS.map((o) => o.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(!ids.includes('week') && !OPTIONS.some((o) => o.hash?.startsWith('#/week')));
  assert.ok(option('bookmarks')?.list); // вместо «Продолжить с того же места» (владелец 28.11.2026: «нелогично»)
  assert.equal(option('resume'), null);
  // разделы, которые владелец назвал (28.11.2026): первое свидание, вопросы, анкеты, комплименты, тайный архив
  for (const id of ['meet', 'questionsDate', 'questionsPair', 'surveys', 'compliments', 'archive']) assert.ok(option(id), id);
  assert.equal(option('нет такого'), null);
  assert.equal(option(null), null);
});

test('каждый вариант ведёт на существующий экран и с ним подсвечивается', () => {
  for (const o of OPTIONS.filter((x) => !x.list)) {
    const name = o.hash.replace(/^#\//, '').split('?')[0];
    assert.ok(routes.has(name), `${o.id}: экрана ${name} нет`);
    assert.equal(o.route, name, o.id);
    assert.ok(o.icon, `${o.id}: нет значка`);
  }
});

test('тексты: ru · ua · en — одни и те же ключи, у каждого варианта полное и короткое название', () => {
  const shape = (x) => Object.keys(x).sort().join();
  for (const lang of ['ru', 'ua', 'en']) {
    const T = ALL[lang];
    assert.equal(shape(T), shape(ALL.ru), lang);
    for (const o of OPTIONS) {
      const [full, short] = T.names[o.id] || [];
      assert.ok(full && short, `${lang}: ${o.id}`);
    }
  }
});

test('закладки: у раздела — свой адрес без «открой плашку»; ленточка — в разделах для чтения и анкетах', () => {
  assert.equal(place('#/archive?open=types'), '#/archive');
  assert.equal(place('#/help?date'), '#/help?date');
  assert.equal(place('#/goals?tab=mine&open=secret'), '#/goals?tab=mine');
  for (const r of ['archive', 'help', 'goals', 'anketa', 'love', 'intim', 'charts']) assert.ok(READING.has(r), r);
  assert.ok(!READING.has('today') && !READING.has('settings'));
});
