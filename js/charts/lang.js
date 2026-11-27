/* ЯЗЫК КАРТ (сборка 218): из <html lang> — приложение ставит его само (core/i18n.js → setLang: ua → «uk»).
   Так модули карт не тянут тексты всего приложения: у каждого направления свои тексты на трёх языках
   (texts/ru.js, ua.js, en.js — одинаковые ключи, сверяет tests/charts-texts.test.js). */

export function chartLang() {
  const l = globalThis.document?.documentElement?.lang || 'ru';
  if (l === 'uk' || l === 'ua') return 'ua';
  return l === 'en' ? 'en' : 'ru';
}

/** Набор текстов текущего языка; нет такого языка — русский. */
export const pick = (sets) => sets[chartLang()] || sets.ru;
