import { h } from '../../core/dom.js';
import { pythagoras, pairPythagoras, level } from './calc.js';
import { TX, lineBand, countText } from './texts/index.js'; // тексты на языке приложения (218)
const fold = (title, ...body) => h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, title)), h('div', { class: 'help__folder-body' }, ...body));
const para = (b, t) => (t ? h('p', {}, h('b', {}, b), ' ', t) : null);
// скобки с цифрами линии — одним куском, «(1-4-7)» не разрывается (владелец 28.11.2026)
const nb = (s) => h('span', { class: 'pyth__nb' }, s);
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const GRID = [1, 4, 7, 2, 5, 8, 3, 6, 9]; // столбцы 1-2-3 · 4-5-6 · 7-8-9

const NS = 'http://www.w3.org/2000/svg';
const at = (k) => { const i = GRID.indexOf(k); return [(i % 3) + 0.5, Math.floor(i / 3) + 0.5]; }; // центр клетки в сетке 3×3

/* ЦВЕТ И ШКАЛА (владелец 28.11.2026 по образцу: «квадрат какой-то скучный, мёртвый текст — сделать в цветах, шкала
   кубиков: нет цифры — красная, одна-две — жёлтая, достаточно и много — зелёные; поля вокруг квадрата — за что
   отвечают; премиум-стиль сохранить»). Клетка: нет цифры — красный; «мало» — жёлтый, по тем же порогам level(), что и
   советы «что делать» (у единиц мало 1–2, у двоек 1, у остальных одна цифра — уже норма); иначе — зелёный.
   Поле линии: 0 — красный, 1–2 — жёлтый, 3 и больше — зелёный. Кубиков — сколько цифр (не больше шести). */
const SEGS = 6;
const cellTone = (d, n) => (!n ? 'none' : level(d, n) === 'low' ? 'low' : 'ok');
const lineTone = (t) => (!t ? 'none' : t <= 2 ? 'low' : 'ok');
const scale = (n, tone) => h('span', { class: `pyth__scale pyth__scale--${tone}`, 'aria-hidden': 'true' },
  ...Array.from({ length: SEGS }, (_, i) => h('i', { class: i < Math.max(1, Math.min(n, SEGS)) ? 'is-on' : '' })));

/* Поля вокруг квадрата, как в классической таблице: справа — строки, снизу — столбцы, в углах — диагонали
   (сверху справа 3-5-7 «Темперамент», снизу справа 1-5-9 «Духовность»). [ключ линии, строка, столбец] доски 4×5. */
const FIELDS = [['temper', 1, 4], ['goal', 2, 4], ['family', 3, 4], ['habits', 4, 4], ['self', 5, 1], ['money', 5, 2], ['talent', 5, 3], ['spirit', 5, 4]];

/** Сетка 3×3 с наложенной линией: light(digits) подсвечивает клетки и проводит через них линию, light(null) — гасит.
    board — доска с полями линий вокруг и рабочими числами сверху (квадрат одного человека); без неё — малая сетка пары. */
function makeGrid(r, T, cls = '', board = false, caption = null) {
  const cells = Object.fromEntries(GRID.map((k, i) => [k, h('div', {
    class: `pyth__cell pyth__cell--${cellTone(k, r.counts[k])}${r.counts[k] ? '' : ' is-empty'}`,
    style: board ? { gridRow: String(Math.floor(i / 3) + 2), gridColumn: String((i % 3) + 1) } : null,
  },
  h('span', { class: 'pyth__digits' }, r.cells[k]), h('span', { class: 'pyth__name' }, T.cells[k]),
  board ? scale(r.counts[k], cellTone(k, r.counts[k])) : null)]));
  const path = document.createElementNS(NS, 'polyline');
  path.setAttribute('class', 'pyth__path');
  path.setAttribute('vector-effect', 'non-scaling-stroke');
  const over = document.createElementNS(NS, 'svg');
  over.setAttribute('class', 'pyth__over');
  over.setAttribute('viewBox', '0 0 3 3');
  over.setAttribute('preserveAspectRatio', 'none');
  over.setAttribute('aria-hidden', 'true');
  over.append(path);
  // поля линий: название, сумма, шкала; касание поля — как касание строки в списке итогов (подсветка клеток)
  const fields = board ? Object.fromEntries(FIELDS.map(([id, row, col]) => {
    const l = r.lines.find((x) => x.id === id);
    return [id, h('div', { class: `pyth__field pyth__field--${lineTone(l.total)}`, tabindex: '0', style: { gridRow: String(row), gridColumn: String(col) } },
      h('span', { class: 'pyth__field-name' }, T.ui.fields?.[id] ?? T.lines[id].name), h('b', { class: 'pyth__field-sum' }, String(l.total)), scale(l.total, lineTone(l.total)))];
  })) : {};
  // верхняя строка доски: по каким данным считали и рабочие числа (владелец 28.11.2026: подпись — внутрь квадрата, строка лишняя)
  const head = board && r.work ? h('div', { class: 'pyth__head' }, caption ? h('span', { class: 'pyth__src' }, caption) : null,
    h('span', { class: 'pyth__work' }, h('span', {}, T.ui.work), h('b', {}, r.work.join(' · ')))) : null;
  const grid = h('div', { class: `pyth__grid ${board ? 'pyth__grid--board' : ''} ${cls}`.trim() }, head, ...GRID.map((k) => cells[k]), ...Object.values(fields), over);
  const light = (digits) => {
    Object.values(cells).forEach((c) => c.classList.remove('is-lit'));
    grid.classList.toggle('is-tracing', Boolean(digits));
    path.setAttribute('points', digits ? digits.map((k) => at(k).join(',')).join(' ') : '');
    digits?.forEach((k) => cells[k].classList.add('is-lit'));
  };
  return { grid, light, fields };
}

/** Под доской — что значат цвета шкалы. */
const legend = (T) => h('p', { class: 'pyth__legend' }, ...['none', 'low', 'ok'].map((tone, i) =>
  h('span', {}, h('i', { class: `pyth__dot pyth__dot--${tone}` }), T.ui.legend[i])));

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
  // строка списка и поле линии на доске (если есть) ведут себя одинаково
  const bind = (node, l) => {
    node.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(l, node); });
    node.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') show(null, node); });
    node.addEventListener('focus', () => show(l, node));
    node.addEventListener('blur', () => show(null, node));
    node.addEventListener('click', () => (active === node ? show(null, node) : show(l, node))); // на телефоне — касание включает и выключает
  };
  grids.forEach((g) => lines.forEach((l) => { if (g.fields?.[l.id]) bind(g.fields[l.id], l); }));
  return h('ul', { class: 'pyth__sums' }, ...lines.map((l, i) => {
    const li = h('li', { tabindex: '0' }, h('span', {}, `${T.lines[l.id].name} `, h('span', { class: 'pyth__nb' }, `(${l.digits.join('-')}) `, h('b', {}, value(i)))));
    bind(li, l);
    return li;
  }));
}

/** Квадрат одного человека (или общий ресурс пары): доска с полями линий и шкалами, подпись цветов, итоги линий. */
function square(r, T, caption = null) {
  const g = makeGrid(r, T, '', true, caption);
  return [g.grid, legend(T), sums([g], r.lines, T, (i) => String(r.lines[i].total))];
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
      return h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `${x.name} `, nb(`(${l.digits.join('-')}):`), ` ${l.total} — ${T.bands[b]}`),
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
    ...square(r, T, caption), decoding(r, T)); // подпись данных и рабочие числа — в верхней строке доски
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
