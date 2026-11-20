import { h } from '../core/dom.js';
import { formatDate, weekdayShort } from '../core/i18n.js';
import { addDays, isoDate } from '../core/dates.js';
import { okMap } from '../kids/stars.js';
import { tt } from './texts.js';
import { KIND, GOAL_ID, TARGET_RANGE, SHARE_RANGE, goalOf, dayResult, weekResult, weekStart, hasKids } from './team.js';

/* КАРТОЧКА «КОМАНДНАЯ ЦЕЛЬ СЕМЬИ» — у ребёнка на «Сегодня» (kids/kid-app.js) и у родителя в «Мы → Семья»
   (screens/us/us.js). Сегодня: полоса звёзд по цветам участников, доля каждого ребёнка, взята ли цель. Неделя: семь дней,
   лучший день (корона), дни с целью, кто сколько внёс; ниже — итог прошлой недели. Родитель меняет цель и долю.

   api — кабинет родителя (kids/family-api.js) или телефон ребёнка (kids/kid-store.js): circle, me, role, items, put. */

let setupOpen = false;

const dataOf = (api) => ({ deeds: api.items('deed'), oks: api.items('ok'), tasks: api.items('task'), awards: api.items('award') });
const nameOf = (api, m) => (m.id === api.me ? tt('me', { name: m.name }) : m.name);

/** Полоса дня: доли участников по цветам, черта цели. */
function bar(day) {
  const scale = Math.max(day.target, day.total, 1);
  return h('div', { class: 'team__bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(day.target), 'aria-valuenow': String(day.total), 'aria-label': tt('title', { n: day.total, t: day.target }) },
    ...day.members.filter((m) => m.stars > 0).map((m) => h('span', { class: `team__part is-${m.tone}`, style: { width: `${(m.stars / scale) * 100}%` } })),
    h('span', { class: 'team__mark', style: { left: `${(day.target / scale) * 100}%` }, 'aria-hidden': 'true' }));
}

function statusLine(api, day) {
  if (day.reached) return h('p', { class: 'team__status is-reached' }, tt('reached'));
  if (day.total >= day.target) return h('p', { class: 'team__status' }, tt('waitShares', { names: day.kidsLeft.map((m) => nameOf(api, m)).join(', ') }));
  return h('p', { class: 'team__status' }, tt('left', { n: day.target - day.total }));
}

/** Своя доля — на телефоне ребёнка. */
function myShare(api, day) {
  const me = day.members.find((m) => m.id === api.me);
  if (!me || me.role !== 'child' || !me.share) return null;
  if (me.shareDone) return h('p', { class: 'team__mine is-done' }, tt('yourDone'));
  return h('p', { class: 'team__mine' }, me.stars ? tt('yourProgress', { n: me.stars, s: me.share }) : tt('yourShare', { s: me.share }));
}

function membersList(api, day) {
  return h('ul', { class: 'team__who' }, ...day.members.map((m) => h('li', { class: `is-${m.tone}${m.id === api.me ? ' is-me' : ''}` },
    h('span', { class: 'team__dot', 'aria-hidden': 'true' }),
    h('span', { class: 'team__name' }, nameOf(api, m)),
    h('b', { class: 'team__stars' }, `${m.stars} ⭐`),
    m.role === 'child' && m.share
      ? h('span', { class: `team__share${m.shareDone ? ' is-done' : ''}` }, m.shareDone ? tt('shareDone') : tt('share', { n: m.stars, s: m.share }))
      : null)));
}

/** Семь дней недели: звёзды дня, взята ли цель, лучший день — с короной. */
function weekStrip(week, today) {
  return h('ol', { class: 'team__days' }, ...week.days.map((d) => h('li', {
    class: ['team__day', d.reached ? 'is-reached' : '', week.best?.iso === d.iso ? 'is-best' : '', d.iso === today ? 'is-today' : '', d.future ? 'is-future' : ''].filter(Boolean).join(' '),
  },
  h('span', { class: 'team__crown', 'aria-hidden': 'true' }, week.best?.iso === d.iso ? '👑' : ''),
  h('span', { class: 'team__wd' }, weekdayShort(d.iso)),
  h('b', { class: 'team__n' }, d.future ? '·' : String(d.total)))));
}

const bestLine = (week) => (week.best
  ? tt('best', { day: formatDate(week.best.iso, { weekday: 'long', day: 'numeric', month: 'long' }), n: week.best.total })
  : tt('bestNone'));

function weekWho(api, week) {
  return h('ul', { class: 'team__who team__who--week' }, ...week.members.map((m) => h('li', { class: `is-${m.tone}${m.id === api.me ? ' is-me' : ''}` },
    h('span', { class: 'team__dot', 'aria-hidden': 'true' }),
    h('span', { class: 'team__name' }, nameOf(api, m)),
    h('b', { class: 'team__stars' }, `${m.stars} ⭐`))));
}

function stepper(label, value, [lo, hi], onChange) {
  return h('div', { class: 'team__step' },
    h('span', { class: 'field__label' }, label),
    h('div', { class: 'team__step-row' },
      h('button', { type: 'button', class: 'btn btn--ghost btn--small', 'aria-label': `${label}: ${tt('less')}`, disabled: value <= lo, onclick: () => onChange(value - 1) }, '−'),
      h('b', { class: 'team__step-value' }, String(value)),
      h('button', { type: 'button', class: 'btn btn--ghost btn--small', 'aria-label': `${label}: ${tt('more')}`, disabled: value >= hi, onclick: () => onChange(value + 1) }, '+')));
}

function setup(api, goal, rerender) {
  const save = (next) => { api.put(KIND, GOAL_ID, { ...goal, ...next, by: api.me, at: new Date().toISOString() }); rerender?.(); };
  return h('details', { class: 'team__setup', open: setupOpen, ontoggle: (e) => { setupOpen = e.currentTarget.open; } },
    h('summary', {}, tt('setup')),
    stepper(tt('setupTarget'), goal.target, TARGET_RANGE, (target) => save({ target })),
    stepper(tt('setupShare'), goal.share, SHARE_RANGE, (share) => save({ share })),
    h('p', { class: 'faint team__hint' }, tt('setupHint')));
}

/** Карточка команды. Детей в семье нет — карточки нет. */
export function teamCard(api, { rerender, today = isoDate() } = {}) {
  if (!api?.circle || !hasKids(api.circle)) return null;
  const goal = goalOf(api.items(KIND));
  const data = dataOf(api);
  const day = dayResult(api.circle, data, goal, today);
  const monday = weekStart(today);
  const week = weekResult(api.circle, data, goal, monday, today);
  const last = weekResult(api.circle, data, goal, addDays(monday, -7), addDays(monday, -1));
  const passed = week.days.filter((d) => !d.future).length;
  const kid = api.role === 'child';
  const waitingN = kid ? api.items('deed').filter((d) => d.author === api.me && !okMap(api.items('ok')).has(d.id)).length : 0;

  return h('section', { class: `card card--hero team${day.reached ? ' is-reached' : ''}` },
    h('p', { class: 'caps' }, tt('caps')),
    h('h2', { class: 'card__title team__title gold-text' }, tt('title', { n: day.total, t: day.target })),
    h('p', { class: 'card__text faint' }, tt('lead', { t: day.target })),
    bar(day),
    statusLine(api, day),
    myShare(api, day),
    membersList(api, day),
    waitingN ? h('p', { class: 'faint' }, tt('waitingCount', { n: waitingN })) : null,
    h('p', { class: 'caps team__week-title' }, tt('week')),
    weekStrip(week, today),
    h('p', { class: 'team__line' }, tt('weekDays', { n: week.reached, d: passed })),
    h('p', { class: 'team__line' }, bestLine(week)),
    h('p', { class: 'caps team__week-title' }, tt('weekWho')),
    weekWho(api, week),
    last.total > 0 ? h('details', { class: 'team__last' },
      h('summary', {}, tt('lastWeek')),
      h('p', { class: 'team__line' }, bestLine(last)),
      h('p', { class: 'team__line' }, tt('lastReached', { n: last.reached, s: last.total })),
      weekWho(api, last)) : null,
    kid ? null : setup(api, goal, rerender),
  );
}
