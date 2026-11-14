import { h, svg, add } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { icons } from '../../ui/icons.js';
import * as help from '../../help/help.js';

/* ЭКРАН «ПОМОЩЬ» (#/help, владелец 14.11.2026) — библиотека: сверху «Первое свидание» (переход в «Знакомство»),
   ниже разделы — вопросы для разговора, общие темы для обсуждения (с «Правилами нашего дома»), комплименты.
   Раздел свёрнут до нажатия, чтобы экран читался одним взглядом. Тексты — с сервера (help/). */

function meetCard(data) {
  return h('a', { class: 'card settings__link help__meet', href: '#/meet' },
    h('span', { class: 'card__icon' }, svg(icons.rings)),
    h('span', { class: 'settings__link-text' }, h('strong', {}, t('help.meetTitle')), h('br'), h('span', { class: 'faint' }, data.meetLead)),
    svg(icons.chevronRight, 'settings__link-chevron'),
  );
}

function entry(e) {
  return h('li', { class: 'help__entry' },
    h('span', { class: 'help__text' }, e.text),
    e.note ? h('span', { class: 'help__note' }, e.note) : null,
  );
}

function itemCard(item) {
  return h('details', { class: 'card help__item' },
    h('summary', { class: 'help__summary' },
      h('span', { class: 'help__title' }, item.title),
      item.draft ? h('span', { class: 'chip help__draft' }, t('help.draft')) : null,
      svg(icons.chevronRight, 'help__chevron'),
    ),
    h('p', { class: 'card__text help__lead' }, item.lead),
    ...item.groups.map((g) => h('section', { class: 'help__group' },
      g.title ? h('h3', { class: 'caps help__group-title' }, g.title) : null,
      g.lead ? h('p', { class: 'faint' }, g.lead) : null,
      h('ol', { class: 'help__list' }, ...g.entries.map(entry)),
    )),
  );
}

export function render(view, ctx) {
  const data = help.content(ctx.lang);
  if (!data) {
    add(view, h('h1', { class: 'screen-title' }, t('help.title')), h('p', { class: 'card__text' }, t('help.waiting')));
    return;
  }
  add(view,
    h('h1', { class: 'screen-title' }, data.title),
    h('p', { class: 'help__intro' }, data.intro),
    meetCard(data),
    ...data.items.map(itemCard),
  );
}
