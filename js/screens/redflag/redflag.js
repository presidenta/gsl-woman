import { h, svg, add } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { icons } from '../../ui/icons.js';
import * as help from '../../help/help.js';
import { folder } from '../help/help.js';
import { photoOf } from '../../photos/photos.js';

/* ЭКРАН «КРАСНЫЙ ФЛАГ» (#/redflag, владелец 15.11.2026: «красный флаг вынесем отдельным разделом, не в помощь, а в
   общую сторону — рядом с „Моими целями“»). Запрет оценок: почему, что говорят психологи, слова-флаги с заменой, что
   можно. Данные — пункт redline поля help программы (planner: gsl/help/redline-ru.js). Первая папка раскрыта. */

export function render(view, ctx) {
  const item = help.content(ctx.lang)?.items.find((i) => i.key === 'redline');
  if (!item) {
    add(view, h('h1', { class: 'screen-title' }, t('redflag.title')), h('p', { class: 'card__text' }, t('help.waiting')));
    return;
  }
  add(view,
    h('div', { class: 'redflag__head' },
      h('span', { class: 'plate__icon redflag__icon', 'aria-hidden': 'true' }, svg(icons.flag)),
      h('h1', { class: 'screen-title redflag__title' }, t('redflag.title'), h('span', { class: 'plate__ban' }, ` — ${t('redflag.ban')}`))),
    h('p', { class: 'help__intro' }, item.lead),
    // Все папки — в одной карточке, как внутри плашки «Помощи»
    // Фото (js/photos/): «так нельзя» — в первой папке («Почему это красный флаг»), «так можно» — в последней
    h('div', { class: 'card' }, ...item.groups.map((g, i, all) => folder(g, {
      open: i === 0,
      photo: i === 0 ? photoOf('redflag.no') : i === all.length - 1 ? photoOf('redflag.yes') : null,
    }))),
  );
}
