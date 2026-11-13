import { h, svg, add } from '../../core/dom.js';
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
import { habits } from '../../insights/habits.js';
import { habitsCard } from '../../insights/habits-card.js';

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

const PERIODS = ['week', 'month', 'two', 'three', 'all'];
let period = 'week';

export function render(view, ctx) {
  add(view,
    h('h1', { class: 'screen-title' }, t('journal.title')),
    h('p', { class: 'screen-lead' }, svg(icons.lock, 'journal__lock'), t('journal.lead')),
  );

  // Срок: неделя, месяц, 2 или 3 месяца, всё время — итоги сверху, записи этого срока ниже (владелец 12.11.2026,
  // сроки 2 и 3 месяца — 13.11.2026). «Утро» (стакан воды и минута) — первым: оно есть и без записей
  const range = periodRange(period, ctx.day);
  const morning = habitsCard(habits(range, ctx.day, ctx.settings.startDate));
  if (!ctx.entries.length && !morning) {
    add(view, h('div', { class: 'card empty' },
      h('div', { class: 'empty__title' }, t('journal.emptyTitle')),
      h('p', {}, t('journal.emptyText')),
    ));
    return;
  }
  add(view,
    h('div', { class: 'journal__period' }, segmented({
      label: t('insights.period'),
      options: PERIODS.map((p) => ({ value: p, label: t(`insights.${p}`) })),
      value: period,
      onChange: (p) => { period = p; ctx.rerender(); },
    })),
    morning,
    ctx.entries.length
      ? summaryCard(summarize(ctx.entries, range, ctx.lang), { title: t(`insights.title.${period}`), limit: period === 'all' || period === 'three' ? 5 : 0 })
      : h('div', { class: 'card empty' },
        h('div', { class: 'empty__title' }, t('journal.emptyTitle')),
        h('p', {}, t('journal.emptyText')),
      ),
  );

  const sorted = ctx.entries
    .filter((e) => e.day >= range.from && e.day <= range.to)
    .sort((a, b) => b.day - a.day || b.createdAt.localeCompare(a.createdAt));
  let week = null;
  for (const e of sorted) {
    const w = weekOf(e.day);
    if (w !== week) {
      week = w;
      add(view, h('h2', { class: 'journal__week caps' }, t('journal.weekHeader', { n: w })));
    }
    const card = entryCard(ctx, e);
    if (card) add(view, card);
  }
}
