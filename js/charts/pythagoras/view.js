import { h } from '../../core/dom.js';
import { pythagoras, pairPythagoras, CELLS } from './calc.js';
import { PYTHAGORAS_DB, PYTHAGORAS_SOURCE, LINES_DB, LINE_BANDS, PAIR_NOTE, lineBand, countText } from './texts.js'; // расшифровка по классике (216)
const fold = (title, ...body) => h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, title)), h('div', { class: 'help__folder-body' }, ...body));
const para = (b, t) => (t ? h('p', {}, h('b', {}, b), ' ', t) : null);

/** Расшифровка: 9 цифр по числу вхождений, затем 8 линий по сумме. */
function decoding(r) {
  return fold('Расшифровка',
    h('p', { class: 'faint' }, PYTHAGORAS_SOURCE),
    h('h3', { class: 'caps mx__cap' }, 'Цифры'),
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => {
      const x = PYTHAGORAS_DB[k];
      const n = r.counts[k];
      return h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `${k} — ${x.title} (${n ? r.cells[k] : 'нет'})`),
        para('Суть:', x.essence), para('Что показывает:', countText(k, n)), para('Зона роста:', x.grow));
    }),
    h('h3', { class: 'caps mx__cap' }, 'Линии'),
    h('p', { class: 'faint' }, 'Сумма цифр линии: 0–2 — слабо, 3–4 — норма, 5–6 — сильно, 7 и больше — очень сильно.'),
    ...r.lines.map((l) => {
      const x = LINES_DB[l.name];
      const b = lineBand(l.total);
      return x ? h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `${l.name} (${l.digits.join('-')}): ${l.total} — ${LINE_BANDS[b]}`),
        para('Что это:', x.essence), para('Что показывает:', x.levels[b])) : null;
    }));
}

/* Карточка «Квадрат Пифагора»: рабочие числа, сетка 3×3 (столбцы 1-2-3 · 4-5-6 · 7-8-9), суммы линий, расшифровка. */
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
    decoding(r));
}

/** Квадрат пары: общая сетка (цифры двоих вместе) и линии пары. */
export function pairPythCard(isoA, isoB, caption) {
  const r = pairPythagoras(isoA, isoB);
  if (!r) return null;
  const grid = [[1, 4, 7], [2, 5, 8], [3, 6, 9]];
  const empty = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((k) => !r.counts[k]);
  return h('section', { class: 'card pyth' },
    h('h2', { class: 'card__title' }, 'Квадрат Пифагора пары'),
    h('p', { class: 'chart__src' }, caption),
    h('p', { class: 'faint' }, 'Цифры двоих вместе: чего в паре много, а чего не хватает обоим.'),
    h('div', { class: 'pyth__grid' }, ...grid.flat().map((k) => h('div', { class: `pyth__cell${r.counts[k] ? '' : ' is-empty'}` },
      h('span', { class: 'pyth__digits' }, r.cells[k]), h('span', { class: 'pyth__name' }, CELLS[k])))),
    h('ul', { class: 'pyth__lines' }, ...r.lines.map((l) => h('li', {}, h('span', {}, `${l.name} (${l.digits.join('-')})`), h('b', {}, String(l.total))))),
    fold('Расшифровка',
      h('p', {}, PAIR_NOTE),
      empty.length ? para('Нет у обоих:', empty.map((k) => `${k} — ${PYTHAGORAS_DB[k].title.toLowerCase()}`).join('; ') + '.') : para('Нет у обоих:', 'все девять качеств есть хотя бы у одного из двоих.'),
      ...r.lines.map((l) => h('p', {}, h('b', {}, `${l.name}: ${l.total}`), ' — ', l.total >= 10 ? 'опора пары' : l.total <= 4 ? 'тема для договорённостей' : 'обычный уровень'))));
}
