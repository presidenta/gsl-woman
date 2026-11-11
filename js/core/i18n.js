import { LANGS, FALLBACK_LANG } from '../config.js';
import ua from '../texts/ua.js';
import ru from '../texts/ru.js';
import en from '../texts/en.js';

/* ЯЗЫКИ ИНТЕРФЕЙСА: t('today.title', { n: 3 }).

   Тексты лежат в js/texts/<язык>.js деревом; ключ — путь через точку. Нет слова в выбранном языке —
   берётся русское (он полный всегда), нет и там — показывается сам ключ, чтобы пропуск был виден сразу,
   а не прятался пустым местом. Тексты программы (задания) — отдельно, в js/program/data/. */

const DICTS = { ua, ru, en };
const LOCALES = { ua: 'uk-UA', ru: 'ru-RU', en: 'en-GB' };

let lang = FALLBACK_LANG;

export function setLang(next) {
  lang = LANGS.includes(next) ? next : FALLBACK_LANG;
  // В тестах (node) страницы нет — язык меняется только в памяти
  if (globalThis.document) document.documentElement.lang = lang === 'ua' ? 'uk' : lang;
}

export const getLang = () => lang;
export const locale = () => LOCALES[lang];

/** Язык телефона → наш код; незнакомый — украинский, как у презентации тренинга. */
export function detectLang(list = globalThis.navigator?.languages || []) {
  for (const l of list) {
    const code = String(l).toLowerCase().slice(0, 2);
    if (code === 'uk') return 'ua';
    if (code === 'ru') return 'ru';
    if (code === 'en') return 'en';
  }
  return 'ua';
}

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), dict);
}

/** Строка по ключу с подстановкой {имя}. */
export function t(key, vars = {}) {
  let value = lookup(DICTS[lang], key);
  if (value === undefined) value = lookup(DICTS[FALLBACK_LANG], key);
  if (value === undefined) return key;
  if (typeof value !== 'string') return value;
  return value.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`));
}

/** Список строк по ключу (пул комплиментов и т. п.). */
export function list(key) {
  const value = lookup(DICTS[lang], key) ?? lookup(DICTS[FALLBACK_LANG], key);
  return Array.isArray(value) ? value : [];
}

/* Склонение по числу. У украинского и русского правило одно: 1 день, 2 дня, 5 дней;
   у английского — 1 day, 2 days. Формы лежат в текстах массивом [одна, несколько, много]. */
export function plural(n, key) {
  const forms = list(key);
  if (!forms.length) return String(n);
  if (lang === 'en') return forms[n === 1 ? 0 : 1] ?? forms[0];
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b === 1) return forms[0];
  if (b >= 2 && b <= 4) return forms[1];
  return forms[2];
}

/** «12 ноября» на языке приложения. */
export function formatDate(iso, opts = { day: 'numeric', month: 'long' }) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(locale(), opts).format(new Date(y, m - 1, d));
}

/** Короткое имя дня недели: «пн», «вт». */
export function weekdayShort(iso) {
  return formatDate(iso, { weekday: 'short' });
}
