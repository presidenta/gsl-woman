import { h } from '../../core/dom.js';
import { matrix, pairMatrix } from './calc.js';
import { TX } from './texts/index.js'; // тексты на языке приложения (218)
const fold = (title, ...body) => h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, title)), h('div', { class: 'help__folder-body' }, ...body));
const para = (b, t) => (t ? h('p', {}, h('b', {}, b), ' ', t) : null);
const cap = (t) => h('h3', { class: 'caps mx__cap' }, t);
const row = (n, v, keys = null) => h('li', keys ? { 'data-keys': keys, tabindex: '0' } : {}, h('span', {}, n), h('b', {}, String(v)));
const low = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/* Карточка «Матрица судьбы (Ладини)»: схема точек (SVG), род, любовь и деньги, предназначения, карта здоровья,
   расшифровка. Тексты — texts/<язык>.js. */

/** Аркан в позиции: что значит позиция (about), затем энергия — суть, плюс, минус, любовь, деньги, тело, как вывести в плюс. */
function arcanaBlock(T, label, n, about = null) {
  const x = T.arcana[n];
  const U = T.ui;
  return h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `${label}: ${n} — ${x.name}`), about ? h('p', { class: 'faint' }, about) : null,
    para(U.essence, x.essence), para(U.plus, x.plus), para(U.minus, x.minus), para(U.loveL, x.love),
    para(U.moneyL, x.money), para(U.healthL, x.health), para(U.howTo, x.howTo));
}
const short = (T, n) => `${n} — ${T.arcana[n].name}`;

/** Кармический хвост «Г2-Г1-Г»: классическая программа, если есть, и минус/выход каждого аркана. */
function tailBlock(T, tail) {
  const U = T.ui;
  const prog = T.tails[tail.join('-')];
  return h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `${U.tail}: ${tail.join(' · ')}`), h('p', { class: 'faint' }, T.special.tail),
    prog ? h('div', {}, h('p', {}, h('b', {}, `${U.program} «${prog[0]}»`)), para(U.was, prog[1]), para(U.task, prog[2])) : h('p', { class: 'faint' }, U.noProgram),
    ...tail.map((n) => para(`${short(T, n)}:`, `${U.inMinus} ${low(T.arcana[n].minus)} ${U.way} ${low(T.arcana[n].howTo)}`)));
}

/** Расшифровка личной матрицы: главные точки, предназначения, род, любовь и деньги, хвост, таланты, возрасты, чакры. */
function decoding(r, T) {
  const p = r.points;
  const P = r.purposes;
  const U = T.ui;
  const tail = [r.rays.d.x2, r.rays.d.x1, p.D]; // классическая запись Г2-Г1-Г
  const talents = [p.B, r.rays.b.x1, r.rays.b.x2];
  const ageKeys = ['A', 'F', 'B', 'G', 'C', 'Y', 'D', 'K']; // круг Ладини: от А по часовой, каждые 10 лет
  const pur = (k) => arcanaBlock(T, T.purposes[k][0], P[k], T.purposes[k][1]);
  return fold(U.decoding,
    h('p', { class: 'faint' }, T.source),
    cap(U.mainPoints),
    ...['A', 'B', 'C', 'D', 'E'].map((k) => arcanaBlock(T, T.points[k][0], p[k], T.points[k][1])),
    cap(U.purposes),
    ...['personal', 'sky', 'earth', 'social', 'spiritual', 'planetary'].map(pur),
    cap(U.rodCap),
    pur('male'), pur('female'),
    cap(U.loveMoney),
    arcanaBlock(T, U.love, r.loveMoney.love, T.special.love), arcanaBlock(T, U.money, r.loveMoney.money, T.special.money),
    arcanaBlock(T, U.balance, r.loveMoney.balance, T.special.balance),
    cap(U.tailCap),
    tailBlock(T, tail),
    h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `${U.talents}: ${talents.join(' · ')}`), h('p', { class: 'faint' }, T.special.talents),
      ...talents.map((n) => para(`${short(T, n)}:`, T.arcana[n].plus))),
    cap(U.ages),
    h('p', { class: 'faint' }, U.agesNote),
    h('ul', { class: 'pyth__lines' }, ...ageKeys.map((k, i) => row(T.ages[i], short(T, p[k])))),
    cap(U.health),
    h('p', { class: 'faint' }, T.healthNote),
    ...r.health.rows.map((x) => para(`${T.chakras[x.id][0]} (${U.agesTotal} ${short(T, x.total)}):`, T.chakras[x.id][1])));
}

// Карта здоровья: из каких точек рисунка строка (тело | энергия)
const CHAKRA_KEYS = { sahasrara: 'A B', ajna: 'a1 b1', vishuddha: 'a2 b2', anahata: 'a3 b3', manipura: 'E', svadhisthana: 'c2 d2', muladhara: 'C D' };
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

function drawing(r, T) {
  const p = r.points;
  const R = r.rays;
  const svg = el('svg', { viewBox: '0 0 300 300', class: 'mx__svg', role: 'img', 'aria-label': T.ui.aria });
  svg.append(el('rect', { x: 60, y: 60, width: 180, height: 180, class: 'mx__line' }), el('polygon', { points: '150,22 278,150 150,278 22,150', class: 'mx__line' }));
  const at = {}; // ключ точки → [x, y, кружок]
  let id = '';
  const dot = (x, y, v, big) => {
    const c = el('circle', { cx: x, cy: y, r: big ? 15 : 11, class: big ? 'mx__dot mx__dot--big' : 'mx__dot' });
    at[id] = [x, y, c];
    svg.append(c, el('text', { x, y: y + 4, class: 'mx__num' }, String(v)));
  };
  const named = (key, ...a) => { id = key; dot(...a); };
  // А слева, Б сверху, В справа, Г снизу, Д в центре; род — углы квадрата
  [['A', 22, 150], ['B', 150, 22], ['C', 278, 150], ['D', 150, 278], ['E', 150, 150],
    ['F', 60, 60], ['G', 240, 60], ['Y', 240, 240], ['K', 60, 240]].forEach(([k, x, y]) => named(k, x, y, p[k], true));
  // к центру: X1 у края, X2, X3 у центра
  const steps = [0.27, 0.5, 0.73];
  // стороны и диагонали рода — по три точки к центру (у диагоналей — две)
  [['f', 60, 60], ['g', 240, 60], ['y', 240, 240], ['k', 60, 240]].forEach(([k, x, y]) =>
    [R[k].x1, R[k].x2].forEach((v, i) => named(`${k}${i + 1}`, x + (150 - x) * [0.27, 0.7][i], y + (150 - y) * [0.27, 0.7][i], v, false)));
  // канал любви и денег — на стороне от В (справа) к Г (низ): ♥ ближе к низу, $ ближе к правому краю, Х посередине
  const lm = r.loveMoney;
  // кружки не налегают на точки диагонали Ы (владелец 27.11.2026: «11 и 19 накладываются»): канал — поперёк диагонали,
  // точка баланса — между её точками, $ — к В, ♥ — к Г
  svg.append(el('line', { x1: 226, y1: 166, x2: 166, y2: 226, class: 'mx__line mx__line--dash' }));
  [['bal', 196, 196, lm.balance], ['money', 220, 172, lm.money], ['love', 172, 220, lm.love]].forEach(([k, x, y, v]) => named(k, x, y, v, false));
  svg.append(el('text', { x: 240, y: 182, class: 'mx__sign' }, '$'), el('text', { x: 182, y: 244, class: 'mx__sign' }, '♥'));
  [['a', 22, 150], ['b', 150, 22], ['c', 278, 150], ['d', 150, 278]].forEach(([k, x, y]) =>
    [R[k].x1, R[k].x2, R[k].x3].forEach((v, i) => named(`${k}${i + 1}`, x + (150 - x) * steps[i], y + (150 - y) * steps[i], v, false)));
  // Подсветка (владелец 27.11.2026: «нажимаешь на цифры — подсвечивается, откуда они берутся, в самой матрице»)
  const path = el('polyline', { class: 'mx__path' });
  svg.insertBefore(path, svg.querySelector('circle')); // линия под кружками — числа видны
  svg.light = (keys) => {
    Object.values(at).forEach(([, , c]) => c.classList.remove('is-lit'));
    svg.classList.toggle('is-tracing', Boolean(keys));
    const pts = (keys || []).map((k) => at[k]).filter(Boolean);
    pts.forEach(([, , c]) => c.classList.add('is-lit'));
    path.setAttribute('points', pts.map(([x, y]) => `${x},${y}`).join(' '));
  };
  return svg;
}

/** Строки с data-keys (и строки таблицы) подсвечивают на рисунке точки, из которых сложено число: мышь — наведение,
   палец — касание (второе касание гасит). */
function wire(card, svg) {
  let active = null;
  const show = (node) => {
    active?.classList.remove('is-on');
    active = node;
    node?.classList.add('is-on');
    svg.light(node ? node.dataset.keys.split(' ') : null);
  };
  card.querySelectorAll('[data-keys]').forEach((n) => {
    n.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(n); });
    n.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && active === n) show(null); });
    n.addEventListener('click', () => show(active === n ? null : n));
  });
  return card;
}

export function matrixCard(iso, caption = null) {
  const r = matrix(iso);
  if (!r) return null;
  const T = TX();
  const U = T.ui;
  const P = r.purposes;
  const t = r.health.total;
  const pic = drawing(r, T);
  return wire(h('section', { class: 'card mx' },
    h('h2', { class: 'card__title' }, U.title),
    caption ? h('p', { class: 'chart__src' }, caption) : null,
    pic,
    cap(U.rod),
    h('ul', { class: 'pyth__lines' },
      row(`${U.father}: ${r.lines.father.join(' – ')}`, r.lines.fatherSum, 'F f1 f2 E y2 y1 Y'),
      row(`${U.mother}: ${r.lines.mother.join(' – ')}`, r.lines.motherSum, 'G g1 g2 E k2 k1 K')),
    cap(U.loveMoney),
    h('ul', { class: 'pyth__lines' }, row(U.love, r.loveMoney.love, 'd2 love bal'), row(U.money, r.loveMoney.money, 'c2 money bal'), row(U.balance, r.loveMoney.balance, 'c2 bal d2')),
    cap(U.purposes),
    h('ul', { class: 'pyth__lines' }, row(T.purposes.sky[0], P.sky, 'B D'), row(T.purposes.earth[0], P.earth, 'A C'), row(T.purposes.personal[0], P.personal, 'B A D C'),
      row(U.male, P.male, 'F Y'), row(U.female, P.female, 'G K'), row(U.social, P.social, 'F G Y K'), row(U.spiritual, P.spiritual, 'A B C D F G Y K'), row(T.purposes.planetary[0], P.planetary, 'A B C D F G Y K')),
    cap(U.health),
    h('table', { class: 'mx__table' },
      h('tr', {}, h('th', {}, U.chakra), h('th', {}, U.body), h('th', {}, U.energy), h('th', {}, U.total)),
      ...r.health.rows.map((x) => h('tr', { 'data-keys': CHAKRA_KEYS[x.id] }, h('td', {}, T.chakras[x.id][0]), h('td', {}, String(x.body)), h('td', {}, String(x.energy)), h('td', {}, String(x.total)))),
      h('tr', { class: 'mx__sum' }, h('td', {}, U.sum), h('td', {}, String(t.body)), h('td', {}, String(t.energy)), h('td', {}, String(t.total)))),
    decoding(r, T)), pic);
}

/** Карточка «Матрица пары»: рисунок союза (точки двоих сложены), точки ромба, любовь и деньги, предназначения с формулой
   (владелец 27.11.2026: «Небо пары 5» рядом с «17» наверху путало — Небо пары = верх + низ, подписано), полная расшифровка
   каждой точки по всем сферам. */
export function pairCard(isoA, isoB, caption) {
  const r = pairMatrix(isoA, isoB);
  if (!r) return null;
  const T = TX();
  const U = T.ui;
  const p = r.points;
  const P = r.purposes;
  const lm = r.loveMoney;
  const pp = T.pair;
  const f = (label, formula) => `${label} (${formula})`;
  const items = [
    ['center', U.center, p.E, 'E'], ['a', pp.a[0], p.A, 'A'], ['b', pp.b[0], p.B, 'B'], ['c', pp.c[0], p.C, 'C'], ['d', pp.d[0], p.D, 'D'],
    ['love', pp.love[0], lm.love, 'd2 love bal'], ['money', pp.money[0], lm.money, 'c2 money bal'],
    ['sky', f(pp.sky[0], `${pp.skyF}: ${p.B} + ${p.D}`), P.sky, 'B D'], ['earth', f(pp.earth[0], `${pp.earthF}: ${p.A} + ${p.C}`), P.earth, 'A C'],
    ['personal', f(pp.personal[0], pp.personalF), P.personal, 'B A D C'], ['social', f(pp.social[0], pp.socialF), P.social, 'F G Y K'],
    ['spiritual', f(pp.spiritual[0], pp.spiritualF), P.spiritual, 'A B C D F G Y K'],
  ];
  const pic = drawing(r, T);
  return wire(h('section', { class: 'card mx' },
    h('h2', { class: 'card__title' }, U.pairTitle),
    h('p', { class: 'chart__src' }, caption),
    h('p', { class: 'faint' }, pp.lead),
    pic,
    h('ul', { class: 'pyth__lines' }, ...items.map(([, label, n, keys]) => row(label, n, keys))),
    fold(U.pairDecoding, ...items.map(([k, label, n]) => arcanaBlock(T, label, n, pp[k][1])))), pic);
}
