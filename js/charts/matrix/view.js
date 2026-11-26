import { h } from '../../core/dom.js';
import { matrix } from './calc.js';

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
  [[22, 150, R.a], [150, 22, R.b], [278, 150, R.c], [150, 278, R.d]].forEach(([x, y, q]) =>
    [q.x1, q.x2, q.x3].forEach((v, i) => dot(x + (150 - x) * steps[i], y + (150 - y) * steps[i], v, false)));
  return svg;
}

export function matrixCard(iso) {
  const r = matrix(iso);
  if (!r) return null;
  const P = r.purposes;
  const purposes = [['Небо', P.sky], ['Земля', P.earth], ['Личное предназначение', P.personal], ['Мужской род', P.male],
    ['Женский род', P.female], ['Социальное', P.social], ['Духовное', P.spiritual], ['Планетарное', P.planetary]];
  const t = r.health.total;
  return h('section', { class: 'card mx' },
    h('h2', { class: 'card__title' }, 'Матрица судьбы (Ладини)'),
    drawing(r),
    h('ul', { class: 'pyth__lines' }, ...purposes.map(([n, v]) => h('li', {}, h('span', {}, n), h('b', {}, String(v))))),
    h('h3', { class: 'caps mx__cap' }, 'Карта здоровья'),
    h('table', { class: 'mx__table' },
      h('tr', {}, h('th', {}, 'Чакра'), h('th', {}, 'Физика'), h('th', {}, 'Энергия'), h('th', {}, 'Итог')),
      ...r.health.rows.map((x) => h('tr', {}, h('td', {}, x.name), h('td', {}, String(x.body)), h('td', {}, String(x.energy)), h('td', {}, String(x.total)))),
      h('tr', { class: 'mx__sum' }, h('td', {}, 'Итого'), h('td', {}, String(t.body)), h('td', {}, String(t.energy)), h('td', {}, String(t.total)))));
}
