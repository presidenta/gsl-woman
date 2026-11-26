import { h } from '../../core/dom.js';
import { zonedToUtc, chart, CENTERS, TYPES, AUTHORITIES, BODIES, BODY_RU } from './calc.js';

/* Карточка «Human Design»: тип, авторитет, профиль, крест, центры, каналы, активации Личности и Дизайна. Нужны дата, время
   и город с часовым поясом (подсказка города в анкете). Библиотека астрономии (astronomy.js, ~400 КБ) грузится только
   здесь, когда карточку открыли, — запуск приложения не тяжелеет. Бодиграф и трактовки — следующим шагом. */
export function hdCard({ date, time, city }) {
  const tz = city && typeof city === 'object' ? city.tz : null;
  const head = h('h2', { class: 'card__title' }, 'Human Design');
  if (!date || !time || !tz) {
    return h('section', { class: 'card hd' }, head, h('p', { class: 'faint' }, 'Для расчёта нужны дата, время и город рождения (город — выбери из подсказки).'));
  }
  const body = h('div', {}, h('p', { class: 'faint' }, 'Считаем…'));
  import('./astronomy.js').then((A) => {
    const r = chart(A, zonedToUtc(date, time, tz));
    const row = (n, v) => h('li', {}, h('span', {}, n), h('b', {}, v));
    const acts = (src) => h('ul', { class: 'pyth__lines hd__acts' }, ...BODIES.map((b) => row(BODY_RU[b], `${src[b].gate}.${src[b].line}`)));
    body.replaceChildren(
      h('ul', { class: 'pyth__lines' },
        row('Тип', TYPES[r.type]), row('Авторитет', AUTHORITIES[r.authority]), row('Профиль', r.profile),
        row('Инкарнационный крест', r.cross.join(' / '))),
      h('h3', { class: 'caps mx__cap' }, 'Центры'),
      h('p', {}, h('b', {}, 'Определённые: '), r.defined.map((c) => CENTERS[c]).join(', ') || '—'),
      h('p', {}, h('b', {}, 'Открытые: '), r.open.map((c) => CENTERS[c]).join(', ') || '—'),
      h('h3', { class: 'caps mx__cap' }, 'Каналы'),
      h('p', {}, r.channels.join(' · ') || '—'),
      h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, 'Активации: Личность и Дизайн')),
        h('div', { class: 'help__folder-body hd__cols' },
          h('div', {}, h('p', { class: 'caps' }, 'Личность'), acts(r.personality)),
          h('div', {}, h('p', { class: 'caps' }, 'Дизайн'), acts(r.design)))));
  }).catch(() => body.replaceChildren(h('p', { class: 'faint' }, 'Не получилось загрузить расчёт — открой ещё раз.')));
  return h('section', { class: 'card hd' }, head, body);
}
