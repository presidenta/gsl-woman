import { h, svg } from '../core/dom.js';
import { icons } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import { option } from './options.js';
import { ST } from './texts.js';
import * as resume from './resume.js';

/* СВОЯ КНОПКА НА ПАНЕЛИ (место бывшей «В разработке»). Большой значок — того раздела, который человек выбрал (книга,
   чат…), под ним короткое название; в правом верхнем углу значка — маленькая шестерёнка: нажал — настройки этой кнопки
   (владелец 28.11.2026: «значок двойной, чтобы было понятно, что его можно менять; шестерёнка в правом углу всегда»).
   Не выбрано — знак вопроса и «Выбрать», нажатие ведёт в настройку.
   Шестерёнка — отдельная ссылка с увеличенной невидимой зоной нажатия (палец по 8×8 не попадает), а не значок внутри
   ссылки: вложенные ссылки не работают. */
export const SETTINGS_HASH = '#/settings?shortcut';

export function navItem(choice) {
  const T = ST();
  const o = option(choice);
  const label = o ? T.names[o.id][1] : T.empty;
  const icon = o ? svg(o.icon) : h('span', { class: 'app-nav__ask', 'aria-hidden': 'true' }, '?');
  const main = h('a', { class: 'app-nav__mine-open', href: o?.hash || (o ? '#/' : SETTINGS_HASH) }, h('span', { class: 'app-nav__mine-icon' }, icon), h('span', {}, label));
  if (o?.resume) {
    main.addEventListener('click', (e) => {
      e.preventDefault();
      if (!resume.go()) toast({ title: T.resumeEmpty });
    });
  }
  const gear = h('a', { class: 'app-nav__mine-gear', href: SETTINGS_HASH, 'aria-label': T.gear }, svg(icons.gear));
  // Подсветка «я здесь», как у соседних кнопок: у «Продолжить» — раздел запомненного места
  const route = o?.resume ? resume.place()?.hash?.replace(/^#\/?/, '').split('?')[0] : o?.route;
  return h('div', { class: `app-nav__item app-nav__mine${o ? '' : ' is-empty'}`, dataset: route ? { route } : {} }, main, gear);
}
