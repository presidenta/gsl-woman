// Тексты интерфейса: во всех трёх языках одни и те же ключи, ничего не забыто.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ru from '../js/texts/ru.js';
import ua from '../js/texts/ua.js';
import en from '../js/texts/en.js';
import { setLang, plural, t } from '../js/core/i18n.js';

function keys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

test('ключи совпадают во всех языках', () => {
  const base = keys(ru).sort();
  assert.deepEqual(keys(ua).sort(), base, 'ua');
  assert.deepEqual(keys(en).sort(), base, 'en');
});

test('пулы комплиментов одной длины', () => {
  assert.equal(ua.compliments.length, ru.compliments.length);
  assert.equal(en.compliments.length, ru.compliments.length);
});

test('название приложения — GSL Woman+ во всех языках (плюс — от «Жінка-Плюс», 12.11.2026)', () => {
  for (const d of [ru, ua, en]) assert.equal(d.app.name, 'GSL Woman+');
});

test('нигде в надписях нет имени ведущего: созвоны — с наставником', () => {
  for (const [lang, d] of Object.entries({ ru, ua, en })) assert.ok(!/Ладомир|Ladomir/.test(JSON.stringify(d)), lang);
});

test('склонение дней', () => {
  setLang('ru');
  assert.equal(plural(1, 'plural.days'), 'день');
  assert.equal(plural(3, 'plural.days'), 'дня');
  assert.equal(plural(11, 'plural.days'), 'дней');
  assert.equal(plural(21, 'plural.days'), 'день');
  setLang('ua');
  assert.equal(plural(2, 'plural.days'), 'дні');
  setLang('en');
  assert.equal(plural(1, 'plural.days'), 'day');
  assert.equal(plural(5, 'plural.days'), 'days');
});

test('подстановка и запасной язык', () => {
  setLang('en');
  assert.equal(t('today.dayOf', { day: 3 }), 'Day 3');
  assert.equal(t('settings.cabinet', { n: 12 }), 'Cabinet No. 12', 'номер не отрывается от «No.» при переносе');
  assert.equal(t('нет.такого.ключа'), 'нет.такого.ключа');
});

test('нигде в надписях нет «полгода», «из 168» и финала: обучение постоянное (владелец, 12.11.2026)', () => {
  const bad = /полгода|пів року|півроку|six months|half a year|шесть месяцев|шість місяців|\{total\}|выпускн|випускн|graduat|финал|фінал|finale/i;
  for (const [lang, dict] of Object.entries({ ru, ua, en })) {
    assert.ok(!bad.test(JSON.stringify(dict)), lang);
  }
});
