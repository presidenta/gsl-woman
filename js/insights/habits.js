import { dateOfDay } from '../core/dates.js';
import * as morningLog from '../journal/morning-log.js';
import * as waterLog from '../water/water-log.js';

/* ИТОГИ УТРА — стакан тёплой воды и утренняя минута по дням (владелец 13.11.2026: «нужна статистика, пил ли
   человек воду и делал ли упражнения каждый день; в конце недели, за месяц, за 2 месяца и так далее»).
   Ничего не хранит: читает отметки дней — стакан (water/water-log.js, ставит человек кнопкой) и минута
   (journal/morning-log.js, ставится сама, когда минута дошла до конца). */

export const HABITS = ['water', 'minute'];
const LOGS = { water: waterLog, minute: morningLog };
const STREAK_MAX = 400;

const doneOn = (habit, iso) => LOGS[habit].isDone(iso);

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
 * @returns {{ days: Array<{ day, iso, water, minute, today, future }>, total, water, minute, streak: { water, minute } }}
 * total — сколько дней уже прошло (с сегодняшним); дни впереди есть только у недели.
 */
export function habits(range, day, startIso) {
  const empty = { days: [], total: 0, water: 0, minute: 0, streak: { water: 0, minute: 0 } };
  if (!startIso || day < 1) return empty;
  const from = Math.max(1, range.from);
  // Неделя видна целиком: дни впереди — бледными кружками, в счёт не идут. Длинные сроки — до сегодня
  const to = range.to - range.from <= 6 ? range.to : Math.min(day, range.to);
  const days = [];
  for (let d = from; d <= to; d++) {
    const iso = dateOfDay(startIso, d);
    const future = d > day;
    days.push({ day: d, iso, water: !future && doneOn('water', iso), minute: !future && doneOn('minute', iso), today: d === day, future });
  }
  const past = days.filter((x) => !x.future);
  return {
    days,
    total: past.length,
    water: past.filter((x) => x.water).length,
    minute: past.filter((x) => x.minute).length,
    streak: { water: streak('water', startIso, day), minute: streak('minute', startIso, day) },
  };
}
