import { SLOTS } from '../config.js';
import { isoDate, addDays, programDay, atTime } from '../core/dates.js';
import { t, list, getLang } from '../core/i18n.js';
import { dayPlan } from '../program/index.js';

/* РАСПИСАНИЕ НАПОМИНАНИЙ — что и когда сказать. Только считает, ничего не отправляет.

   Три сообщения в день (владелец, 04.11.2026): утро — задание, обед — комплимент и «как успехи»,
   вечер — «что ты сделала». Записала днём — обед и вечер не спрашивают «как успехи», а хвалят и
   предлагают добавить ещё.

   Каждое напоминание — { key, at, title, body, target }: ровно та форма, в которой «Квант» шлёт своё
   расписание пушей на сервер (server/src/push.js, таблица push_plan). Когда напоминания пойдут с
   сервера, это же расписание уйдёт туда без переделки. */

/** Комплимент дня: один и тот же весь день, а назавтра — другой. */
export function complimentFor(day) {
  const pool = list('compliments');
  if (!pool.length) return '';
  return pool[(day * 7 + 3) % pool.length];
}

function morning(plan, s) {
  const named = s.name ? t('notice.morning.titleNamed', { name: s.name }) : t('notice.morning.title');
  let body;
  if (plan.kind === 'call') body = t(plan.review ? 'notice.morning.callReview' : 'notice.morning.call');
  else if (plan.kind === 'flow') body = t('notice.morning.flow');
  else body = s.showTaskInNotice ? `«${plan.task.title}» — ${plan.task.text}` : t('notice.morning.task');
  return { title: named, body };
}

function noon(plan, s, recorded) {
  const title = complimentFor(plan.day);
  if (recorded) return { title, body: t('notice.noon.recorded') };
  if (plan.kind === 'call') return { title, body: t('notice.noon.call') };
  if (s.showTaskInNotice && plan.kind === 'task') return { title, body: t('notice.noon.task', { task: plan.task.title }) };
  return { title, body: t('notice.noon.body') };
}

function evening(plan, recorded) {
  if (recorded) return { title: t('notice.evening.doneTitle'), body: t('notice.evening.doneBody') };
  if (plan.kind === 'call') return { title: t('notice.evening.callTitle'), body: t('notice.evening.callBody') };
  return { title: t('notice.evening.title'), body: t('notice.evening.body') };
}

/**
 * Напоминания на несколько дней вперёд.
 * since — включать только те, чей час позже этого момента (для пушей — сейчас, для показа на открытом
 * приложении — чуть раньше, чтобы не потерять то, что пришлось на минуту, пока экран был выключен).
 */
export function buildPlan({ settings, entries, now = new Date(), since = now, days = 3 }) {
  if (!settings || !settings.startDate) return [];
  const items = [];
  const today = isoDate(since);
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const day = programDay(settings.startDate, date);
    const plan = dayPlan(day, getLang());
    if (!plan) continue;
    const recorded = entries.some((e) => e.day === day);
    for (const slot of SLOTS) {
      const at = atTime(date, settings.times[slot]);
      if (at <= since) continue;
      let msg;
      if (slot === 'morning') msg = morning(plan, settings);
      else if (slot === 'noon') msg = noon(plan, settings, recorded);
      else msg = evening(plan, recorded);
      items.push({ key: `gsl-woman:${day}:${slot}`, at: at.toISOString(), title: msg.title, body: msg.body, target: '#/today' });
    }
  }
  return items;
}
