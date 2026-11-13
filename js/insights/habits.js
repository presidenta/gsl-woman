import { dateOfDay } from '../core/dates.js';
import * as morningLog from '../journal/morning-log.js';
import * as waterLog from '../water/water-log.js';
import { kegelDone, stepsDone } from '../habits/logs.js';

/* ИТОГИ УТРА — стакан тёплой воды и утренняя минута по дням (владелец 13.11.2026: «нужна статистика, пил ли
   человек воду и делал ли упражнения каждый день; в конце недели, за месяц, за 2 месяца и так далее»).
   Ничего не хранит: читает отметки дней — стакан (water/water-log.js, ставит человек кнопкой) и минута
   (journal/morning-log.js, ставится сама, когда минута дошла до конца). */

/** «Утро» — стакан воды и минута; «День» — Кегель и шаги от минимума (сборка 42). */
export const MORNING = ['water', 'minute'];
export const DAY = ['kegel', 'steps'];
export const HABITS = [...MORNING, ...DAY];
const DONE = {
  water: (iso) => waterLog.isDone(iso),
  minute: (iso) => morningLog.isDone(iso),
  kegel: kegelDone,
  steps: stepsDone,
};
const STREAK_MAX = 400;

const doneOn = (habit, iso) => DONE[habit](iso);

/** Сколько дней подряд сделано, считая назад от сегодня. Сегодня ещё впереди — серия идёт со вчера. */
function streak(habit, startIso, day) {
  let d = day;
  if (!doneOn(habit, dateOfDay(startIso, d))) d -= 1;
  let n = 0;
  while (d >= 1 && n < STREAK_MAX && doneOn(habit, dateOfDay(startIso, d))) {
    n += 1;
    d -= 1;
  }
  return n;
}

/**
 * Утро за срок range ({ from, to } — дни программы) до сегодняшнего дня day включительно.
 * @returns {{ days: Array<{ day, iso, water, minute, kegel, steps, today, future }>, total, water, minute, kegel, steps, streak }}
 * total — сколько дней уже прошло (с сегодняшним); дни впереди есть только у недели.
 */
export function habits(range, day, startIso) {
  const zero = () => Object.fromEntries(HABITS.map((k) => [k, 0]));
  const empty = { days: [], total: 0, ...zero(), streak: zero() };
  if (!startIso || day < 1) return empty;
  const from = Math.max(1, range.from);
  // Неделя видна целиком: дни впереди — бледными кружками, в счёт не идут. Длинные сроки — до сегодня
  const to = range.to - range.from <= 6 ? range.to : Math.min(day, range.to);
  const days = [];
  for (let d = from; d <= to; d++) {
    const iso = dateOfDay(startIso, d);
    const future = d > day;
    const marks = Object.fromEntries(HABITS.map((k) => [k, !future && doneOn(k, iso)]));
    days.push({ day: d, iso, ...marks, today: d === day, future });
  }
  const past = days.filter((x) => !x.future);
  return {
    days,
    total: past.length,
    ...Object.fromEntries(HABITS.map((k) => [k, past.filter((x) => x[k]).length])),
    streak: Object.fromEntries(HABITS.map((k) => [k, streak(k, startIso, day)])),
  };
}
