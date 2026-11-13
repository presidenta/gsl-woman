import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { content, ideaFor, groupIdeas } from './love.js';
import { KIND_ICON } from './kind-icons.js';

/* Подписи групп: дети и родные устроены одинаково (love.js → GROUPS), различаются только словами. */
export const GROUP_TEXT = {
  children: { title: 'love.children', hint: 'love.childrenHint', count: 'love.childrenCount', n: 'love.childN', ph: 'love.childNamePh', lead: 'love.childrenLead', lang: 'love.childLang' },
  family: { title: 'love.family', hint: 'love.familyHint', count: 'love.familyCount', n: 'love.familyN', ph: 'love.familyNamePh', lead: 'love.familyLead', lang: 'love.familyLang' },
};

/** Как назвать человека группы: по имени («Маша», «Папа»), без имени — «Ребёнок 2» / «Родной 2». */
export const personLabel = (group, person, index) => person.name || t(GROUP_TEXT[group].n, { n: index + 1 });

// Совместимость: так звала ребёнка прежняя версия экрана
export const childLabel = (child, index) => personLabel('children', child, index);

/* КАРТОЧКА — ТРИ РАЗДЕЛА, как были (владелец 13.11.2026: «мужчина первым, дети отдельно, родители и родные
   отдельно — три раздела, хватит, больше их не дробить»). Внутри раздела у каждого человека — строка, где сразу
   видно, для кого и что сделать («выделять, что нужно делать и для кого, чтобы не бегать по всему тексту»):
     для кого — знак языка в золотом медальоне и имя крупно; рядом — золотая плашка языка;
     что сделать — панель с золотой чертой слева, подпись «Сделай сегодня», первое слово — само действие
     («Скажи», «Подари», «Обними») — золотом. */
function deedText(text) {
  const m = /^([^\s,.:;!?—]+)([\s\S]*)$/.exec(text || '');
  return h('p', { class: 'deed__text' }, m ? [h('strong', { class: 'deed__verb' }, m[1]), m[2]] : text);
}

// Строка одного человека: у мужчины имя — сам раздел, поэтому крупно стоит язык
function deed({ who = '', kind, name, text }) {
  return h('div', { class: 'deed' },
    h('div', { class: 'deed__head' },
      h('span', { class: 'deed__seal', 'aria-hidden': 'true' }, svg(KIND_ICON[kind] || icons.heart)),
      who
        ? h('span', { class: 'deed__titles' }, h('span', { class: 'deed__who' }, who), h('span', { class: 'deed__lang' }, name))
        : h('span', { class: 'deed__titles' }, h('span', { class: 'deed__who' }, name)),
    ),
    h('div', { class: 'deed__do' },
      h('p', { class: 'deed__label caps' }, t('love.doToday')),
      deedText(text),
    ),
  );
}

function section(title, ...rows) {
  return h('div', { class: 'love-card__part' }, h('p', { class: 'love-card__part-title caps' }, title), ...rows);
}

function groupBlock(group, ideas) {
  if (!ideas.length) return null;
  return section(t(GROUP_TEXT[group].lead),
    ...ideas.map((k) => deed({ who: personLabel(group, k.person, k.index), kind: k.kind, name: k.name, text: k.text })));
}

/* Карточка «Пять языков любви» на экране «Сегодня» — каждый день. Три отдельные части, по порядку (владелец
   13.11.2026): «Мой мужчина» — дело на его языке (язык ещё не выбран — приглашение пройти тест); «Дети» и
   «Родные» — по делу на каждого, у кого выбран язык. Программа не пришла — ничего. */
export function loveCard(ctx, plan) {
  const c = content(ctx.lang);
  if (!c) return null;
  const him = ideaFor('him', plan.day, ctx.lang);
  const himPart = him
    ? section(t('love.himSection'), deed({ kind: him.kind, name: him.name, text: him.text }))
    : h('div', { class: 'love-card__part' },
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
