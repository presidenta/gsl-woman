import { h, svg } from '../../core/dom.js';
import { t, formatDate } from '../../core/i18n.js';
import { weekOf, dateOfDay, dayInWeek } from '../../core/dates.js';
import { dayPlan } from '../../program/index.js';
import { icons } from '../../ui/icons.js';
import { levelDots } from '../../ui/ring.js';
import { openEntry } from '../entry/entry-sheet.js';

/* ЭКРАН «ЗАПИСИ»: история женщины по неделям, свежее сверху. Нажатие открывает запись для правки.
   Пустые поля не показываются — запись «просто отметила» выглядит коротко. */

function entryTitle(e, plan) {
  if (e.kind === 'call') return t('kinds.call');
  if (e.kind === 'flow') return Number.isInteger(e.exercise) && plan.tasks[e.exercise] ? plan.tasks[e.exercise].title : t('kinds.flow');
  return plan.task?.title || plan.title;
}

function entryCard(ctx, e) {
  const plan = dayPlan(e.day, ctx.lang);
  if (!plan) return null;
  const iso = dateOfDay(ctx.settings.startDate, e.day);
  const rows = (e.kind === 'call'
    ? [['worked', 'callWorked'], ['happened', 'callHappened']]
    : [['worked', 'worked'], ['man', 'man'], ['happened', 'happened'], ['how', 'how']]
  ).filter(([key]) => e[key]);

  return h('button', {
    type: 'button',
    class: 'card entry-card',
    onclick: () => openEntry({ day: e.day, kind: e.kind, exercises: plan.tasks, levels: plan.task?.levels, entry: e }),
  },
    h('div', { class: 'entry-card__head' },
      h('span', { class: 'caps' }, `${t('entry.forDay', { day: dayInWeek(e.day) })} · ${formatDate(iso)}`),
      h('span', { class: 'spacer' }),
      e.kind === 'call' ? svg(icons.check, 'entry-card__mark') : levelDots(e.level),
    ),
    h('h3', { class: 'entry-card__title' }, entryTitle(e, plan)),
    ...rows.map(([key, label]) => h('div', { class: 'entry-card__row' },
      h('span', { class: 'entry-card__label' }, t(`entry.${label}`)),
      h('span', { class: 'entry-card__value' }, e[key]),
    )),
  );
}

export function render(view, ctx) {
  view.append(
    h('h1', { class: 'screen-title' }, t('journal.title')),
    h('p', { class: 'screen-lead' }, svg(icons.lock, 'journal__lock'), t('journal.lead')),
  );

  if (!ctx.entries.length) {
    view.append(h('div', { class: 'card empty' },
      h('div', { class: 'empty__title' }, t('journal.emptyTitle')),
      h('p', {}, t('journal.emptyText')),
    ));
    return;
  }

  const sorted = [...ctx.entries].sort((a, b) => b.day - a.day || b.createdAt.localeCompare(a.createdAt));
  let week = null;
  for (const e of sorted) {
    const w = weekOf(e.day);
    if (w !== week) {
      week = w;
      view.append(h('h2', { class: 'journal__week caps' }, t('journal.weekHeader', { n: w })));
    }
    const card = entryCard(ctx, e);
    if (card) view.append(card);
  }
}
