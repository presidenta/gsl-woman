import { h } from '../../core/dom.js';
import { pythagoras, CELLS } from './calc.js';
import { PYTHAGORAS_DB } from './texts.js'; // трактовки (тексты Gemini, правит владелец)
const fold = (title, ...body) => h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, title)), h('div', { class: 'help__folder-body' }, ...body));
const para = (b, t) => (t ? h('p', {}, h('b', {}, b), ' ', t) : null);


/* Карточка «Квадрат Пифагора»: рабочие числа, сетка 3×3 (столбцы 1-2-3 · 4-5-6 · 7-8-9), суммы линий.
   Трактовки — следующим шагом (тексты с сервера). Стыковка — одна строка в screens/anketa/anketa.js. */
export function pythagorasCard(iso, caption = null) {
  const r = pythagoras(iso);
  if (!r) return null;
  const grid = [[1, 4, 7], [2, 5, 8], [3, 6, 9]];
  return h('section', { class: 'card pyth' },
    h('h2', { class: 'card__title' }, 'Квадрат Пифагора'),
    caption ? h('p', { class: 'chart__src' }, caption) : null,
    h('p', { class: 'faint' }, `Рабочие числа: ${r.work.join(' · ')}`),
    h('div', { class: 'pyth__grid' }, ...grid.flat().map((k) => h('div', { class: `pyth__cell${r.counts[k] ? '' : ' is-empty'}` },
      h('span', { class: 'pyth__digits' }, r.cells[k]), h('span', { class: 'pyth__name' }, CELLS[k])))),
    h('ul', { class: 'pyth__lines' }, ...r.lines.map((l) => h('li', {},
      h('span', {}, `${l.name} (${l.digits.join('-')})`), h('b', {}, String(l.total))))),
    fold('Расшифровка', ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => { const x = PYTHAGORAS_DB[k]; const n = r.counts[k];
      return h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `${k} — ${x.title} (${n ? r.cells[k] : 'нет'})`), para('Суть:', x.coreEssence), para('У тебя:', x.byCount[Math.min(n, 4)]), para('Совет:', x.balanceTip)); })));
}
