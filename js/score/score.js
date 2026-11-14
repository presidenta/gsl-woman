import { h, svg } from '../core/dom.js';
import { t, plural } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import * as morningLog from '../journal/morning-log.js';
import * as waterLog from '../water/water-log.js';
import { kegelLevel, stepsOf, stepsLevel } from '../habits/logs.js';

/* БАЛЛЫ ДНЯ (владелец 14.11.2026, сборка 53): «не просто „выполнено“, а балл — человек сам видит, сколько баллов
   он прожил за день, и анализирует для себя». Баллы — личные: никуда не уходят, ни с кем не сравниваются (проверить
   их нельзя, поэтому и рейтинга на них нет); преувеличит — обманет только себя. Считаются прямо из отметок, своего
   хранилища у баллов нет.

     уровень: Минимум — 1, 100% — 2, Максимум — 3;
     стакан воды утром и на ночь — по 1 (уровней у стакана нет);
     задание дня — лучший уровень из записей этого дня (созвон — 2).

   doneBadge(points) — отметка в шапке свёрнутой карточки: золотой круг с галочкой и «+N». */

export const POINTS = { min: 1, full: 2, max: 3 };
export const pointsOf = (level) => POINTS[level] || 0;

/** Баллы задания дня: лучший уровень среди записей дня (task / flow), созвон — 2. */
export function taskPoints(entries, day) {
  let best = 0;
  for (const e of entries || []) {
    if (e.day !== day) continue;
    best = Math.max(best, e.kind === 'call' ? POINTS.full : pointsOf(e.level));
  }
  return best;
}

/** Все баллы дня по частям — для шапки и итогов. */
export function dayScore(iso, day, entries) {
  const parts = {
    water: waterLog.isDone(iso) ? 1 : 0,
    minute: pointsOf(morningLog.levelOf(iso)),
    task: taskPoints(entries, day),
    kegel: pointsOf(kegelLevel(iso)),
    steps: pointsOf(stepsLevel(stepsOf(iso))),
    night: waterLog.night.isDone(iso) ? 1 : 0,
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return { parts, total, max: 14 };
}

/** «3 балла» на языке приложения. */
export const pointsLabel = (n) => `${n} ${plural(n, 'plural.points')}`;

/** Отметка «сделано» с баллами: галочка и «+N». points = 0 — ничего. */
export function doneBadge(points) {
  if (!points) return null;
  return h('span', { class: 'fold__score', title: t('score.earned', { points: pointsLabel(points) }) },
    h('span', { class: 'fold__done' }, svg(icons.check)),
    h('span', { class: 'fold__points' }, `+${points}`),
  );
}
