import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { content, ideaFor } from './love.js';

/* Карточка «Язык любви твоего мужчины» на экране «Сегодня» — каждый день.
   Язык выбран — одно дело на сегодня (и для ребёнка, если выбран его язык).
   Ещё нет — приглашение пройти тест. Программа не пришла — ничего. */
export function loveCard(ctx, plan) {
  const c = content(ctx.lang);
  if (!c) return null;
  const him = ideaFor('him', plan.day, ctx.lang);
  const child = ideaFor('child', plan.day, ctx.lang);
  const eyebrow = h('div', { class: 'card__eyebrow' },
    h('span', { class: 'card__icon' }, svg(icons.heart)),
    h('span', { class: 'caps' }, t('love.todayTitle')),
  );
  const link = h('a', { class: 'love-card__link', href: '#/love' }, t('love.more'), svg(icons.chevronRight, 'love-card__chevron'));

  if (!him) {
    return h('section', { class: 'card love-card' },
      eyebrow,
      h('h2', { class: 'card__title' }, t('love.inviteTitle')),
      h('p', { class: 'card__text' }, t('love.inviteText')),
      h('div', { class: 'card__actions' }, h('a', { class: 'btn btn--gold btn--quiet btn--block', href: '#/love' }, t('love.inviteBtn'))),
    );
  }
  return h('section', { class: 'card love-card' },
    eyebrow,
    h('p', { class: 'love-card__kind' }, him.name),
    h('p', { class: 'love-card__lead caps' }, t('love.todayLead')),
    h('p', { class: 'task__text love-card__idea' }, him.text),
    child
      ? h('div', { class: 'love-card__child' },
        h('p', { class: 'love-card__lead caps' }, t('love.childLead')),
        h('p', { class: 'card__text' }, child.text),
      )
      : null,
    link,
  );
}
