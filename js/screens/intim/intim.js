import { h, svg, add } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { icons } from '../../ui/icons.js';
import { platePanel } from '../../ui/plate.js';
import { folder } from '../help/help.js';
import { intimOf, withPlus } from '../../intim/content.js';
import { mapView } from '../../intim/map-view.js';
import { it } from '../../intim/texts.js';

/* ЭКРАН «ИНТИМ 18⁺» (#/intim, владелец 21.11.2026): красный флаг (договор, стоп-слово), почему это важно (Готтманы,
   Перель), карта желаний, массажи, игры, задания на выходные. Видят все — в паре и каждый для себя. Данные — поле
   intim программы (planner: gsl/intim/), модуль — js/intim/. Раскрытые плашки и папки переживают перерисовку. */

const opened = new Set(['safety']);
function keep(node, id) {
  if (opened.has(id)) node.open = true;
  node.addEventListener('toggle', () => (node.open ? opened.add(id) : opened.delete(id)));
  return node;
}

const folders = (list, prefix) => list.map((g, i) => keep(folder(g), `${prefix}.${i}`));

function plate(id, icon, title, body, cls = '') {
  return keep(platePanel({ icon, title, body, cls }), id);
}

/** Задания выходного — каждое папкой: шаги и три уровня. */
function weekendFolders(w) {
  const levels = it('levels');
  return w.tasks.map((task, i) => keep(folder({
    title: `${i + 1}. ${task.title}`,
    lead: task.text,
    entries: [...task.how.map((text) => ({ text })), ...task.levels.map((note, j) => ({ text: levels[j], note }))],
  }), `weekend.${i}`));
}

export function render(view, ctx) {
  const x = intimOf(ctx.lang);
  if (!x) {
    add(view, h('h1', { class: 'screen-title' }, 'Интим 18', h('span', { class: 'brand__plus' }, '+')), h('p', { class: 'card__text' }, t('help.waiting')));
    return;
  }
  add(view,
    h('h1', { class: 'screen-title' }, withPlus(x.title)),
    h('p', { class: 'help__intro' }, x.lead),
    h('p', { class: 'faint intim__adult' }, it('adult')),
    // Красный флаг — первым и раскрытым: договор и стоп-слово читают до всего остального
    plate('safety', icons.flag, x.safety.title, [h('p', { class: 'card__text' }, x.safety.lead), ...folders(x.safety.groups, 'safety')], 'plate--red'),
    plate('why', icons.journal, x.sections.why, folders(x.why, 'why')),
    plate('map', icons.heart, x.sections.map, [mapView(x.map)]),
    plate('massage', icons.sparkle, x.sections.massage, folders(x.massage, 'massage')),
    plate('games', icons.crown, x.sections.games, folders(x.games, 'games')),
    plate('weekend', icons.calendar, x.sections.weekend, [h('p', { class: 'card__text' }, x.weekend.lead), ...weekendFolders(x.weekend)]),
  );
}

/** Плашка-переход в «Библиотеке» — первой. */
export function intimLink(lang) {
  const x = intimOf(lang);
  if (!x) return null;
  return h('a', { class: 'card plate plate--intim', href: '#/intim' },
    h('span', { class: 'plate__icon', 'aria-hidden': 'true' }, svg(icons.heart)),
    h('span', { class: 'plate__text' },
      h('span', { class: 'plate__title' }, withPlus(x.title)),
      h('span', { class: 'plate__lead' }, it('plateLead'))),
    h('span', { class: 'plate__arrow', 'aria-hidden': 'true' }, svg(icons.chevronRight)));
}
