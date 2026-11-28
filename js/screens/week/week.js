import { h, svg } from '../../core/dom.js';
import { t, formatDate, weekdayShort } from '../../core/i18n.js';
import { WEEKS } from '../../config.js';
import { weekOf, dateOfDay } from '../../core/dates.js';
import { dayPlan, weekPlan, shapeOfWeek } from '../../program/index.js';
import { weekSummary } from '../../progress/progress.js';
import { icons } from '../../ui/icons.js';
import { weekRing, levelDots } from '../../ui/ring.js';
import { openEntry } from '../entry/entry-sheet.js';

/* «НЕДЕЛЯ» — часть «Достижений» (journal.js берёт weekParts и onEnter; отдельного экрана #/week нет с 240, кнопки на
   панели — с 26.11.2026): кольцо из семи дней с процентом в центре, под ним — дни списком. Стрелками
   листаются прошлые недели (вперёд — не дальше текущей). Пропущенный день текущей недели можно
   нажать и записать задним числом: это и есть «наверстать». */

// Какую неделю смотрим — помним между перерисовками; при открытии экрана — текущая
let shown = null;

export function onEnter() {
  shown = null;
}

function dayRow(ctx, d, summary) {
  const plan = dayPlan(d.day, ctx.lang);
  const iso = dateOfDay(ctx.settings.startDate, d.day);
  const label = plan.kind === 'task' ? plan.task.title : plan.kind === 'call' ? t('week.call') : t(`kinds.${plan.kind}`);
  const canRecord = d.status === 'today' || summary.catchUp.includes(d.day);

  const inner = [
    h('span', { class: 'week-day__date' }, h('strong', {}, weekdayShort(iso)), h('span', {}, formatDate(iso, { day: 'numeric' }))),
    h('span', { class: 'week-day__text' },
      h('span', { class: 'week-day__title' }, label),
      h('span', { class: `week-day__status is-${d.status}` }, t(`week.status.${d.status}`)),
    ),
    d.status === 'done' ? (plan.kind === 'call' ? svg(icons.check, 'week-day__mark') : levelDots(d.level)) : canRecord ? svg(icons.plus, 'week-day__mark') : null,
  ];

  const box = canRecord
    ? h('button', {
      type: 'button',
      class: 'week-day__box',
      onclick: () => openEntry({ day: d.day, kind: plan.kind, exercises: plan.tasks, levels: plan.task?.levels }),
    }, ...inner)
    : h('div', { class: 'week-day__box' }, ...inner);
  return h('li', { class: `week-day is-${d.status}` }, box);
}

/** То, что есть только у «Недели»: стрелки с названием недели программы, кольцо с процентом и статусом, семь дней.
    С 199 это же стоит в «Достижениях» на сроке «Неделя» (владелец 26.11.2026: «то, чего нету, добавь»).
    heading — тег названия недели: на своём экране h1, внутри «Достижений» — h2. range — дни показанной недели. */
export function weekParts(ctx, { heading = 'h1' } = {}) {
  const current = Math.min(Math.max(weekOf(Math.max(ctx.day, 1)), 1), WEEKS);
  if (shown === null || shown > current) shown = current;

  const plan = weekPlan(shown, ctx.lang);
  const summary = weekSummary(shown, ctx.entries, ctx.day, shapeOfWeek(shown, ctx.lang));

  const prev = h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('common.prev'), disabled: shown <= 1 }, svg(icons.chevronLeft));
  const next = h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('common.next'), disabled: shown >= current }, svg(icons.chevronRight));
  prev.addEventListener('click', () => { shown -= 1; ctx.rerender(); });
  next.addEventListener('click', () => { shown += 1; ctx.rerender(); });

  let status;
  if (ctx.day < 1) status = t('week.notStarted');
  else if (summary.lagDays) status = t('week.lag', { percent: summary.lagPercent });
  else status = t('week.onTrack');

  const nodes = [
    h('div', { class: 'week-nav' },
      prev,
      h('div', { class: 'week-nav__title' },
        h('p', { class: 'caps' }, t('today.week', { n: shown })),
        h(heading, { class: 'screen-title' }, plan.title),
      ),
      next,
    ),
    h('section', { class: 'card card--hero week-ring' },
      weekRing({ days: summary.days, value: `${summary.percent}%`, label: t('week.done') }),
      h('p', { class: 'week-ring__status' }, status),
    ),
    h('ul', { class: 'week-days' }, ...summary.days.map((d) => dayRow(ctx, d, summary))),
  ];
  return { nodes, range: { from: (shown - 1) * 7 + 1, to: shown * 7 } };
}
