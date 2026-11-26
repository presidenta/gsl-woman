import { h } from '../../core/dom.js';
import { matrix, pairMatrix } from './calc.js';
import { ARCANA_DB } from './arcana.js'; // трактовки арканов (тексты Gemini, правит владелец)
const fold = (title, ...body) => h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, title)), h('div', { class: 'help__folder-body' }, ...body));
const para = (b, t) => (t ? h('p', {}, h('b', {}, b), ' ', t) : null);
function arcanaBlock(label, n) {
  const x = ARCANA_DB[n];
  return h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `${label}: ${n} — ${x.name}`), para('В плюсе:', x.plus), para('В минусе:', x.minus),
    para('Отношения и семья:', x.inRelationshipsAndFamily), para('Деньги и реализация:', x.inFinanceAndRealization), para('Здоровье и тело:', x.inHealthAndBody));
}


/* Карточка «Матрица судьбы (Ладини)»: схема точек (SVG), предназначения, карта здоровья. Трактовки арканов — следующим
   шагом. Стыковка — одна строка в screens/anketa/anketa.js. */
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

function drawing(r) {
  const p = r.points;
  const R = r.rays;
  const svg = el('svg', { viewBox: '0 0 300 300', class: 'mx__svg', role: 'img', 'aria-label': 'Матрица судьбы' });
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
    [q.x1, q.x2].forEach((v, i) => dot(x + (150 - x) * [0.33, 0.62][i], y + (150 - y) * [0.33, 0.62][i], v, false)));
  // канал любви и денег — на стороне от В (справа) к Г (низ): ♥ ближе к низу, $ ближе к правому краю, Х посередине
  const lm = r.loveMoney;
  [[214, 214, lm.balance], [238, 190, lm.money], [190, 238, lm.love]].forEach(([x, y, v]) => dot(x, y, v, false));
  svg.append(el('text', { x: 252, y: 180, class: 'mx__sign' }, '$'), el('text', { x: 176, y: 258, class: 'mx__sign' }, '♥'));
  [[22, 150, R.a], [150, 22, R.b], [278, 150, R.c], [150, 278, R.d]].forEach(([x, y, q]) =>
    [q.x1, q.x2, q.x3].forEach((v, i) => dot(x + (150 - x) * steps[i], y + (150 - y) * steps[i], v, false)));
  return svg;
}

export function matrixCard(iso, caption = null) {
  const r = matrix(iso);
  if (!r) return null;
  const P = r.purposes;
  const purposes = [['Небо', P.sky], ['Земля', P.earth], ['Личное предназначение', P.personal], ['Мужской род (отцовский)', P.male],
    ['Женский род (материнский)', P.female], ['Социальное', P.social], ['Духовное', P.spiritual], ['Планетарное', P.planetary]];
  const t = r.health.total;
  return h('section', { class: 'card mx' },
    h('h2', { class: 'card__title' }, 'Матрица судьбы (Ладини)'),
    caption ? h('p', { class: 'chart__src' }, caption) : null,
    drawing(r),
    h('h3', { class: 'caps mx__cap' }, 'Линии рода (диагонали)'),
    h('ul', { class: 'pyth__lines' },
      h('li', {}, h('span', {}, `Отцовская: ${r.lines.father.join(' – ')}`), h('b', {}, String(r.lines.fatherSum))),
      h('li', {}, h('span', {}, `Материнская: ${r.lines.mother.join(' – ')}`), h('b', {}, String(r.lines.motherSum)))),
    h('h3', { class: 'caps mx__cap' }, 'Любовь и деньги'),
    h('ul', { class: 'pyth__lines' }, h('li', {}, h('span', {}, '♥ Любовь (канал отношений)'), h('b', {}, String(r.loveMoney.love))),
      h('li', {}, h('span', {}, '$ Деньги (денежный канал)'), h('b', {}, String(r.loveMoney.money))),
      h('li', {}, h('span', {}, 'Точка баланса'), h('b', {}, String(r.loveMoney.balance)))),
    h('h3', { class: 'caps mx__cap' }, 'Предназначения'),
    h('ul', { class: 'pyth__lines' }, ...purposes.map(([n, v]) => h('li', {}, h('span', {}, n), h('b', {}, String(v))))),
    h('h3', { class: 'caps mx__cap' }, 'Карта здоровья'),
    h('table', { class: 'mx__table' },
      h('tr', {}, h('th', {}, 'Чакра'), h('th', {}, 'Физика'), h('th', {}, 'Энергия'), h('th', {}, 'Итог')),
      ...r.health.rows.map((x) => h('tr', {}, h('td', {}, x.name), h('td', {}, String(x.body)), h('td', {}, String(x.energy)), h('td', {}, String(x.total)))),
      h('tr', { class: 'mx__sum' }, h('td', {}, 'Итого'), h('td', {}, String(t.body)), h('td', {}, String(t.energy)), h('td', {}, String(t.total)))),
    fold('Расшифровка арканов', ...[['А — день (личные качества)', r.points.A], ['Б — месяц (таланты)', r.points.B], ['В — год (кармическая задача)', r.points.C], ['Г — нижняя точка', r.points.D], ['Д — центр (характер, зона комфорта)', r.points.E],
      ['Личное предназначение', P.personal], ['Социальное предназначение', P.social], ['Духовное предназначение', P.spiritual], ['Отцовский род', P.male], ['Материнский род', P.female], ['♥ Любовь', r.loveMoney.love], ['$ Деньги', r.loveMoney.money]].map(([l, n]) => arcanaBlock(l, n))));
}

/** Карточка «Матрица пары»: центр пары и предназначения союза с расшифровкой. */
export function pairCard(isoA, isoB, caption) {
  const r = pairMatrix(isoA, isoB);
  if (!r) return null;
  const P = r.purposes;
  return h('section', { class: 'card mx' },
    h('h2', { class: 'card__title' }, 'Матрица пары (совместимость)'),
    h('p', { class: 'chart__src' }, caption),
    h('ul', { class: 'pyth__lines' }, ...[['Центр пары', r.points.E], ['Небо пары', P.sky], ['Земля пары', P.earth], ['Личное предназначение союза', P.personal],
      ['Социальное', P.social], ['Духовное', P.spiritual]].map(([n, v]) => h('li', {}, h('span', {}, n), h('b', {}, String(v))))),
    fold('Расшифровка', arcanaBlock('Центр пары', r.points.E), arcanaBlock('Предназначение союза', P.personal), arcanaBlock('Социальное предназначение пары', P.social)));
}
