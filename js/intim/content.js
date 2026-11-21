import { h } from '../core/dom.js';
import { langData } from '../program/source.js';

/* Тексты раздела «Интим 18⁺» — с сервера, поле intim программы (planner/server/src/gsl/intim/). */

/** Раздел на языке приложения; программа ещё не пришла — null. */
export const intimOf = (lang) => langData(lang)?.intim || null;

/** Задание выходного для недели программы: 24 задания, дальше по кругу. */
export function weekendTask(intim, week) {
  const list = intim?.weekend?.tasks || [];
  return list.length && week > 0 ? list[(week - 1) % list.length] : null;
}

/** Название с плюсом в степени, как «GSL Woman⁺» (владелец: «плюс в степени, а не сверху»): последний «+» — brand__plus. */
export function withPlus(text) {
  const s = String(text || '');
  if (!s.endsWith('+')) return s;
  return h('span', { class: 'intim-name' }, s.slice(0, -1), h('span', { class: 'brand__plus' }, '+'));
}
