import { TASK_DAYS, WEEK_DAYS, WEEKS, MONTH_WEEKS } from '../config.js';
import { weekOf, dayInWeek, monthOf, inProgram } from '../core/dates.js';
import { langData } from './source.js';
import { applyTask, current as currentProfile } from '../profile/profile.js';

/* ПРОГРАММА: что делать в день N. Экраны и напоминания спрашивают только отсюда — сами в данные
   не лезут. Тексты — на сервере «Кванта» (source.js: приходят после входа и хранятся на телефоне);
   поменять ритм недели — правка здесь. Программа ещё не пришла — всё отвечает null / []. */

const data = (lang) => langData(lang);

/** Конец месяца — неделя 4, 8, … 24: в её седьмой день записывается отзыв (владелец, 05.11.2026). */
export const isReviewWeek = (week) => week % MONTH_WEEKS === 0;

/** Неделя целиком: заголовок, задания, свободный поток, созвон. */
export function weekPlan(week, lang) {
  const w = data(lang)?.weeks[week - 1];
  if (!w) return null;
  const month = monthOf(week);
  return {
    week,
    month,
    monthInfo: data(lang).months[month - 1],
    title: w.title,
    intro: w.intro || '',
    // Задания — в словах профиля отношений (profile/, владелец 14.11.2026): у каждого из четырёх свои слова
    tasks: w.tasks.map((t) => applyTask(t, currentProfile())),
    flow: w.flow,
    biz: w.biz || null,
    profile: currentProfile(),
    call: w.call,
    imsgs: w.imsg || [],
    // «Разговор пары» — тема недели для седьмого дня (сервер: gsl/talks/, общая для обеих частей), по кругу
    talk: talkOf(week, lang),
    review: isReviewWeek(week),
    final: week === WEEKS,
  };
}

/* Вид дня по его месту в неделе:
   - task — новое задание (обычно дни 1–3; в неделе с шестью заданиями — все 1–6);
   - flow — свободная практика всех упражнений недели (дни 4–6);
   - call — седьмой день: итог недели и созвон. */
function kindOf(n, tasksCount) {
  if (n === WEEK_DAYS) return 'call';
  return n <= Math.min(tasksCount, TASK_DAYS) ? 'task' : 'flow';
}

function talkOf(week, lang) {
  const list = data(lang)?.talks || [];
  return list.length ? list[(week - 1) % list.length] : null;
}

/* Я-СООБЩЕНИЕ — КАЖДЫЙ ДЕНЬ (владелец 13.11.2026: «чтобы каждый день была хотя бы одна фраза, каждый день попадала
   на глаза»; до 40 — только дни 4–6):
   - дни 4, 5, 6 — пример к заданию дня 1, 2, 3 этой недели (владелец, 12.11.2026), как и было;
   - дни 1, 2, 3 — повторение: фразы дней 4, 5, 6 прошлой недели (в первую неделю — этой);
   - день 7 — одна из фраз недели, по кругу от номера недели. */
function imsgOf(week, n, imsgs, lang) {
  if (n >= 4 && n <= 6) return imsgs[n - 4] || null;
  if (n === WEEK_DAYS) return imsgs.length ? imsgs[(week - 1) % imsgs.length] : null;
  const prev = week > 1 ? data(lang)?.weeks[week - 2]?.imsg || [] : [];
  const pool = prev.length ? prev : imsgs;
  return pool.length ? pool[(n - 1) % pool.length] : null;
}

/** День программы со всем, что нужно экрану «Сегодня». Вне программы — null. */
export function dayPlan(day, lang) {
  if (!inProgram(day)) return null;
  const week = weekOf(day);
  const n = dayInWeek(day);
  const plan = weekPlan(week, lang);
  if (!plan) return null;
  const kind = kindOf(n, plan.tasks.length);
  return {
    day,
    dayInWeek: n,
    kind,
    task: kind === 'task' ? plan.tasks[n - 1] : null,
    taskIndex: kind === 'task' ? n - 1 : null,
    imsg: imsgOf(week, n, plan.imsgs, lang),
    ...plan,
  };
}

/** Короткое имя дела дня — для заголовка напоминания и записи. */
export function dayTitle(plan) {
  if (!plan) return '';
  if (plan.kind === 'task') return plan.task.title;
  return plan.title;
}

/** Все месяцы с неделями — для экрана «Путь». */
export function outline(lang) {
  const out = [];
  if (!data(lang)) return out;
  for (let m = 1; m <= WEEKS / MONTH_WEEKS; m++) {
    const weeks = [];
    for (let i = 1; i <= MONTH_WEEKS; i++) weeks.push(weekPlan((m - 1) * MONTH_WEEKS + i, lang));
    out.push({ month: m, ...data(lang).months[m - 1], weeks });
  }
  return out;
}
