import { read, write } from '../core/store.js';
import { dateOfDay } from '../core/dates.js';

/* КОГДА ВЫХОДИТ ГЛАВА (владелец 22.11.2026, вариант 3 консилиума: «первая глава на второй день, чтобы сразу зацепить,
   остальные — по выходным; суббота или воскресенье, доступны два дня подряд»).
   - Глава 1 — в день старта: с первого дня программы это 2-й день; кто уже далеко в программе — день, когда он впервые
     встретил раздел (ключ secret:start; запоминается настоящий день, а не тот, что листает администратор).
   - Главы 2…7 — по одной в каждую субботу после старта; карточка видна в субботу и воскресенье.
   - День на экране раньше старта (администратор листает стрелками назад) — главы от 2-го дня программы. */

const KEY = 'secret:start';
export const COUNT = 7;
export const FIRST = 2;
const SATURDAY = 6;

/** День старта (глава 1); нет — запомнить настоящий день человека. */
export function startOf(day, realDay = day) {
  let start = read(KEY, null);
  if (!Number.isInteger(start) && Number.isInteger(realDay) && realDay >= 1) {
    start = Math.max(realDay, FIRST);
    write(KEY, start);
  }
  if (!Number.isInteger(start)) return null;
  return Number.isInteger(day) && day < start ? FIRST : start;
}

/** День недели дня программы (0 — воскресенье, 6 — суббота); даты старта нет — null. */
const weekdayOf = (startIso, day) => (startIso ? new Date(`${dateOfDay(startIso, day)}T12:00:00`).getDay() : null);

/** Дни программы, в которые выходят главы 1…7: старт и дальше субботы. */
export function releaseDays(start, startIso) {
  if (start == null) return [];
  const days = [start];
  for (let d = start + 1; days.length < COUNT && d < start + 7 * COUNT + 7; d++) {
    const w = weekdayOf(startIso, d);
    if (w === SATURDAY || (w === null && (d - start) % 7 === 0)) days.push(d);
  }
  return days;
}

/** Сколько глав открыто на день day (0…7). */
export const openedOn = (day, days) => days.filter((d) => d <= day).length;

/** Через сколько дней откроется глава n (1…7); уже открыта — 0. */
export const daysTo = (n, day, days) => (days[n - 1] == null ? null : Math.max(0, days[n - 1] - day));

/** Карточка на «Сегодня» — в день главы и на следующий (у глав выходных — суббота и воскресенье). */
export const cardOn = (day, days) => days.some((d) => day === d || day === d + 1);
