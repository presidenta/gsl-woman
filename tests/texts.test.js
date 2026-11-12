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
  assert.equal(t('settings.cabinet', { n: 12 }), 'Cabinet № 12', 'номер держится за «№» при переносе');
  assert.equal(t('нет.такого.ключа'), 'нет.такого.ключа');
});

test('нигде в надписях нет «полгода», «из 168» и финала: обучение постоянное (владелец, 12.11.2026)', () => {
  const bad = /полгода|пів року|півроку|six months|half a year|шесть месяцев|шість місяців|\{total\}|выпускн|випускн|graduat|финал|фінал|finale/i;
  for (const [lang, dict] of Object.entries({ ru, ua, en })) {
    assert.ok(!bad.test(JSON.stringify(dict)), lang);
  }
});

// Положительные слова везде (владелец, 12.11.2026: «на подсознание работает приставка „не“ — во всех текстах
// заменить на положительную настройку»): без «не», «нет», «ни», «без», «никуда» и слов с отрицающей приставкой.
// «Ней», «неделя», «нежный», «безопасность» — разрешены: в них отрицания нет.
const NEGATIVE = {
  ru: /(^|[^а-яё])(не|нет|ни|без|никуда|ничего|никого|никаких|никогда|нигде|нельзя|некуда|нечего|непрошен[а-яё]*|незнаком[а-яё]*|недоступ[а-яё]*|небольш[а-яё]*|неудобн[а-яё]*|недосказ[а-яё]*|неспешн[а-яё]*)(?=[^а-яё]|$)/i,
  ua: /(^|[^а-яіїєґ'’])(не|ні|нема|немає|без|нікуди|нічого|нікого|ніяких|ніколи|ніде|жодн[а-яіїєґ]*|непрохан[а-яіїєґ]*|незнайом[а-яіїєґ]*|недоступ[а-яіїєґ]*|невелик[а-яіїєґ]*|незручн[а-яіїєґ]*|неквапн[а-яіїєґ]*|неможлив[а-яіїєґ]*)(?=[^а-яіїєґ'’]|$)/i,
  en: /\b(not|no|never|nothing|nobody|nowhere|none|nor|without|don[’']t|doesn[’']t|isn[’']t|aren[’']t|can[’']t|won[’']t|didn[’']t|unsolicited|unavailable|cannot|impossible)\b/i,
};

/** Все строки объекта с путём к каждой: [путь, строка]. */
function allStrings(v, where = '') {
  if (typeof v === 'string') return [[where, v]];
  if (Array.isArray(v)) return v.flatMap((x, i) => allStrings(x, `${where}[${i}]`));
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => allStrings(x, where ? `${where}.${k}` : k));
  return [];
}

test('тексты интерфейса — только положительные слова, без «не» (владелец, 12.11.2026)', () => {
  for (const [lang, data] of Object.entries({ ru, ua, en })) {
    for (const [where, text] of allStrings(data)) {
      assert.ok(!NEGATIVE[lang].test(text), `${lang}: ${where}: «${text}»`);
    }
  }
});
