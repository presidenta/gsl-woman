import { h, svg } from '../core/dom.js';
import { icons } from '../ui/icons.js';
import * as settings from '../settings/settings.js';
import { GROUPS, option } from './options.js';
import { ST } from './texts.js';

/* КАРТОЧКА «МОЯ КНОПКА» В НАСТРОЙКАХ — светится золотом отдельно от остальных (владелец 28.11.2026: «в настройках эта
   кнопка отдельно светится как самонастраиваемая; выпадает меню пунктов»). Слева — как кнопка выглядит на панели
   (значок раздела + шестерёнка в углу), выпадающий список — родной список телефона, как выбор языка. */
export const CARD_ID = 'shortcut-card';

export function shortcutCard(ctx) {
  const T = ST();
  const current = option(ctx.settings.shortcut);
  const id = 'shortcut-select';
  const select = h('select', { id, class: 'input select__control', 'aria-label': T.pick },
    h('option', { value: '', selected: !current }, T.none),
    // По группам, как человек ими пользуется: быстро · «Мы» · свидание и разговор · тайный архив и знания
    ...GROUPS.map((g) => h('optgroup', { label: T.groups[g.id] },
      ...g.items.map((o) => h('option', { value: o.id, selected: o.id === current?.id }, T.names[o.id][0])))));
  select.addEventListener('change', () => settings.update({ shortcut: select.value || null })); // панель перерисуется сама
  const look = h('span', { class: 'shortcut-card__look', 'aria-hidden': 'true' },
    current ? svg(current.icon) : h('span', { class: 'app-nav__ask' }, '?'),
    h('span', { class: 'shortcut-card__gear' }, svg(icons.gear)));
  return h('section', { class: 'card shortcut-card', id: CARD_ID },
    h('div', { class: 'shortcut-card__head' }, look, h('div', {},
      h('h2', { class: 'caps settings__heading shortcut-card__title' }, T.title),
      h('p', { class: 'card__text shortcut-card__lead' }, T.lead))),
    h('div', { class: 'field' }, h('label', { class: 'field__label', for: id }, T.pick),
      h('div', { class: 'select' }, select, svg(icons.chevronRight, 'select__chevron'))),
    current?.resume ? h('p', { class: 'faint shortcut-card__hint' }, T.resumeHint) : null);
}

/** Пришли по шестерёнке с панели — карточку видно сразу и она коротко вспыхивает. */
export function reveal() {
  const card = document.getElementById(CARD_ID);
  if (!card) return;
  card.scrollIntoView({ block: 'center' });
  card.classList.add('is-flash'); // карточка нарисована заново при входе — вспышка начинается с начала
  card.addEventListener('animationend', () => card.classList.remove('is-flash'), { once: true });
}
