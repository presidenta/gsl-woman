import { read, write } from '../core/store.js';

/* КОГДА ВЫХОДИТ ГЛАВА (владелец 22.11.2026: «главы выходят через 2 дня»). Отсчёт — от дня программы, в который человек
   впервые встретил раздел (ключ secret:start): кто начинает с первого дня — первая глава на 2-й день; кто уже далеко
   в программе — с сегодняшнего дня, а не всё сразу. Дальше — глава через 2 дня, 7 глав. День — тот, что на экране
   (у администратора — за стрелками просмотра). */

const KEY = 'secret:start';
export const COUNT = 7;
export const STEP = 2;

export const FIRST = 2; // по программе: главы на 2, 4, 6 … 14-й день

/** День старта; нет — запомнить сегодняшний (первый день программы → второй). День на экране раньше запомненного
    (администратор листает стрелками назад, 22.11.2026: «пролистал первые 7 дней — ни одного секретного материала») —
    главы идут по дням программы: 2, 4, 6 … 14. */
export function startOf(day) {
  let start = read(KEY, null);
  if (!Number.isInteger(start) && Number.isInteger(day) && day >= 1) {
    start = Math.max(day, FIRST);
    write(KEY, start);
  }
  if (!Number.isInteger(start)) return null;
  return Number.isInteger(day) && day < start ? FIRST : start;
}

/** Сколько глав открыто на день day (0…7). */
export function openedOn(day, start) {
  if (start == null || !Number.isInteger(day) || day < start) return 0;
  return Math.min(COUNT, Math.floor((day - start) / STEP) + 1);
}

/** Через сколько дней откроется глава n (1…7); уже открыта — 0. */
export function daysTo(n, day, start) {
  if (start == null) return null;
  return Math.max(0, start + (n - 1) * STEP - day);
}

/** Показывать карточку на «Сегодня»: от первой главы до дня после последней. */
export function cardOn(day, start) {
  return start != null && day >= start && day <= start + (COUNT - 1) * STEP + 1;
}
