import { LEVELS, WEEK_DAYS } from '../config.js';
import { weekOf, monthOf } from '../core/dates.js';
import { dayPlan } from '../program/index.js';

/* ИТОГИ — что происходило за неделю, месяц или всё время (владелец 12.11.2026: «по итогу недели она должна
   видеть, что происходило каждый день, какие были реакции мужчин, какие у неё результаты — за неделю, за
   всё время»). Ничего не хранит: считает из записей, как и прогресс. Экраны берут отсюда готовое. */

/** Какие дни программы входят в срок: week — неделя дня day, month — его месяц, two и three — два и три месяца
    по текущий, all — всё до day. */
export function periodRange(period, day) {
  const d = Math.max(day, 1);
  if (period === 'week') {
    const w = weekOf(d);
    return { from: (w - 1) * WEEK_DAYS + 1, to: w * WEEK_DAYS };
  }
  // Месяц, 2 и 3 месяца — по месяцам программы (4 недели), считая текущий (владелец 13.11.2026: «за неделю, за
  // месяц, за 2 месяца и так далее»)
  const months = { month: 1, two: 2, three: 3 }[period];
  if (months) {
    const m = monthOf(weekOf(d));
    return { from: Math.max(0, m - months) * 4 * WEEK_DAYS + 1, to: m * 4 * WEEK_DAYS };
  }
  return { from: 1, to: Number.MAX_SAFE_INTEGER };
}

/** Название того, что делала в записи: задание, упражнение потока или итог недели. */
export function entryTitle(e, lang) {
  const plan = dayPlan(e.day, lang);
  if (!plan) return '';
  if (e.kind === 'call') return plan.title;
  if (e.kind === 'flow') return Number.isInteger(e.exercise) && plan.tasks[e.exercise] ? plan.tasks[e.exercise].title : plan.title;
  return plan.task?.title || plan.title;
}

/**
 * Итоги срока.
 * @returns {{ records:number, days:number, levels:{min:number,full:number,max:number},
 *   reactions:Array<{id,day,title,man,reaction}>, wins:Array<{id,day,title,text}> }}
 * reactions и wins — свежие сверху.
 */
export function summarize(entries, range, lang) {
  const list = entries
    .filter((e) => e.day >= range.from && e.day <= range.to)
    .sort((a, b) => b.day - a.day || (b.createdAt || '').localeCompare(a.createdAt || ''));
  const levels = Object.fromEntries(LEVELS.map((l) => [l, 0]));
  const days = new Set();
  for (const e of list) {
    if (e.kind === 'call') continue;
    days.add(e.day);
    if (levels[e.level] !== undefined) levels[e.level] += 1;
  }
  return {
    records: list.length,
    days: days.size,
    levels,
    reactions: list.filter((e) => e.reaction).map((e) => ({ id: e.id, day: e.day, title: entryTitle(e, lang), man: e.man || '', reaction: e.reaction })),
    wins: list.filter((e) => e.worked).map((e) => ({ id: e.id, day: e.day, title: entryTitle(e, lang), text: e.worked })),
  };
}
