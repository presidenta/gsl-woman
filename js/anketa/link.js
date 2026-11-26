import { h, svg } from '../core/dom.js';
import { icons } from '../ui/icons.js';
import { at } from './texts.js';

/* Ссылка на «Единую анкету партнёра» из других экранов — одна строка стыковки (владелец 26.11.2026):
   «В поиске» и «Знакомство» — отправить анкету тому, с кем познакомился(лась); «Мы» → пара — «Наш итог». */
export function anketaLink({ href = '#/anketa', text = at('plateTitle'), lead = at('plateLead') } = {}) {
  return h('a', { class: 'card settings__link anketa-entry', href },
    h('span', { class: 'card__icon' }, svg(icons.check)),
    h('span', { class: 'settings__link-text' }, h('b', {}, text), h('br'), h('span', { class: 'faint' }, lead)),
    svg(icons.chevronRight, 'settings__link-chevron'));
}
