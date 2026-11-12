import { h } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { LEVELS } from '../config.js';
import { levelDots } from '../ui/ring.js';

/* КАРТОЧКА ИТОГОВ: сверху цифры (дни, реакции), под ними — на каком уровне делала, ниже — реакции мужчин по
   дням и что получилось. Длинные списки свёрнуты до limit с кнопкой «Показать все». */

function list(items, limit, render) {
  const box = h('ul', { class: 'insight__list' });
  const paint = (all) => {
    const shown = all || !limit ? items : items.slice(0, limit);
    box.replaceChildren(...shown.map(render));
    if (!all && limit && items.length > limit) {
      box.append(h('li', { class: 'insight__more' },
        h('button', { type: 'button', class: 'insight__more-btn', onclick: () => paint(true) }, t('insights.showAll', { n: items.length }))));
    }
  };
  paint(false);
  return box;
}

export function summaryCard(s, { title, limit = 0 }) {
  if (!s.records) {
    return h('section', { class: 'card insight insight--empty' },
      h('h2', { class: 'caps insight__title' }, title),
      h('p', { class: 'insight__empty' }, t('insights.empty')),
    );
  }
  return h('section', { class: 'card insight' },
    h('h2', { class: 'caps insight__title' }, title),
    h('div', { class: 'insight__stats' },
      h('div', { class: 'insight__stat' }, h('strong', { class: 'gold-text' }, String(s.days)), h('span', {}, t('insights.days'))),
      h('div', { class: 'insight__stat' }, h('strong', { class: 'gold-text' }, String(s.reactions.length)), h('span', {}, t('insights.reactionsCount'))),
      h('div', { class: 'insight__stat' }, h('strong', { class: 'gold-text' }, String(s.wins.length)), h('span', {}, t('insights.winsCount'))),
    ),
    h('ul', { class: 'insight__levels' }, ...LEVELS.map((l) => h('li', {},
      levelDots(l), h('span', {}, t(`levels.${l}`)), h('strong', {}, String(s.levels[l]))))),
    s.reactions.length
      ? h('div', { class: 'insight__block' },
        h('h3', { class: 'insight__subtitle' }, t('entry.reaction')),
        list(s.reactions, limit, (r) => h('li', { class: 'insight__item' },
          h('span', { class: 'insight__meta' }, `${t('entry.forDay', { day: r.day })} · ${r.title}${r.man ? ` · ${r.man}` : ''}`),
          h('q', { class: 'insight__quote' }, r.reaction),
        )),
      )
      : null,
    s.wins.length
      ? h('div', { class: 'insight__block' },
        h('h3', { class: 'insight__subtitle' }, t('entry.worked')),
        list(s.wins, limit, (w) => h('li', { class: 'insight__item' },
          h('span', { class: 'insight__meta' }, `${t('entry.forDay', { day: w.day })} · ${w.title}`),
          h('span', { class: 'insight__text' }, w.text),
        )),
      )
      : null,
  );
}
