import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { PROGRAM_DAYS, WEEK_DAYS } from '../config.js';
import { icons } from '../ui/icons.js';
import { current } from '../account/session.js';

/* ПРОСМОТР ДНЕЙ — только для администратора «Кванта» (владелец 12.11.2026: «в моём кабинете стрелочки,
   чтобы пролистывать все дни и смотреть, как они выглядят: задания, вопросы, дизайн; у участниц этого
   быть не должно»). Роль берётся из аккаунта «Кванта» (/api/me → role: admin), у участницы её нет —
   и полоски со стрелками она не увидит.

   Листание меняет только то, какой день показывают экраны «Сегодня» и «Неделя». Дата старта, записи и
   напоминания не трогаются; перезагрузка страницы возвращает к настоящему сегодняшнему дню. */

let shown = null;          // какой день смотрим; null — настоящий
const listeners = new Set();

export const isAdmin = () => current()?.role === 'admin';

/** День для экранов: просматриваемый (у администратора) или настоящий. */
export function dayFor(realDay) {
  return isAdmin() && shown !== null ? shown : realDay;
}

export function onChange(fn) {
  listeners.add(fn);
}

function go(day) {
  shown = Math.max(1, Math.min(PROGRAM_DAYS, day));
  listeners.forEach((fn) => fn());
}

function reset() {
  shown = null;
  listeners.forEach((fn) => fn());
}

/** Полоска над экраном: ‹‹ неделя назад, ‹ день назад, «День N», день вперёд ›, неделя вперёд ››. */
export function bar(realDay) {
  if (!isAdmin()) return null;
  const day = shown ?? Math.max(1, Math.min(PROGRAM_DAYS, realDay || 1));
  const btn = (label, icon, to, double = false) => h('button', {
    type: 'button',
    class: `preview__btn${double ? ' preview__btn--double' : ''}`,
    'aria-label': label,
    disabled: to < 1 || to > PROGRAM_DAYS,
    onclick: () => go(to),
  }, svg(icon), double ? svg(icon) : null);

  return h('div', { class: 'preview', role: 'group', 'aria-label': t('preview.label') },
    h('div', { class: 'preview__head' },
      h('span', { class: 'caps preview__label' }, t('preview.label')),
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
