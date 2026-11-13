// Тексты интерфейса двух частей GSL (W+M)⁺: во всех трёх языках обеих частей одни и те же ключи, ничего не забыто.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ru from '../js/texts/woman/ru.js';
import ua from '../js/texts/woman/ua.js';
import en from '../js/texts/woman/en.js';
import manRu from '../js/texts/man/ru.js';
import manUa from '../js/texts/man/ua.js';
import manEn from '../js/texts/man/en.js';
import { setLang, setSide, plural, t } from '../js/core/i18n.js';

// Все шесть наборов: женская и мужская часть, по три языка
const SETS = { ru, ua, en, 'man.ru': manRu, 'man.ua': manUa, 'man.en': manEn };
const langOf = (name) => name.replace('man.', '');

function keys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

test('ключи совпадают во всех языках обеих частей', () => {
  const base = keys(ru).sort();
  for (const [name, d] of Object.entries(SETS)) assert.deepEqual(keys(d).sort(), base, name);
});

test('пулы комплиментов одной длины', () => {
  for (const [name, d] of Object.entries(SETS)) assert.equal(d.compliments.length, ru.compliments.length, name);
});

test('названия: GSL Woman+ у женской части, GSL Man+ у мужской, общее GSL (W+M)+ у обеих (владелец 13.11.2026)', () => {
  for (const d of [ru, ua, en]) assert.equal(d.app.name, 'GSL Woman+');
  for (const d of [manRu, manUa, manEn]) assert.equal(d.app.name, 'GSL Man+');
  for (const d of Object.values(SETS)) assert.equal(d.app.shared, 'GSL (W+M)+');
});

test('мужская часть — по-мужски: реакция женщины, её язык любви, «сделал»', () => {
  assert.equal(manRu.entry.reaction, 'Реакция женщины');
  assert.equal(manRu.love.himSection, 'Моя женщина');
  assert.equal(manRu.entry.howPh, 'Что я сделал и что почувствовал');
  assert.equal(manUa.love.himSection, 'Моя жінка');
  assert.equal(manEn.love.himSection, 'My woman');
  setSide('man');
  setLang('ru');
  assert.equal(t('app.name'), 'GSL Man+');
  setSide('woman');
  assert.equal(t('app.name'), 'GSL Woman+');
});

test('у обеих частей — стакан тёплой воды: десять составляющих (с семенами чиа и льна), у каждой доза, польза по пунктам и «бережно»; вечерний стакан — свой состав', () => {
  for (const [name, d] of Object.entries(SETS)) {
    const w = d.morning.water;
    assert.deepEqual(Object.keys(w.items), ['lemon', 'ginger', 'mint', 'cinnamon', 'chia', 'honey', 'turmeric', 'pepper', 'clove', 'flax'], name);
    assert.deepEqual(Object.keys(d.night.items), ['chamomile', 'melissa', 'linden', 'fennel', 'honey', 'cinnamon'], `${name}: на ночь`);
    assert.match(w.items.chia.amount, /15–30/, `${name}: чиа — сколько замачивать`);
    for (const it of Object.values(w.items)) {
      assert.ok(it.name && it.amount && it.benefit && it.care, name);
      assert.ok(Array.isArray(it.points) && it.points.length >= 3, `${name}: польза — пунктами`);
    }
    assert.ok(w.title && w.short && w.lead && w.care && w.info && w.golden.title && w.drink, name);
    assert.equal(w.temp, '37–40 °C', `${name}: идеальная температура под стаканом`);
  }
});

test('мужчинам про мяту — отдельная оговорка про тестостерон (владелец 13.11.2026)', () => {
  for (const d of [manRu, manUa, manEn]) assert.match(d.morning.water.items.mint.care, /тестостерон|testosterone/i);
  for (const d of [ru, ua, en]) assert.doesNotMatch(d.morning.water.items.mint.care, /тестостерон|testosterone/i);
});

test('нигде в надписях нет имени ведущего: созвоны — с наставником', () => {
  for (const [name, d] of Object.entries(SETS)) assert.ok(!/Ладомир|Ладомир|Ladomir/.test(JSON.stringify(d)), name);
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
  for (const [name, dict] of Object.entries(SETS)) {
    assert.ok(!bad.test(JSON.stringify(dict)), name);
  }
});

// Положительные слова везде (владелец, 12.11.2026: «на подсознание работает приставка „не“ — во всех текстах
// заменить на положительную настройку»): без «не», «нет», «ни», «без», «никуда» и слов с отрицающей приставкой.
// «Ней», «неделя», «нежный», «безопасность» — разрешены: в них отрицания нет.
const NEGATIVE = {
  ru: /(^|[^а-яё])(не|нет|ни|без|никуда|ничего|никого|никаких|никогда|нигде|нельзя|некуда|нечего|непрошен[а-яё]*|незнаком[а-яё]*|недоступ[а-яё]*|небольш[а-яё]*|неудобн[а-яё]*|недосказ[а-яё]*|неспешн[а-яё]*|неверн[а-яё]*)(?=[^а-яё]|$)/i,
  ua: /(^|[^а-яіїєґ'’])(не|ні|нема|немає|без|нікуди|нічого|нікого|ніяких|ніколи|ніде|жодн[а-яіїєґ]*|непрохан[а-яіїєґ]*|незнайом[а-яіїєґ]*|недоступ[а-яіїєґ]*|невелик[а-яіїєґ]*|незручн[а-яіїєґ]*|неквапн[а-яіїєґ]*|неможлив[а-яіїєґ]*|невірн[а-яіїєґ]*)(?=[^а-яіїєґ'’]|$)/i,
  en: /\b(not|no|never|nothing|nobody|nowhere|none|nor|without|don[’']t|doesn[’']t|isn[’']t|aren[’']t|can[’']t|won[’']t|didn[’']t|unsolicited|unavailable|cannot|impossible)\b/i,
};

/** Все строки объекта с путём к каждой: [путь, строка]. */
function allStrings(v, where = '') {
  if (typeof v === 'string') return [[where, v]];
  if (Array.isArray(v)) return v.flatMap((x, i) => allStrings(x, `${where}[${i}]`));
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => allStrings(x, where ? `${where}.${k}` : k));
  return [];
}

test('тексты интерфейса обеих частей — только положительные слова, без «не» (владелец, 12.11.2026)', () => {
  for (const [name, data] of Object.entries(SETS)) {
    for (const [where, text] of allStrings(data)) {
      assert.ok(!NEGATIVE[langOf(name)].test(text), `${name}: ${where}: «${text}»`);
    }
  }
});
