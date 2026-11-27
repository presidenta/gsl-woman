import { h } from '../../core/dom.js';
import { matrix, pairMatrix } from './calc.js';
import { TX } from './texts/index.js';
import { PL } from './places/index.js'; // тексты по местам матрицы: хвост, работа… (229) // тексты на языке приложения (218)
const fold = (title, ...body) => h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, title)), h('div', { class: 'help__folder-body' }, ...body));
const para = (b, t) => (t ? h('p', {}, h('b', {}, b), ' ', t) : null);
const cap = (t) => h('h3', { class: 'caps mx__cap' }, t);
/* Раздел под рисунком — свёрнут (владелец 27.11.2026: «экран короткий, не видно, откуда цифры»); открыт только один,
   поэтому числа всегда рядом с рисунком. */
const sec = (title, ...body) => h('details', { class: 'help__folder', name: 'mx-sec' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, title)), h('div', { class: 'help__folder-body' }, ...body));
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

/** Кармический хвост «Г2-Г1-Г»: вступление, классическая программа (если есть) и у каждого числа — только текст хвоста
   (ячейка places/tail, 229): что принесено из прошлого и как проработать. */
function tailBlock(T, tail) {
  const U = T.ui;
  const X = PL('tail');
  const prog = T.tails[tail.join('-')];
  return h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `${X.ui.title}: ${tail.join(' · ')}`),
    ...X.intro.map((t) => h('p', { class: 'faint' }, t)),
    prog ? h('div', {}, h('p', {}, h('b', {}, `${U.program} «${prog[0]}»`)), para(U.was, prog[1]), para(U.task, prog[2])) : h('p', { class: 'faint' }, U.noProgram),
    ...tail.map((n) => h('div', {}, h('p', {}, h('b', {}, short(T, n))), para(X.ui.past, X.text[n].past), para(X.ui.how, X.text[n].how))));
}

/** Центр (Д) — главная цифра матрицы (владелец 27.11.2026: «то, что там есть, и ещё полное описание аркана»): где черпает
   силы (ячейка center) + полное описание аркана (ячейка codes: описание, рекомендации, над чем работать) + занятия (work). */
function centerBlock(T, n) {
  const C = PL('center');
  const X = PL('codes');
  const W = PL('work');
  const A = X.text[n];
  return h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `${C.ui.title}: ${short(T, n)}`), h('p', { class: 'faint' }, C.ui.lead),
    para(C.ui.power, C.text[n]),
    h('p', {}, h('b', {}, `${X.ui.title}: ${A.title}`)),
    h('p', {}, h('b', {}, X.ui.about)), ...A.about.map((t) => h('p', {}, t)),
    para(X.ui.recs, A.recs), para(X.ui.minus, A.minus), para(C.ui.work, W.text[n]));
}

/** Предназначения (личное, Небо, Земля, социальное, духовное, планетарное): что значит предназначение (texts) + духовное
   послание его числа (ячейка places/purpose, 233). Число уже было выше — послание не повторяется. */
function purposeBlocks(T, P) {
  const X = PL('purpose');
  const seen = new Set();
  return ['personal', 'sky', 'earth', 'social', 'spiritual', 'planetary'].map((k) => {
    const n = P[k];
    const first = !seen.has(n);
    seen.add(n);
    return h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `${T.purposes[k][0]}: ${short(T, n)}`), h('p', { class: 'faint' }, T.purposes[k][1]),
      ...(first ? [h('p', {}, h('b', {}, X.ui.title)), ...X.text[n].about.map((t) => h('p', {}, t))] : [h('p', { class: 'faint' }, X.ui.same)]));
  });
}

/** Верх матрицы — Б и Б1 (таланты, ангелы: что даётся сейчас): только текст верха (ячейка places/top, 232).
   Третья сверху (Б2) — отдельный блок «работа» сразу после. */
function topBlock(T, b, b1) {
  const X = PL('top');
  const one = (label, n) => h('div', {}, h('p', {}, h('b', {}, `${label}: ${short(T, n)}`)), ...X.text[n].about.map((t) => h('p', {}, t)));
  return h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `${X.ui.title}: ${b} · ${b1}`), h('p', { class: 'faint' }, X.ui.lead),
    ...(b1 === b ? [one(`${X.ui.b} · ${X.ui.b1}`, b)] : [one(X.ui.b, b), one(X.ui.b1, b1)])); // одно число на обоих местах — текст один раз
}

/** Работа — третья цифра сверху (Б2): только текст о работе (ячейка places/work, 229). */
function workBlock(n) {
  const X = PL('work');
  return h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `${X.ui.title}: ${n}`), h('p', { class: 'faint' }, X.ui.lead), h('p', {}, X.text[n]));
}

/** Вход в денежный канал (В2): только текст о деньгах (ячейка places/money, 231). Пол человека матрица не знает,
   поэтому у 3 и 4 — оба текста: для женщины и для мужчины. */
function moneyBlock(T, n) {
  const X = PL('money');
  const M = X.text[n];
  return h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `${X.ui.title}: ${short(T, n)}`), h('p', { class: 'faint' }, X.ui.lead),
    M.intro ? h('p', {}, M.intro) : null, para(X.ui.prof, M.prof), para(X.ui.woman, M.woman), para(X.ui.man, M.man), para(X.ui.block, M.block));
}

/** Расшифровка личной матрицы: главные точки, предназначения, род, любовь и деньги, хвост, таланты, возрасты, чакры. */
function decoding(r, T) {
  const p = r.points;
  const P = r.purposes;
  const U = T.ui;
  const tail = [r.rays.d.x2, r.rays.d.x1, p.D]; // классическая запись Г2-Г1-Г
  const ageKeys = ['A', 'F', 'B', 'G', 'C', 'Y', 'D', 'K']; // круг Ладини: от А по часовой, каждые 10 лет
  const pur = (k) => arcanaBlock(T, T.purposes[k][0], P[k], T.purposes[k][1]);
  return fold(U.decoding,
    h('p', { class: 'faint' }, T.source),
    centerBlock(T, p.E), // центр — первым и полностью (230)
    cap(U.mainPoints),
    ...['A', 'B', 'C', 'D'].map((k) => arcanaBlock(T, T.points[k][0], p[k], T.points[k][1])),
    cap(U.purposes),
    ...purposeBlocks(T, P), // предназначения — духовные послания своим текстом (233)
    cap(U.rodCap),
    pur('male'), pur('female'),
    cap(U.loveMoney),
    arcanaBlock(T, U.love, r.loveMoney.love, T.special.love), arcanaBlock(T, U.money, r.loveMoney.money, T.special.money),
    arcanaBlock(T, U.balance, r.loveMoney.balance, T.special.balance),
    moneyBlock(T, r.rays.c.x2), // вход в денежный канал — свой текст (231)
    cap(U.tailCap),
    tailBlock(T, tail),
    topBlock(T, p.B, r.rays.b.x1), // верх Б · Б1 — что даётся сейчас, своим текстом (232)
    workBlock(r.rays.b.x2),
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
  /* Геометрия по образцу владельца (27.11.2026: «как на рисунке — линии диагональные, цифры на своих уровнях, круг,
     наружные круги соединить»): восемь наружных точек на радиусе 128 (А, Б, В, Г — по сторонам света, род — по углам);
     второе число луча стоит ровно на стороне второго квадрата (радиус 90), третье — посередине (64), ближние к центру —
     на внутреннем круге (38), который их ограничивает. */
  const O = 150;
  const DIR = { a: [-1, 0], b: [0, -1], c: [1, 0], d: [0, 1], f: [-1, -1], g: [1, -1], y: [1, 1], k: [-1, 1] };
  const pos = (k, rad) => { const [dx, dy] = DIR[k]; const n = Math.hypot(dx, dy); return [O + (dx / n) * rad, O + (dy / n) * rad]; };
  const RING = [128, 90, 64, 38];
  const outer = ['a', 'f', 'b', 'g', 'c', 'y', 'd', 'k'].map((k) => pos(k, RING[0]).join(',')).join(' ');
  svg.append(
    el('polygon', { points: outer, class: 'mx__line' }), // наружный восьмиугольник через все внешние кружки
    el('polygon', { points: ['f', 'g', 'y', 'k'].map((k) => pos(k, RING[0]).join(',')).join(' '), class: 'mx__line' }), // квадрат рода
    el('polygon', { points: ['b', 'c', 'd', 'a'].map((k) => pos(k, RING[0]).join(',')).join(' '), class: 'mx__line' }), // ромб А–Б–В–Г
    ...Object.keys(DIR).map((k) => { const [x, y] = pos(k, RING[0]); return el('line', { x1: x, y1: y, x2: O, y2: O, class: 'mx__line' }); }), // лучи
    el('circle', { cx: O, cy: O, r: RING[3], class: 'mx__line mx__ring' })); // внутренний круг
  const at = {}; // ключ точки → [x, y, кружок]
  let id = '';
  const dot = (x, y, v, big) => {
    const c = el('circle', { cx: x, cy: y, r: big ? 15 : 11, class: big ? 'mx__dot mx__dot--big' : 'mx__dot' });
    at[id] = [x, y, c];
    svg.append(c, el('text', { x, y: y + 4, class: 'mx__num' }, String(v)));
  };
  const named = (key, ...a) => { id = key; dot(...a); };
  // А слева, Б сверху, В справа, Г снизу, Д в центре; род — углы квадрата
  [['A', 'a'], ['B', 'b'], ['C', 'c'], ['D', 'd'], ['F', 'f'], ['G', 'g'], ['Y', 'y'], ['K', 'k']].forEach(([K, k]) => named(K, ...pos(k, RING[0]), p[K], true));
  named('E', O, O, p.E, true);
  // род (диагонали): первое число — на стороне ромба, второе — на внутреннем круге
  ['f', 'g', 'y', 'k'].forEach((k) => [R[k].x1, R[k].x2].forEach((v, i) => named(`${k}${i + 1}`, ...pos(k, [RING[1], RING[3]][i]), v, false)));
  // канал любви и денег — на стороне от В (справа) к Г (низ): ♥ ближе к низу, $ ближе к правому краю, Х посередине
  const lm = r.loveMoney;
  // кружки не налегают на точки диагонали Ы (владелец 27.11.2026: «11 и 19 накладываются»): канал — поперёк диагонали,
  // точка баланса — между её точками, $ — к В, ♥ — к Г
  svg.append(el('line', { x1: 226, y1: 166, x2: 166, y2: 226, class: 'mx__line mx__line--dash' }));
  [['bal', 196, 196, lm.balance], ['money', 219, 173, lm.money], ['love', 173, 219, lm.love]].forEach(([k, x, y, v]) => named(k, x, y, v, false));
  svg.append(el('text', { x: 240, y: 182, class: 'mx__sign' }, '$'), el('text', { x: 182, y: 244, class: 'mx__sign' }, '♥'));
  // стороны: первое число — на стороне квадрата рода, второе — посередине, третье — на внутреннем круге
  ['a', 'b', 'c', 'd'].forEach((k) => [R[k].x1, R[k].x2, R[k].x3].forEach((v, i) => named(`${k}${i + 1}`, ...pos(k, RING[i + 1]), v, false)));
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
    sec(U.rod, h('ul', { class: 'pyth__lines' },
      row(`${U.father}: ${r.lines.father.join(' – ')}`, r.lines.fatherSum, 'F f1 f2 E y2 y1 Y'),
      row(`${U.mother}: ${r.lines.mother.join(' – ')}`, r.lines.motherSum, 'G g1 g2 E k2 k1 K'))),
    sec(U.loveMoney, h('ul', { class: 'pyth__lines' }, row(U.love, r.loveMoney.love, 'd2 love bal'), row(U.money, r.loveMoney.money, 'c2 money bal'), row(U.balance, r.loveMoney.balance, 'c2 bal d2'))),
    sec(U.purposes, h('ul', { class: 'pyth__lines' }, row(T.purposes.sky[0], P.sky, 'B D'), row(T.purposes.earth[0], P.earth, 'A C'), row(T.purposes.personal[0], P.personal, 'B A D C'),
      row(U.male, P.male, 'F Y'), row(U.female, P.female, 'G K'), row(U.social, P.social, 'F G Y K'), row(U.spiritual, P.spiritual, 'A B C D F G Y K'), row(T.purposes.planetary[0], P.planetary, 'A B C D F G Y K'))),
    sec(U.health, h('table', { class: 'mx__table' },
      h('tr', {}, h('th', {}, U.chakra), h('th', {}, U.body), h('th', {}, U.energy), h('th', {}, U.total)),
      ...r.health.rows.map((x) => h('tr', { 'data-keys': CHAKRA_KEYS[x.id] }, h('td', {}, T.chakras[x.id][0]), h('td', {}, String(x.body)), h('td', {}, String(x.energy)), h('td', {}, String(x.total)))),
      h('tr', { class: 'mx__sum' }, h('td', {}, U.sum), h('td', {}, String(t.body)), h('td', {}, String(t.energy)), h('td', {}, String(t.total))))),
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
    ...[[U.mainPoints, 0, 5], [U.loveMoney, 5, 7], [U.purposes, 7, 12]].map(([title, from, to]) =>
      sec(title, h('ul', { class: 'pyth__lines' }, ...items.slice(from, to).map(([, label, n, keys]) => row(label, n, keys))))),
    fold(U.pairDecoding, ...items.map(([k, label, n]) => arcanaBlock(T, label, n, pp[k][1])))), pic);
}
