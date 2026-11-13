import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import * as circles from './circles.js';

/* КАРТОЧКА «МЫ» на «Сегодня» — только когда есть новое от близкого (владелец 13.11.2026: «красная точка: нужна
   помощь, поддержка — и сразу видно»). «Срочно» — красная карточка, пока не прочитано. Нажатие — в «Мы». */
export function usCard() {
  const list = circles.unread();
  if (!list.length) return null;
  const last = list[0];
  const urgent = list.find((u) => u.msg.data?.signal === 'urgent');
  const shown = urgent || last;
  const name = circles.memberName(shown.circle, shown.msg.author);
  const d = shown.msg.data || {};
  return h('a', { class: `card us-card${urgent ? ' is-urgent' : ''}`, href: '#/us' },
    h('div', { class: 'card__eyebrow' },
      h('span', { class: 'card__icon' }, svg(urgent ? icons.bell : icons.rings)),
      h('span', { class: 'caps' }, t(urgent ? 'us.chat.urgentFrom' : 'us.chat.newFrom', { name })),
      h('span', { class: 'spacer' }),
      h('span', { class: 'us-card__count' }, String(list.length)),
    ),
    d.signal && d.signal !== 'urgent' ? h('p', { class: 'us-card__signal' }, t(`us.chat.signals.${d.signal}`)) : null,
    d.text ? h('p', { class: 'card__text us-card__text' }, d.text) : null,
    h('span', { class: 'love-card__link' }, t('us.card.open'), svg(icons.chevronRight, 'love-card__chevron')),
  );
}
