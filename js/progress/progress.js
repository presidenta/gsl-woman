import { WEEK_DAYS, LEVELS } from '../config.js';
import { firstDayOfWeek } from '../core/dates.js';

/* ПРОГРЕСС НЕДЕЛИ — считается из записей, ничего своего не хранит.

   ВРЕМЕННАЯ ФОРМУЛА. Баллы, Дельта и Индекс Жизни владелец поставил на паузу (05.11.2026: «не хочу
   вникать сейчас»). Пока процент — это доля дней 1–6, в которые есть хоть одна запись; уровень дня —
   лучший из записанных. Когда формулу утвердят, меняется только этот файл: экраны берут отсюда готовые
   числа и сами ничего не считают.

   Наверстать (владелец: «отстаёшь на проценты, можно догнать») — пропущенный день текущей недели можно
   записать задним числом, и он засчитывается. Прошлые недели закрыты: догоняем внутри недели. */

/** Лучший уровень среди записей дня; записей нет — null. */
export function bestLevel(entries) {
  let best = -1;
  for (const e of entries) best = Math.max(best, LEVELS.indexOf(e.level));
  return best >= 0 ? LEVELS[best] : null;
}

/** Состояние одного дня относительно сегодняшнего дня программы. */
export function dayState(day, entries, today) {
  const own = entries.filter((e) => e.day === day);
  const level = bestLevel(own);
  let status;
  if (own.length) status = 'done';
  else if (day < today) status = 'missed';
  else if (day === today) status = 'today';
  else status = 'future';
  return { day, status, level, count: own.length };
}

/** Сводка недели: дни, процент, отставание и что можно наверстать. */
export function weekSummary(week, entries, today, shape = { call: WEEK_DAYS, rest: null }) {
  const first = firstDayOfWeek(week);
  const days = [];
  for (let i = 0; i < WEEK_DAYS; i++) days.push({ ...dayState(first + i, entries, today), dayInWeek: i + 1 });

  // Дни с делом: все, кроме дня созвона и выходного (ритм 3-2-1-1, program/index.js → weekShape)
  const taskDays = days.filter((d) => d.dayInWeek !== shape.call && d.dayInWeek !== shape.rest);
  const total = taskDays.length;
  const done = taskDays.filter((d) => d.status === 'done').length;
  const missed = taskDays.filter((d) => d.status === 'missed');
  const isCurrent = today >= first && today < first + WEEK_DAYS;

  return {
    week,
    days,
    done,
    total,
    percent: Math.round((done / total) * 100),
    // Отставание — пропущенные дни, которые ещё можно догнать (только в текущей неделе)
    lagDays: isCurrent ? missed.length : 0,
    lagPercent: isCurrent ? Math.round((missed.length / total) * 100) : 0,
    catchUp: isCurrent ? missed.map((d) => d.day) : [],
    callDone: days[shape.call - 1].status === 'done',
  };
}
