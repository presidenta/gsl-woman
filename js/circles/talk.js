import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { read, write } from '../core/store.js';
import { icons } from '../ui/icons.js';
import * as circles from './circles.js';

/* «РАЗГОВОР ПАРЫ» — седьмой день недели (владелец 13.11.2026: «день обсуждений, итогов и разговоров»; ТЗ раздел 7).
   Тема недели и три вопроса — из программы (plan.talk, сервер gsl/talks/). «Мы поговорили»: в паре — отметка в
   контуре (talk, id «неделя.участник»), видна обоим; без пары — на этом телефоне (talks-local). */

const LOCAL = 'talks-local';

function state(week) {
  const p = circles.pair();
  if (p && circles.isComplete(p)) {
    const marks = circles.items(p.id, 'talk').filter((x) => x.data?.week === week);
    return { pair: p, mine: marks.some((x) => x.author === p.me), both: new Set(marks.map((x) => x.author)).size >= 2 };
  }
  return { pair: null, mine: !!(read(LOCAL, {}) || {})[week], both: false };
}

function mark(week) {
  const p = circles.pair();
  if (p && circles.isComplete(p)) {
    const id = `${circles.compact(week)}.${circles.short(p.me)}`;
    if (circles.item(p.id, 'talk', id)) circles.drop(p.id, 'talk', id);
    else circles.put(p.id, 'talk', id, { week, done: true });
    return;
  }
  const s = { ...(read(LOCAL, {}) || {}) };
  if (s[week]) delete s[week];
  else s[week] = true;
  write(LOCAL, s);
}

/** Карточка на «Сегодня» в седьмой день. */
export function talkCard(ctx, plan) {
  if (plan.dayInWeek !== 7 || !plan.talk) return null;
  const week = circles.weekOf(ctx.todayIso);
  const s = state(week);
  const note = s.both ? t('us.talk.both') : s.mine ? (s.pair ? t('us.talk.mine') : t('us.talk.solo')) : '';
  return h('section', { class: 'card talk' },
    h('div', { class: 'card__eyebrow' },
      h('span', { class: 'card__icon' }, svg(icons.rings)),
      h('span', { class: 'caps' }, t('us.talk.title')),
    ),
    h('p', { class: 'card__text faint' }, t('us.talk.lead')),
    h('p', { class: 'caps talk__theme-label' }, t('us.talk.theme')),
    h('h2', { class: 'card__title talk__theme' }, plan.talk.title),
    h('ol', { class: 'talk__questions' }, ...plan.talk.questions.map((q) => h('li', {}, q))),
    h('div', { class: 'card__actions' },
      h('button', {
        type: 'button',
        class: `btn btn--block${s.mine ? ' water__drink is-done' : ' btn--gold'}`,
        'aria-pressed': String(s.mine),
        onclick: () => mark(week),
      }, svg(icons.check, 'water__drink-icon'), t('us.talk.done')),
    ),
    note ? h('p', { class: `talk__note${s.both ? ' is-both' : ''}` }, note) : null,
  );
}
