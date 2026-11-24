import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { PROGRAM_DAYS, WEEK_DAYS } from '../config.js';
import { icons } from '../ui/icons.js';
import { current } from '../account/session.js';

/* ЛИСТАНИЕ ДНЕЙ.
   • Администратор «Кванта» (владелец 12.11.2026: «в моём кабинете стрелочки, чтобы пролистывать все дни и смотреть,
     как они выглядят»): все дни программы. Роль — из аккаунта «Кванта» (/api/me → role: admin).
   • Человек (владелец 24.11.2026: «у клиента можно только 7 дней назад листать… и выполнять задание, если он что-то
     ещё хочет успеть»; «возьми так, как у администратора, сделай только 7 дней… и всё»): та же полоска —
     7 прошедших дней, окно каждый день сдвигается на один. Прошедший день открывается целиком, как у администратора,
     и записывается в свой день. Вперёд — до сегодняшнего.

   Листание меняет только то, какой день показывают экраны. Дата старта, записи и напоминания не трогаются;
   перезагрузка страницы возвращает к настоящему сегодняшнему дню. */

/** Сколько прошедших дней видит человек. */
export const PAST_DAYS = 7;

let shown = null;          // какой день смотрим; null — настоящий
let realNow = 0;           // настоящий день программы — с последней отрисовки
const listeners = new Set();

export const isAdmin = () => current()?.role === 'admin';

/** Границы листания: у администратора — вся программа, у человека — 7 прошедших дней и сегодняшний. */
export function bounds(realDay) {
  return isAdmin() ? [1, PROGRAM_DAYS] : [Math.max(1, realDay - PAST_DAYS), realDay];
}

/** Прошедший день из окна человека (7 дней до сегодняшнего). */
export function canOpen(day, realDay) {
  return day >= Math.max(1, realDay - PAST_DAYS) && day < realDay;
}

/** День для экранов: просматриваемый или настоящий. У человека просмотр за чертой окна (окно сдвинулось за ночь)
    сам возвращается к сегодняшнему. */
export function dayFor(realDay) {
  realNow = realDay;
  if (shown !== null && !isAdmin() && !canOpen(shown, realDay)) shown = null;
  return shown ?? realDay;
}

export function onChange(fn) {
  listeners.add(fn);
}

function go(day) {
  const [lo, hi] = bounds(realNow);
  const to = Math.max(lo, Math.min(hi, day));
  shown = !isAdmin() && to === realNow ? null : to;
  listeners.forEach((fn) => fn());
}

function reset() {
  shown = null;
  listeners.forEach((fn) => fn());
}

/** Полоска над экранами «Сегодня» и «Неделя» — одна и та же: ‹‹ неделя назад, ‹ день назад, «День N», день вперёд ›,
    неделя вперёд ››. Администратор — вся программа; человек (владелец 24.11.2026: «возьми так, как у администратора,
    сделай только 7 дней») — 7 дней назад и обратно до сегодняшнего. */
export function bar(realDay) {
  const admin = isAdmin();
  if (!admin && realDay < 2) return null;
  const [lo, hi] = bounds(realDay);
  const day = shown ?? Math.max(1, Math.min(PROGRAM_DAYS, realDay || 1));
  const btn = (label, icon, to, double = false) => h('button', {
    type: 'button',
    class: `preview__btn${double ? ' preview__btn--double' : ''}`,
    'aria-label': label,
    disabled: to < lo || to > hi,
    onclick: () => go(to),
  }, svg(icon), double ? svg(icon) : null);

  const label = admin ? t('preview.label') : t('preview.pastLabel', { n: PAST_DAYS });
  return h('div', { class: 'preview', role: 'group', 'aria-label': label },
    h('div', { class: 'preview__head' },
      h('span', { class: 'caps preview__label' }, label),
      shown !== null && shown !== realDay
        ? h('button', { type: 'button', class: 'preview__back', onclick: reset }, t('preview.back'))
        : null,
    ),
    h('div', { class: 'preview__row' },
      btn(t('preview.prevWeek'), icons.chevronLeft, day - WEEK_DAYS, true),
      btn(t('preview.prevDay'), icons.chevronLeft, day - 1),
      h('span', { class: 'preview__day gold-text' }, t('today.dayOf', { day })),
      btn(t('preview.nextDay'), icons.chevronRight, day + 1),
      btn(t('preview.nextWeek'), icons.chevronRight, day + WEEK_DAYS, true),
    ),
  );
}
