import { h, svg } from '../../core/dom.js';
import { t, formatDate } from '../../core/i18n.js';
import { weekOf, dateOfDay, dayInWeek } from '../../core/dates.js';
import { dayPlan } from '../../program/index.js';
import { icons } from '../../ui/icons.js';
import { levelDots } from '../../ui/ring.js';
import { openEntry } from '../entry/entry-sheet.js';
import { photoStrip } from '../../media/photo-field.js';
import { segmented } from '../../ui/controls.js';
import { periodRange, summarize } from '../../insights/insights.js';
import { summaryCard } from '../../insights/summary-card.js';

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
    : [['worked', 'worked'], ['man', 'man'], ['reaction', 'reaction'], ['happened', 'happened'], ['how', 'how']]
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
    ...rows.map(([key, label]) => h('div', { class: `entry-card__row${key === 'reaction' ? ' entry-card__row--key' : ''}` },
      h('span', { class: 'entry-card__label' }, t(`entry.${label}`)),
      h('span', { class: 'entry-card__value' }, e[key]),
    )),
    photoStrip(e.photos),
  );
}

const PERIODS = ['week', 'month', 'all'];
let period = 'week';

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

  // Срок: неделя, месяц или всё время — итоги сверху, записи этого срока ниже (владелец 12.11.2026)
  const range = periodRange(period, ctx.day);
  view.append(
    h('div', { class: 'journal__period' }, segmented({
      label: t('insights.period'),
      options: PERIODS.map((p) => ({ value: p, label: t(`insights.${p}`) })),
      value: period,
      onChange: (p) => { period = p; ctx.rerender(); },
    })),
    summaryCard(summarize(ctx.entries, range, ctx.lang), { title: t(`insights.title.${period}`), limit: period === 'all' ? 5 : 0 }),
  );

  const sorted = ctx.entries
    .filter((e) => e.day >= range.from && e.day <= range.to)
    .sort((a, b) => b.day - a.day || b.createdAt.localeCompare(a.createdAt));
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
