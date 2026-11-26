// «Единая анкета партнёра» (js/anketa/, владелец 26.11.2026): ответы на телефоне, языки любви и интим — без повторов
// (берутся из «Пяти языков любви» и «Карты желаний»), ссылка — на сайт GSL; экраны и стыковка на месте.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { write, read, clearAll } from '../js/core/store.js';
import * as data from '../js/anketa/data.js';
import * as map from '../js/intim/map.js';
import { at } from '../js/anketa/texts.js';

const realFetch = globalThis.fetch;
let sent = [];
beforeEach(() => {
  clearAll();
  sent = [];
  write('account', { token: 't', userId: 'u1', gender: 'female' });
  globalThis.fetch = async (url, init) => {
    sent.push({ url, body: init?.body ? JSON.parse(init.body) : null });
    return { ok: true, status: 200, json: async () => ({ ok: true, token: 'abcdefghijklmnop1234' }) };
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

test('ответ хранится на телефоне; снять — пусто; уходит на сервер', async () => {
  data.set('life.smoke', '-');
  data.set('home.living', 'together');
  assert.equal(data.get('life.smoke'), '-');
  data.set('life.smoke', undefined);
  assert.equal(data.get('life.smoke'), undefined);
  assert.equal(read('anketa').sent, false, 'ещё не отправлено');
  await data.send();
  assert.match(sent[0].url, /\/api\/gsl\/anketa$/);
  assert.deepEqual(sent[0].body.answers, { 'home.living': 'together' });
  assert.equal(read('anketa').sent, true);
});

test('без повторов: два языка любви — из «Пяти языков любви», интим — отметки «Карты желаний»', () => {
  write('love', { me: 'touch', me2: 'time' });
  map.setMark('touch.kiss', 'yes');
  map.setMark('open.swing', 'maybe');
  const p = data.payload();
  assert.deepEqual(p.answers['life.love'], ['touch', 'time']);
  assert.deepEqual(p.intim, { 'touch.kiss': 'yes', 'open.swing': 'maybe' });
  assert.equal(data.intimCount(), 2);
  assert.deepEqual(data.loveAuto(), ['touch', 'time']);
});

test('карты желаний на телефоне ещё нет — отметки не шлём (сервер оставит прежние)', () => {
  assert.equal('intim' in data.payload(), false);
  map.setMark('touch.kiss', 'yes');
  map.setMark('touch.kiss', 'yes'); // снять — карта есть, но пустая
  assert.deepEqual(data.payload().intim, {});
});

test('ссылка — постоянная, на сайт GSL (из APK и с ПК та же)', async () => {
  const url = await data.link();
  assert.equal(url, 'https://presidenta.github.io/gsl-woman/anketa.html#abcdefghijklmnop1234');
  sent = [];
  assert.equal(await data.link(), url);
  assert.equal(sent.length, 0, 'второй раз — без запроса');
});

test('надписи: итог без процентов, гость — заявка и почта', () => {
  assert.equal(at('totals', { a: 12, b: 3, c: 4 }), 'совпало 12 · попробовать 3 · обсудить 4');
  assert.ok(!/%/.test(at('totals', { a: 1, b: 1, c: 1 })));
  assert.match(at('guestFrom', { name: 'Анна' }), /Анна/);
  assert.ok(at('guestJoin') && at('guestEmail'));
});

test('стыковка: экран #/anketa, стиль, страница гостя, ссылки из «Анкет», «В поиске», «Знакомства», «Мы»', () => {
  const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  assert.match(src('js/main.js'), /router\.define\('anketa', anketaScreen\)/);
  assert.match(src('index.html'), /js\/anketa\/anketa\.css/);
  assert.match(src('anketa.html'), /js\/anketa\/public\.js/);
  assert.match(src('anketa.html'), /noindex/);
  assert.match(src('js/screens/goals/goals.js'), /before: \[anketa\]/);
  assert.match(src('js/screens/search/search.js'), /anketaLink/);
  assert.match(src('js/screens/meet/meet.js'), /anketaLink/);
  assert.match(src('js/screens/us/us.js'), /#\/anketa\?result/);
});
