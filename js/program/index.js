import { TASK_DAYS, WEEK_DAYS, WEEKS, MONTH_WEEKS } from '../config.js';
import { weekOf, dayInWeek, monthOf, inProgram } from '../core/dates.js';
import { langData } from './source.js';
import { applyTask, applyImsg, current as currentProfile } from '../profile/profile.js';
import { dueRepeats, tiersForDay } from './repeats.js';
import * as settings from '../settings/settings.js';

/* ПРОГРАММА: что делать в день N. Экраны и напоминания спрашивают только отсюда — сами в данные
   не лезут. Тексты — на сервере «Кванта» (source.js: приходят после входа и хранятся на телефоне);
   поменять ритм недели — правка здесь. Программа ещё не пришла — всё отвечает null / []. */

const data = (lang) => langData(lang);

/* ГОД ПО КРУГУ (владелец 18.11.2026): на сервере 24 недели и 6 месяцев, программа — 48 недель и 12 месяцев.
   Неделя 25 — снова текст недели 1, месяц 7 — снова месяц 1; номера недель и месяцев идут дальше. */
const cycled = (list, n) => (list?.length ? list[(n - 1) % list.length] : undefined);
export const sourceWeek = (lang, week) => cycled(data(lang)?.weeks, week);
const sourceMonth = (lang, month) => cycled(data(lang)?.months, month);

/** Конец месяца — неделя 4, 8, … 48: в её седьмой день записывается отзыв (владелец, 05.11.2026). */
export const isReviewWeek = (week) => week % MONTH_WEEKS === 0;

/** Неделя целиком: заголовок, задания, свободный поток, созвон. */
export function weekPlan(week, lang) {
  const w = sourceWeek(lang, week);
  if (!w) return null;
  const month = monthOf(week);
  return {
    week,
    month,
    monthInfo: sourceMonth(lang, month),
    title: w.title,
    intro: w.intro || '',
    // Задания — в словах профиля отношений (profile/, владелец 14.11.2026): у каждого из четырёх свои слова
    tasks: w.tasks.map((t) => applyTask(t, currentProfile())),
    flow: w.flow,
    // Фразы дней практики (сервер, поле flowSay; сейчас у недели 5 — имя любимого и слова ему, владелец 21.11.2026)
    flowSay: w.flowSay || [],
    // Весёлые фразы дней своей практики (сервер: woman/teasers/, владелец 15.11.2026); у задания — task.teaser
    teasers: w.teasers || [],
    biz: w.biz || null,
    profile: currentProfile(),
    call: w.call,
    imsgs: w.imsg || [],
    // «Разговор пары» — тема недели для седьмого дня (сервер: gsl/talks/, общая для обеих частей), по кругу
    talk: talkOf(week, lang),
    // «Итоги недели» — над темой седьмого дня, каждую неделю одни и те же (сервер: gsl/talks/review.js, 15.11.2026)
    weekReview: data(lang)?.review || null,
    review: isReviewWeek(week),
    final: week === WEEKS,
  };
}

/* Вид дня по его месту в неделе — ритм 3-2-1-1 (владелец 17.11.2026: «три дня новое, два — свободный полёт и
   повторение, один день созвон, один полностью выходной — у мужчин и у женщин одинаково»):
   - task — новое задание (дни 1–3; в неделе с шестью заданиями — все 1–6);
   - flow — свободная практика упражнений недели (дни 4–5);
   - call — итог недели и созвон: 6-й или 7-й день, на выбор человека (настройки, поле callDay; обычно 7-й);
   - rest — выходной: второй из дней 6 и 7. В неделе с шестью заданиями выходного нет — созвон на 7-й день. */
export function weekShape(tasksCount, callDay = settings.get().callDay) {
  if (tasksCount >= TASK_DAYS) return { call: WEEK_DAYS, rest: null };
  const call = callDay === 6 ? 6 : WEEK_DAYS;
  return { call, rest: call === 6 ? WEEK_DAYS : 6 };
}

/** Раскладка недели по её номеру — для подсчёта прогресса (progress.js) и экранов. */
export function shapeOfWeek(week, lang) {
  return weekShape(sourceWeek(lang, week)?.tasks.length || 0);
}

function kindOf(n, tasksCount) {
  const shape = weekShape(tasksCount);
  if (n === shape.call) return 'call';
  if (n === shape.rest) return 'rest';
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
  const prev = week > 1 ? sourceWeek(lang, week - 1)?.imsg || [] : [];
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
    teaser: teaserOf(kind, n, plan),
    // Я-сообщение — в словах профиля отношений (сервер: gsl/imsg/, 17.11.2026)
    imsg: applyImsg(imsgOf(week, n, plan.imsgs, lang)),
    // Повтор по графику (repeats.js): в дни практики — навыки прошлых недель, к которым пора вернуться
    repeats: repeatsOf(week, n, lang),
    ...plan,
  };
}

/* Фраза в шапке карточки дня («ЗАДАНИЕ ДНЯ — Это шутка или магия?»): у задания — своя, в дни практики — фразы
   недели по порядку (день 4 — первая, день 5 — вторая, дальше по кругу). Нет фразы — шапка как раньше. */
function teaserOf(kind, n, plan) {
  if (kind === 'task') return plan.tasks[n - 1]?.teaser || '';
  if (kind !== 'flow' || !plan.teasers.length) return '';
  const first = Math.min(plan.tasks.length, TASK_DAYS) + 1;
  return plan.teasers[(n - first) % plan.teasers.length];
}

function repeatsOf(week, n, lang) {
  const weeks = data(lang)?.weeks || [];
  return dueRepeats(weeks, week, tiersForDay(n)).map((r) => ({ ...r, task: applyTask(r.task, currentProfile()) }));
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
    out.push({ month: m, ...sourceMonth(lang, m), weeks });
  }
  return out;
}
