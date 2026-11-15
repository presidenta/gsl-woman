import { h, svg } from '../core/dom.js';
import { icons } from './icons.js';

/* ПЛАШКА — один вид для всех пунктов-разделов (владелец 15.11.2026: «на экране всё в одном стиле, без хаоса и
   разбросанности»): круглый значок одного размера, название крупным шрифтом, строка пояснения, под ней число и
   стрелка справа. Два вида:
     plateLink — переход на другой экран («Первое свидание», «Помощь»);
     platePanel — раскрывается на месте (пункты «Помощи», «Письмо себе в будущее»): стрелка поворачивается вниз.
   Вид — styles/components/plate.css. */

function head({ icon, title, author, lead, chip }) {
  return [
    h('span', { class: 'plate__icon', 'aria-hidden': 'true' }, svg(icon || icons.sparkle)),
    h('span', { class: 'plate__text' },
      // author — имя автора другим цветом перед названием: «Павел Раков — Кто перед тобой?» (15.11.2026)
      h('span', { class: 'plate__title' }, author ? h('span', { class: 'plate__author' }, author) : null, author ? ' — ' : null, title),
      lead ? h('span', { class: 'plate__lead' }, lead) : null,
      // Число — под названием, а не отдельным столбцом: название не сжимается в узкую колонку
      chip ? h('span', { class: 'plate__chip' }, chip) : null,
    ),
    h('span', { class: 'plate__arrow', 'aria-hidden': 'true' }, svg(icons.chevronRight)),
  ];
}

/** Плашка-переход: { icon, title, lead?, chip?, href, cls? }. */
export function plateLink({ href, cls = '', ...rest }) {
  return h('a', { class: `card plate ${cls}`.trim(), href }, ...head(rest));
}

/** Плашка, которая раскрывается на месте: { icon, title, author?, lead?, chip?, open?, body: [узлы], cls? }. */
export function platePanel({ open = false, body = [], cls = '', ...rest }) {
  const node = h('details', { class: `card plate plate--panel ${cls}`.trim() },
    h('summary', { class: 'plate__head' }, ...head(rest)),
    h('div', { class: 'plate__body' }, ...body),
  );
  node.open = open;
  return node;
}

/** Плашка без перехода — пустое место раздела: тот же значок и шрифт, по центру ничего не «прыгает». */
export function plateNote({ icon, title, lead }) {
  return h('div', { class: 'card plate plate--note' },
    h('span', { class: 'plate__icon', 'aria-hidden': 'true' }, svg(icon || icons.sparkle)),
    h('span', { class: 'plate__text' },
      h('span', { class: 'plate__title' }, title),
      lead ? h('span', { class: 'plate__lead' }, lead) : null,
    ),
  );
}
