import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { content, ideaFor, childIdeas } from './love.js';

/** Как назвать ребёнка: по имени, а без имени — «Ребёнок 2». */
export const childLabel = (child, index) => child.name || t('love.childN', { n: index + 1 });

/* Карточка «Язык любви» на экране «Сегодня» — каждый день.
   Язык мужчины выбран — одно дело на сегодня для него; нет — приглашение пройти тест. Ниже — по строке на
   каждого ребёнка с выбранным языком: имя и что сделать для него сегодня (владелец 13.11.2026).
   Программа не пришла — ничего. */
export function loveCard(ctx, plan) {
  const c = content(ctx.lang);
  if (!c) return null;
  const him = ideaFor('him', plan.day, ctx.lang);
  const kids = childIdeas(plan.day, ctx.lang);
  const eyebrow = h('div', { class: 'card__eyebrow' },
    h('span', { class: 'card__icon' }, svg(icons.heart)),
    h('span', { class: 'caps' }, t('love.title')),
  );
  const link = h('a', { class: 'love-card__link', href: '#/love' }, t('love.more'), svg(icons.chevronRight, 'love-card__chevron'));
  const children = kids.length
    ? h('div', { class: 'love-card__child' },
      h('p', { class: 'love-card__lead caps' }, t('love.childrenLead')),
      h('ul', { class: 'love-card__kids' },
        ...kids.map((k) => h('li', {},
          h('span', { class: 'love-card__kid' }, childLabel(k.child, k.index)),
          h('span', { class: 'love-card__kid-kind' }, k.name),
          h('span', { class: 'card__text' }, k.text),
        ))),
    )
    : null;

  if (!him) {
    return h('section', { class: 'card love-card' },
      eyebrow,
      h('h2', { class: 'card__title' }, t('love.inviteTitle')),
      h('p', { class: 'card__text' }, t('love.inviteText')),
      h('div', { class: 'card__actions' }, h('a', { class: 'btn btn--gold btn--quiet btn--block', href: '#/love' }, t('love.inviteBtn'))),
      children,
    );
  }
  return h('section', { class: 'card love-card' },
    eyebrow,
    h('p', { class: 'love-card__kind' }, him.name),
    h('p', { class: 'love-card__lead caps' }, t('love.todayLead')),
    h('p', { class: 'task__text love-card__idea' }, him.text),
    children,
    link,
  );
}
