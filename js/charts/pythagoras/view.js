import { h } from '../../core/dom.js';
import { pythagoras, pairPythagoras, level } from './calc.js';
import { TX, lineBand, countText } from './texts/index.js'; // тексты на языке приложения (218)
const fold = (title, ...body) => h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, title)), h('div', { class: 'help__folder-body' }, ...body));
const para = (b, t) => (t ? h('p', {}, h('b', {}, b), ' ', t) : null);
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const GRID = [1, 4, 7, 2, 5, 8, 3, 6, 9]; // столбцы 1-2-3 · 4-5-6 · 7-8-9

const NS = 'http://www.w3.org/2000/svg';
const at = (k) => { const i = GRID.indexOf(k); return [(i % 3) + 0.5, Math.floor(i / 3) + 0.5]; }; // центр клетки в сетке 3×3

/** Сетка 3×3 с наложенной линией: light(digits) подсвечивает клетки и проводит через них линию, light(null) — гасит. */
function makeGrid(r, T, cls = '') {
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
  const grid = h('div', { class: `pyth__grid ${cls}`.trim() }, ...GRID.map((k) => cells[k]), over);
  const light = (digits) => {
    Object.values(cells).forEach((c) => c.classList.remove('is-lit'));
    grid.classList.toggle('is-tracing', Boolean(digits));
    path.setAttribute('points', digits ? digits.map((k) => at(k).join(',')).join(' ') : '');
    digits?.forEach((k) => cells[k].classList.add('is-lit'));
  };
  return { grid, light };
}

/* Итоги линий в два столбика (1-2-3…1-4-7 и 2-5-8…3-5-7), число сразу за названием (владелец 27.11.2026); наведение
   мышью или касание пальцем подсвечивает клетки, из которых сложен итог, во ВСЕХ квадратах блока (у пары — в обоих)
   и проводит через них линию — видно, откуда взялось число. value(i) — что писать числом у линии i. */
function sums(grids, lines, T, value) {
  let active = null;
  const show = (l, li) => {
    active?.classList.remove('is-on');
    active = l ? li : null;
    li?.classList.toggle('is-on', Boolean(l));
    grids.forEach((g) => g.light(l ? l.digits : null));
  };
  return h('ul', { class: 'pyth__sums' }, ...lines.map((l, i) => {
    const li = h('li', { tabindex: '0' }, h('span', {}, `${T.lines[l.id].name} (${l.digits.join('-')})`), h('b', {}, value(i)));
    li.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(l, li); });
    li.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') show(null, li); });
    li.addEventListener('focus', () => show(l, li));
    li.addEventListener('blur', () => show(null, li));
    li.addEventListener('click', () => (active === li ? show(null, li) : show(l, li))); // на телефоне — касание включает и выключает
    return li;
  }));
}

/** Квадрат одного человека (или общий ресурс пары) с итогами линий. */
function square(r, T) {
  const g = makeGrid(r, T);
  return [g.grid, sums([g], r.lines, T, (i) => String(r.lines[i].total))];
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
        para(U.essence, x.essence), para(U.shows, countText(T, k, n)), para(U.act, T.advice[k].act[level(k, n)]), para(U.grow, x.grow));
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

/** Пара: два квадрата рядом, сравнение по каждой цифре с советом паре, линии обоих; сумма — свёрнутым «общим ресурсом». */
export function pairPythCard(isoA, isoB, caption, names = ['A', 'B']) {
  const r = pairPythagoras(isoA, isoB);
  if (!r) return null;
  const T = TX();
  const U = T.ui;
  const cell = (x, k) => (x.counts[k] ? x.cells[k] : '—');
  const ga = makeGrid(r.a, T, 'pyth__grid--mini');
  const gb = makeGrid(r.b, T, 'pyth__grid--mini');
  return h('section', { class: 'card pyth' },
    h('h2', { class: 'card__title' }, U.pairTitle),
    h('p', { class: 'chart__src' }, caption),
    h('p', { class: 'faint' }, U.pairLead),
    h('div', { class: 'pyth__pair' },
      h('div', {}, h('p', { class: 'caps pyth__mini-name' }, names[0]), ga.grid),
      h('div', {}, h('p', { class: 'caps pyth__mini-name' }, names[1]), gb.grid)),
    // линии обоих — как в одиночном квадрате: два столбика, наведение подсвечивает клетки в обоих квадратах
    sums([ga, gb], r.a.lines, T, (i) => `${r.a.lines[i].total} · ${r.b.lines[i].total}`),
    fold(U.compare, ...r.compare.map((c) => h('div', { class: 'chart__item' },
      h('p', { class: 'caps' }, `${c.digit} — ${T.db[c.digit].title}: ${names[0]} ${cell(r.a, c.digit)} · ${names[1]} ${cell(r.b, c.digit)} — ${U.status[c.status]}`),
      para(U.pairAdvice, T.advice[c.digit].pair[c.status])))),
    fold(U.resource, h('p', { class: 'faint' }, U.resourceNote), ...square(r, T)));
}
