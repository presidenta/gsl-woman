import { read, write } from '../core/store.js';
import { isoDate, addDays } from '../core/dates.js';

/* ШАГИ НЕДЕЛИ «В ПОИСКЕ» (владелец 15.11.2026: «нужно действие — что делать человеку»): выходы в люди, знакомства,
   свидания — человек отмечает каждый шаг, счёт идёт по календарной неделе (с понедельника). Цель недели — в текстах
   с сервера (meet.search.steps). Ключ searchsteps: { 'понедельник ISO': { out: 2, date: 1 } } — уходит в копию
   (sync.js, вид searchstep). */

const KEY = 'searchsteps';
const MAX = 99;

/** Понедельник недели даты — ключ недели. */
export function weekKey(d = new Date()) {
  return addDays(isoDate(d), -((d.getDay() + 6) % 7));
}

/** Счёт недели { шаг: число }. */
export function counts(week = weekKey()) {
  const w = read(KEY, {})?.[week];
  return w && typeof w === 'object' && !Array.isArray(w) ? w : {};
}

/** Отметить шаг (+1) или убрать отметку (-1). */
export function bump(step, delta, week = weekKey()) {
  if (!/^[a-z]{1,20}$/.test(step)) return 0;
  const all = read(KEY, {}) || {};
  const cur = counts(week);
  const n = Math.max(0, Math.min(MAX, (Number(cur[step]) || 0) + delta));
  write(KEY, { ...all, [week]: { ...cur, [step]: n } });
  return n;
}
