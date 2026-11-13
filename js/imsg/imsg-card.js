import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { content, myLanguage } from '../love/love.js';

/* «Я-СООБЩЕНИЕ» на экране «Сегодня» — КАЖДЫЙ ДЕНЬ (владелец 13.11.2026; до 40 — дни 4–6). Какой пример в какой
   день — program/index.js → imsgOf; в дни 4–6 он связан с заданием дня 1, 2 или 3 этой недели: ситуация,
   как обычно говорят и как сказать по-новому через «я». Ниже — формула и правило «после «я чувствую»
   только чувство». Если выбран свой язык любви — как сказать о нём мужчине и как поблагодарить его;
   нет — приглашение пройти тест. */
export function imsgCard(ctx, plan) {
  const m = plan.imsg;
  if (!m) return null;
  const mine = myLanguage(plan.day, ctx.lang);

  return h('section', { class: 'card imsg' },
    h('div', { class: 'card__eyebrow' },
      h('span', { class: 'card__icon' }, svg(icons.sparkle)),
      h('span', { class: 'caps' }, t('imsg.title')),
    ),
    h('p', { class: 'imsg__remind' }, t('imsg.remind')),
    h('div', { class: 'imsg__example' },
      h('p', { class: 'imsg__situation' }, m.title),
      h('div', { class: 'imsg__line imsg__line--old' },
        h('span', { class: 'imsg__tag' }, t('imsg.usual')),
        h('q', { class: 'imsg__text' }, m.old),
      ),
      h('div', { class: 'imsg__line imsg__line--new' },
        h('span', { class: 'imsg__tag' }, t('imsg.fresh')),
        h('q', { class: 'imsg__text' }, m.say),
      ),
    ),
    h('p', { class: 'imsg__formula' }, t('imsg.formula')),
    h('p', { class: 'imsg__rule' }, t('imsg.rule')),
    mine
      ? h('div', { class: 'imsg__love' },
        h('p', { class: 'imsg__love-title' }, svg(icons.heart, 'imsg__heart'), t('imsg.myLang', { name: mine.name })),
        h('div', { class: 'imsg__line imsg__line--new' }, h('span', { class: 'imsg__tag' }, t('imsg.tell')), h('q', { class: 'imsg__text' }, mine.tell)),
        h('div', { class: 'imsg__line imsg__line--new' }, h('span', { class: 'imsg__tag' }, t('imsg.thanks')), h('q', { class: 'imsg__text' }, mine.thanks)),
      )
      : content(ctx.lang)
        ? h('div', { class: 'imsg__love' },
          h('p', { class: 'card__text' }, t('imsg.loveInvite')),
          h('a', { class: 'love-card__link', href: '#/love' }, t('imsg.loveBtn'), svg(icons.chevronRight, 'love-card__chevron')),
        )
        : null,
  );
}
