import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { content, ideaFor, groupIdeas } from './love.js';

/* Подписи групп: дети и родные устроены одинаково (love.js → GROUPS), различаются только словами. */
export const GROUP_TEXT = {
  children: { title: 'love.children', hint: 'love.childrenHint', count: 'love.childrenCount', n: 'love.childN', ph: 'love.childNamePh', lead: 'love.childrenLead', lang: 'love.childLang' },
  family: { title: 'love.family', hint: 'love.familyHint', count: 'love.familyCount', n: 'love.familyN', ph: 'love.familyNamePh', lead: 'love.familyLead', lang: 'love.familyLang' },
};

/** Как назвать человека группы: по имени («Маша», «Папа»), без имени — «Ребёнок 2» / «Родной 2». */
export const personLabel = (group, person, index) => person.name || t(GROUP_TEXT[group].n, { n: index + 1 });

// Совместимость: так звала ребёнка прежняя версия экрана
export const childLabel = (child, index) => personLabel('children', child, index);

function groupBlock(group, ideas) {
  if (!ideas.length) return null;
  return h('div', { class: 'love-card__part' },
    h('p', { class: 'love-card__part-title caps' }, t(GROUP_TEXT[group].lead)),
    h('ul', { class: 'love-card__kids' },
      ...ideas.map((k) => h('li', {},
        h('span', { class: 'love-card__kid' }, personLabel(group, k.person, k.index)),
        h('span', { class: 'love-card__kid-kind' }, k.name),
        h('span', { class: 'card__text' }, k.text),
      ))),
  );
}

/* Карточка «Пять языков любви» на экране «Сегодня» — каждый день. Три отдельные части, по порядку (владелец
   13.11.2026): «Мой мужчина» — дело на его языке (язык ещё не выбран — приглашение пройти тест); «Дети» и
   «Родные» — по строке на каждого, у кого выбран язык: имя и что сделать для него сегодня.
   Программа не пришла — ничего. */
export function loveCard(ctx, plan) {
  const c = content(ctx.lang);
  if (!c) return null;
  const him = ideaFor('him', plan.day, ctx.lang);
  const himPart = him
    ? h('div', { class: 'love-card__part love-card__part--first' },
      h('p', { class: 'love-card__part-title caps' }, t('love.himSection')),
      h('p', { class: 'love-card__kind' }, him.name),
      h('p', { class: 'love-card__lead caps' }, t('love.todayLead')),
      h('p', { class: 'task__text love-card__idea' }, him.text),
    )
    : h('div', { class: 'love-card__part love-card__part--first' },
      h('p', { class: 'love-card__part-title caps' }, t('love.himSection')),
      h('h2', { class: 'card__title' }, t('love.inviteTitle')),
      h('p', { class: 'card__text' }, t('love.inviteText')),
      h('div', { class: 'card__actions' }, h('a', { class: 'btn btn--gold btn--quiet btn--block', href: '#/love' }, t('love.inviteBtn'))),
    );

  return h('section', { class: 'card love-card' },
    h('div', { class: 'card__eyebrow' },
      h('span', { class: 'card__icon' }, svg(icons.heart)),
      h('span', { class: 'caps' }, t('love.title')),
    ),
    himPart,
    groupBlock('children', groupIdeas('children', plan.day, ctx.lang)),
    groupBlock('family', groupIdeas('family', plan.day, ctx.lang)),
    h('a', { class: 'love-card__link', href: '#/love' }, t('love.more'), svg(icons.chevronRight, 'love-card__chevron')),
  );
}
