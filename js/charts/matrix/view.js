import { h } from '../../core/dom.js';
import { matrix, pairMatrix } from './calc.js';
import { TX } from './texts/index.js'; // тексты на языке приложения (218)
const fold = (title, ...body) => h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, title)), h('div', { class: 'help__folder-body' }, ...body));
const para = (b, t) => (t ? h('p', {}, h('b', {}, b), ' ', t) : null);
const cap = (t) => h('h3', { class: 'caps mx__cap' }, t);
const row = (n, v) => h('li', {}, h('span', {}, n), h('b', {}, String(v)));
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
  const dot = (x, y, v, big) => svg.append(
    el('circle', { cx: x, cy: y, r: big ? 15 : 11, class: big ? 'mx__dot mx__dot--big' : 'mx__dot' }),
    el('text', { x, y: y + 4, class: 'mx__num' }, String(v)));
  // А слева, Б сверху, В справа, Г снизу, Д в центре; род — углы квадрата
  [[22, 150, p.A], [150, 22, p.B], [278, 150, p.C], [150, 278, p.D], [150, 150, p.E],
    [60, 60, p.F], [240, 60, p.G], [240, 240, p.Y], [60, 240, p.K]].forEach(([x, y, v]) => dot(x, y, v, true));
  // к центру: X1 у края, X2, X3 у центра
  const steps = [0.27, 0.5, 0.73];
  // стороны и диагонали рода — по три точки к центру (у диагоналей — две)
  [[60, 60, R.f], [240, 60, R.g], [240, 240, R.y], [60, 240, R.k]].forEach(([x, y, q]) =>
    [q.x1, q.x2].forEach((v, i) => dot(x + (150 - x) * [0.27, 0.7][i], y + (150 - y) * [0.27, 0.7][i], v, false)));
  // канал любви и денег — на стороне от В (справа) к Г (низ): ♥ ближе к низу, $ ближе к правому краю, Х посередине
  const lm = r.loveMoney;
  // кружки не налегают на точки диагонали Ы (владелец 27.11.2026: «11 и 19 накладываются»): канал — поперёк диагонали,
  // точка баланса — между её точками, $ — к В, ♥ — к Г
  svg.append(el('line', { x1: 226, y1: 166, x2: 166, y2: 226, class: 'mx__line mx__line--dash' }));
  [[196, 196, lm.balance], [220, 172, lm.money], [172, 220, lm.love]].forEach(([x, y, v]) => dot(x, y, v, false));
  svg.append(el('text', { x: 240, y: 182, class: 'mx__sign' }, '$'), el('text', { x: 182, y: 244, class: 'mx__sign' }, '♥'));
  [[22, 150, R.a], [150, 22, R.b], [278, 150, R.c], [150, 278, R.d]].forEach(([x, y, q]) =>
    [q.x1, q.x2, q.x3].forEach((v, i) => dot(x + (150 - x) * steps[i], y + (150 - y) * steps[i], v, false)));
  return svg;
}

export function matrixCard(iso, caption = null) {
  const r = matrix(iso);
  if (!r) return null;
  const T = TX();
  const U = T.ui;
  const P = r.purposes;
  const t = r.health.total;
  return h('section', { class: 'card mx' },
    h('h2', { class: 'card__title' }, U.title),
    caption ? h('p', { class: 'chart__src' }, caption) : null,
    drawing(r, T),
    cap(U.rod),
    h('ul', { class: 'pyth__lines' },
      row(`${U.father}: ${r.lines.father.join(' – ')}`, r.lines.fatherSum),
      row(`${U.mother}: ${r.lines.mother.join(' – ')}`, r.lines.motherSum)),
    cap(U.loveMoney),
    h('ul', { class: 'pyth__lines' }, row(U.love, r.loveMoney.love), row(U.money, r.loveMoney.money), row(U.balance, r.loveMoney.balance)),
    cap(U.purposes),
    h('ul', { class: 'pyth__lines' }, row(T.purposes.sky[0], P.sky), row(T.purposes.earth[0], P.earth), row(T.purposes.personal[0], P.personal),
      row(U.male, P.male), row(U.female, P.female), row(U.social, P.social), row(U.spiritual, P.spiritual), row(T.purposes.planetary[0], P.planetary)),
    cap(U.health),
    h('table', { class: 'mx__table' },
      h('tr', {}, h('th', {}, U.chakra), h('th', {}, U.body), h('th', {}, U.energy), h('th', {}, U.total)),
      ...r.health.rows.map((x) => h('tr', {}, h('td', {}, T.chakras[x.id][0]), h('td', {}, String(x.body)), h('td', {}, String(x.energy)), h('td', {}, String(x.total)))),
      h('tr', { class: 'mx__sum' }, h('td', {}, U.sum), h('td', {}, String(t.body)), h('td', {}, String(t.energy)), h('td', {}, String(t.total)))),
    decoding(r, T));
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
    ['center', U.center, p.E], ['a', pp.a[0], p.A], ['b', pp.b[0], p.B], ['c', pp.c[0], p.C], ['d', pp.d[0], p.D],
    ['love', pp.love[0], lm.love], ['money', pp.money[0], lm.money],
    ['sky', f(pp.sky[0], `${pp.skyF}: ${p.B} + ${p.D}`), P.sky], ['earth', f(pp.earth[0], `${pp.earthF}: ${p.A} + ${p.C}`), P.earth],
    ['personal', f(pp.personal[0], pp.personalF), P.personal], ['social', f(pp.social[0], pp.socialF), P.social],
    ['spiritual', f(pp.spiritual[0], pp.spiritualF), P.spiritual],
  ];
  return h('section', { class: 'card mx' },
    h('h2', { class: 'card__title' }, U.pairTitle),
    h('p', { class: 'chart__src' }, caption),
    h('p', { class: 'faint' }, pp.lead),
    drawing(r, T),
    h('ul', { class: 'pyth__lines' }, ...items.map(([, label, n]) => row(label, n))),
    fold(U.pairDecoding, ...items.map(([k, label, n]) => arcanaBlock(T, label, n, pp[k][1]))));
}
