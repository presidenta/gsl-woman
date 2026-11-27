import { h } from '../../core/dom.js';
import { pythagoras, pairPythagoras } from './calc.js';
import { TX, lineBand, countText } from './texts/index.js'; // тексты на языке приложения (218)
const fold = (title, ...body) => h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, title)), h('div', { class: 'help__folder-body' }, ...body));
const para = (b, t) => (t ? h('p', {}, h('b', {}, b), ' ', t) : null);
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const GRID = [1, 4, 7, 2, 5, 8, 3, 6, 9]; // столбцы 1-2-3 · 4-5-6 · 7-8-9

const NS = 'http://www.w3.org/2000/svg';
const at = (k) => { const i = GRID.indexOf(k); return [(i % 3) + 0.5, Math.floor(i / 3) + 0.5]; }; // центр клетки в сетке 3×3

/* Квадрат и итоги линий — одним блоком (владелец 27.11.2026): итоги в два столбика (1-2-3…1-4-7 и 2-5-8…3-5-7), число
   сразу за названием; наведение мышью или касание пальцем на итог подсвечивает три клетки, из которых он сложен,
   и проводит через них линию — видно, откуда взялось число. */
function square(r, T) {
  const cells = Object.fromEntries(GRID.map((k) => [k, h('div', { class: `pyth__cell${r.counts[k] ? '' : ' is-empty'}` },
    h('span', { class: 'pyth__digits' }, r.cells[k]), h('span', { class: 'pyth__name' }, T.cells[k]))]));
  const path = document.createElementNS(NS, 'polyline');
  path.setAttribute('class', 'pyth__path');
  path.setAttribute('vector-effect', 'non-scaling-stroke');
  const over = document.createElementNS(NS, 'svg');
  over.setAttribute('class', 'pyth__over');
  over.setAttribute('viewBox', '0 0 3 3');
  over.setAttribute('preserveAspectRatio', 'none');
  over.setAttribute('aria-hidden', 'true');
  over.append(path);
  const grid = h('div', { class: 'pyth__grid' }, ...GRID.map((k) => cells[k]), over);
  let active = null;
  const show = (l, li) => {
    if (active) active.classList.remove('is-on');
    Object.values(cells).forEach((c) => c.classList.remove('is-lit'));
    active = l ? li : null;
    grid.classList.toggle('is-tracing', Boolean(l));
    if (!l) { path.setAttribute('points', ''); return; }
    li.classList.add('is-on');
    l.digits.forEach((k) => cells[k].classList.add('is-lit'));
    path.setAttribute('points', l.digits.map((k) => at(k).join(',')).join(' '));
  };
  const items = r.lines.map((l) => {
    const li = h('li', { tabindex: '0' }, h('span', {}, `${T.lines[l.id].name} (${l.digits.join('-')})`), h('b', {}, String(l.total)));
    li.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(l, li); });
    li.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') show(null); });
    li.addEventListener('focus', () => show(l, li));
    li.addEventListener('blur', () => show(null));
    li.addEventListener('click', () => (active === li ? show(null) : show(l, li))); // на телефоне — касание включает и выключает
    return li;
  });
  return [grid, h('ul', { class: 'pyth__sums' }, ...items)];
}

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
    ...square(r, T), decoding(r, T));
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
    ...square(r, T),
    fold(U.decoding,
      h('p', {}, T.pairNote),
      para(U.bothNone, empty.length ? `${empty.map((k) => `${k} — ${T.db[k].title.toLowerCase()}`).join('; ')}.` : U.allPresent),
      ...r.lines.map((l) => h('p', {}, h('b', {}, `${T.lines[l.id].name}: ${l.total}`), ' — ', level(l.total)))));
}
