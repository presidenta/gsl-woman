import { isoDate, addDays } from '../core/dates.js';
import * as waterLog from '../water/water-log.js';
import * as morningLog from '../journal/morning-log.js';
import { kegelDone, stepsLevel, stepsOf } from '../habits/logs.js';
import * as circles from './circles.js';

/* ОБЩИЕ ЦЕЛИ ПАРЫ И СЕМЬИ (владелец 13.11.2026, ТЗ раздел 6).

   goal — id «g-…», data:
     { title, type: 'steps', steps: [{ id, text, weight, who, done, doneBy, doneAt }] }
         цель — 100%: шаг весит weight процентов; сумма весов ≠ 100 — подравниваем пропорционально (normalize);
         who — участник или 'both' (вместе / все); галочку ставит любой, doneBy — кто отметил;
     { title, type: 'counter', target, track: null | water | minute | kegel | steps, period: 'week' | 'forever', week }
         набираем число; привязка к привычке — отметка привычки сама кладёт +1 от этого человека за день.
   contrib — вклад в счётчик, id «цель.участник.день» (привычка) или «цель.участник.время» (+1 вручную),
             data { goal, day, n } — правит только автор.

   Очки и рейтинги (отложены) потом посчитаются из этих же отметок: шаги с doneBy/doneAt, вклады по дням. */

export const TRACKS = ['water', 'minute', 'kegel', 'steps'];
const DONE = {
  water: (iso) => waterLog.isDone(iso),
  minute: (iso) => morningLog.isDone(iso),
  kegel: kegelDone,
  // В цели «шаги» засчитывается день от 100% (6000)
  steps: (iso) => ['full', 'max'].includes(stepsLevel(stepsOf(iso))),
};

export const goalsOf = (circleId) => circles.items(circleId, 'goal')
  .sort((a, b) => (a.data?.createdAt || a.updatedAt).localeCompare(b.data?.createdAt || b.updatedAt));

/** Веса шагов к сумме 100 (пропорционально; все нули — поровну). Вернёт { steps, sum } — sum до подравнивания. */
export function normalize(steps) {
  const sum = steps.reduce((s, x) => s + Math.max(0, Number(x.weight) || 0), 0);
  if (!steps.length) return { steps, sum: 0 };
  if (!sum) return { steps: steps.map((x, i) => ({ ...x, weight: i < steps.length - 1 ? Math.floor(100 / steps.length) : 100 - Math.floor(100 / steps.length) * (steps.length - 1) })), sum };
  let left = 100;
  const out = steps.map((x, i) => {
    const w = i < steps.length - 1 ? Math.round((Math.max(0, Number(x.weight) || 0) / sum) * 100) : left;
    left -= w;
    return { ...x, weight: Math.max(0, w) };
  });
  return { steps: out, sum };
}

/** Вклад в счётчик за его срок: [{ author, n }]. */
function contribs(circleId, goal) {
  const week = circles.weekOf();
  return circles.items(circleId, 'contrib')
    .filter((c) => c.data?.goal === goal.id && (goal.data.period !== 'week' || circles.weekOf(c.data.day) === week));
}

/** Прогресс цели: { percent, parts: [{ member, percent }], count?, target? }. */
export function progress(circleId, goal) {
  const d = goal.data || {};
  if (d.type === 'counter') {
    const list = contribs(circleId, goal);
    const by = {};
    for (const c of list) by[c.author] = (by[c.author] || 0) + (Number(c.data.n) || 1);
    const count = Object.values(by).reduce((a, b) => a + b, 0);
    const target = Math.max(1, Number(d.target) || 1);
    return {
      count, target, percent: Math.min(100, Math.round((count / target) * 100)),
      parts: Object.entries(by).map(([member, n]) => ({ member, percent: Math.min(100, (n / target) * 100) })),
    };
  }
  const steps = d.steps || [];
  const parts = {};
  let percent = 0;
  for (const s of steps) {
    if (!s.done) continue;
    percent += s.weight;
    parts[s.doneBy || 'both'] = (parts[s.doneBy || 'both'] || 0) + s.weight;
  }
  return { percent: Math.min(100, percent), parts: Object.entries(parts).map(([member, p]) => ({ member, percent: p })) };
}

export function create(circle, { title, type, steps = [], target = 10, track = null, period = 'forever' }) {
  const clean = String(title || '').trim().slice(0, 120);
  if (!clean) return null;
  const data = { title: clean, type, createdAt: new Date().toISOString() };
  if (type === 'counter') Object.assign(data, { target: Math.max(1, Math.min(1000, Math.round(Number(target) || 1))), track: TRACKS.includes(track) ? track : null, period, week: circles.weekOf() });
  else {
    const list = steps.filter((s) => String(s.text || '').trim())
      .map((s) => ({ id: circles.newId('s'), text: String(s.text).trim().slice(0, 120), weight: Number(s.weight) || 0, who: s.who || 'both', done: false }));
    data.steps = normalize(list).steps;
  }
  return circles.put(circle.id, 'goal', circles.newId('g'), data);
}

export function toggleStep(circle, goal, stepId) {
  const steps = (goal.data.steps || []).map((s) => (s.id === stepId
    ? { ...s, done: !s.done, doneBy: s.done ? null : circle.me, doneAt: s.done ? null : new Date().toISOString() }
    : s));
  circles.put(circle.id, 'goal', goal.id, { ...goal.data, steps });
}

export function plusOne(circle, goal) {
  circles.put(circle.id, 'contrib', `${goal.id}.${circles.short(circle.me)}.${Date.now().toString(36)}`.slice(0, 64), { goal: goal.id, day: isoDate(), n: 1 });
}

export const removeGoal = (circle, goal) => circles.drop(circle.id, 'goal', goal.id);

/* Привязка счётчиков к привычкам: отметил стакан воды — +1 в «14 стаканов на двоих». Сверяем сегодня и вчера
   (вчерашнее можно отметить задним числом) при каждой правке отметок привычек. */
const HABIT_KEYS = new Set(['waterlog', 'morning', 'kegel', 'steps', 'circle-data', 'circles']);

export function reconcile() {
  const days = [isoDate(), addDays(isoDate(), -1)];
  for (const c of circles.all()) {
    for (const g of goalsOf(c.id)) {
      const d = g.data;
      if (d?.type !== 'counter' || !d.track || !DONE[d.track]) continue;
      for (const day of days) {
        if (d.period === 'week' && circles.weekOf(day) !== circles.weekOf()) continue;
        const id = `${g.id}.${circles.short(c.me)}.${circles.compact(day)}`.slice(0, 64);
        const has = !!circles.item(c.id, 'contrib', id);
        const done = DONE[d.track](day);
        if (done && !has) circles.put(c.id, 'contrib', id, { goal: g.id, day, n: 1 });
        if (!done && has) circles.drop(c.id, 'contrib', id);
      }
    }
  }
}

let watching = false;
let busy = false;
export function watchHabits() {
  if (watching) return;
  watching = true;
  circles.watchStore((key) => {
    if (busy || !HABIT_KEYS.has(key)) return;
    busy = true;
    try { reconcile(); } finally { busy = false; }
  });
}
