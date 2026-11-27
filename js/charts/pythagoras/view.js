import { h } from '../../core/dom.js';
import { pythagoras, pairPythagoras } from './calc.js';
import { TX, lineBand, countText } from './texts/index.js'; // тексты на языке приложения (218)
const fold = (title, ...body) => h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, title)), h('div', { class: 'help__folder-body' }, ...body));
const para = (b, t) => (t ? h('p', {}, h('b', {}, b), ' ', t) : null);
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const GRID = [1, 4, 7, 2, 5, 8, 3, 6, 9]; // столбцы 1-2-3 · 4-5-6 · 7-8-9

const grid = (r, T) => h('div', { class: 'pyth__grid' }, ...GRID.map((k) => h('div', { class: `pyth__cell${r.counts[k] ? '' : ' is-empty'}` },
  h('span', { class: 'pyth__digits' }, r.cells[k]), h('span', { class: 'pyth__name' }, T.cells[k]))));
const lineList = (r, T) => h('ul', { class: 'pyth__lines' }, ...r.lines.map((l) => h('li', {},
  h('span', {}, `${T.lines[l.id].name} (${l.digits.join('-')})`), h('b', {}, String(l.total)))));

/** Расшифровка: 9 цифр по числу вхождений, затем 8 линий по сумме. */
function decoding(r, T) {
  const U = T.ui;
  return fold(U.decoding,
    h('p', { class: 'faint' }, T.source),
    h('h3', { class: 'caps mx__cap' }, U.digits),
    ...DIGITS.map((k) => {
      const x = T.db[k];
      const n = r.counts[k];
      return h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `${k} — ${x.title} (${n ? r.cells[k] : U.none})`),
        para(U.essence, x.essence), para(U.shows, countText(T, k, n)), para(U.grow, x.grow));
    }),
    h('h3', { class: 'caps mx__cap' }, U.lines),
    h('p', { class: 'faint' }, U.scale),
    ...r.lines.map((l) => {
      const x = T.lines[l.id];
      const b = lineBand(l.total);
      return h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `${x.name} (${l.digits.join('-')}): ${l.total} — ${T.bands[b]}`),
        para(U.what, x.essence), para(U.shows, x.levels[b]));
    }));
}

/* Карточка «Квадрат Пифагора»: рабочие числа, сетка 3×3, суммы линий, расшифровка. */
export function pythagorasCard(iso, caption = null) {
  const r = pythagoras(iso);
  if (!r) return null;
  const T = TX();
  return h('section', { class: 'card pyth' },
    h('h2', { class: 'card__title' }, T.ui.title),
    caption ? h('p', { class: 'chart__src' }, caption) : null,
    h('p', { class: 'faint' }, `${T.ui.work}: ${r.work.join(' · ')}`),
    grid(r, T), lineList(r, T), decoding(r, T));
}

/** Квадрат пары: общая сетка (цифры двоих вместе) и линии пары. */
export function pairPythCard(isoA, isoB, caption) {
  const r = pairPythagoras(isoA, isoB);
  if (!r) return null;
  const T = TX();
  const U = T.ui;
  const empty = DIGITS.filter((k) => !r.counts[k]);
  const level = (n) => (n >= 10 ? U.pairStrong : n <= 4 ? U.pairWeak : U.pairMid);
  return h('section', { class: 'card pyth' },
    h('h2', { class: 'card__title' }, U.pairTitle),
    h('p', { class: 'chart__src' }, caption),
    h('p', { class: 'faint' }, U.pairLead),
    grid(r, T), lineList(r, T),
    fold(U.decoding,
      h('p', {}, T.pairNote),
      para(U.bothNone, empty.length ? `${empty.map((k) => `${k} — ${T.db[k].title.toLowerCase()}`).join('; ')}.` : U.allPresent),
      ...r.lines.map((l) => h('p', {}, h('b', {}, `${T.lines[l.id].name}: ${l.total}`), ' — ', level(l.total)))));
}
