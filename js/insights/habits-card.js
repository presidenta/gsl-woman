import { h, svg } from '../core/dom.js';
import { t, plural, formatDate } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { MORNING } from './habits.js';

/* КАРТОЧКА «УТРО» в итогах: по строке на привычку — значок, сколько дней из срока, полоса, кружок на каждый
   день (золотой — сделано) и сколько дней подряд сейчас. Экраны «Записи» (срок на выбор) и «Неделя». */

const ICON = { water: icons.cup, minute: icons.sun, kegel: icons.pulse, steps: icons.footprints, night: icons.moon };

function row(s, habit) {
  const n = s[habit];
  const percent = s.total ? Math.round((n / s.total) * 100) : 0;
  return h('div', { class: 'habit' },
    h('div', { class: 'habit__head' },
      h('span', { class: 'habit__icon' }, svg(ICON[habit])),
      h('span', { class: 'habit__name' }, t(`insights.habits.${habit}`)),
      h('span', { class: 'habit__value' },
        h('strong', { class: 'gold-text' }, `${percent}%`),
        h('span', {}, `${t('insights.habits.of', { n, all: s.total })} ${plural(s.total, 'plural.days')}`),
      ),
    ),
    h('div', { class: 'bar habit__bar' }, h('div', { class: 'bar__fill', style: { width: `${percent}%` } })),
    h('div', { class: `habit__dots${s.days.length > 14 ? ' habit__dots--many' : ''}`, 'aria-hidden': 'true' },
      ...s.days.map((d) => h('span', {
        class: `habit__dot${d[habit] ? ' is-done' : ''}${d.today ? ' is-today' : ''}${d.future ? ' is-future' : ''}`,
        title: formatDate(d.iso),
      }))),
    s.streak[habit] ? h('p', { class: 'habit__streak' }, svg(icons.sparkle, 'habit__streak-icon'), t('insights.habits.streak', { n: s.streak[habit] })) : null,
  );
}

/** Карточка привычек: «Утро» (вода, минута — с подсказкой) или «День» (list: Кегель, шаги). */
export function habitsCard(s, { title = t('insights.habits.title'), list = MORNING } = {}) {
  if (!s.total) return null;
  const morning = list === MORNING;
  return h('section', { class: 'card insight habits' },
    h('h2', { class: 'caps insight__title' }, title),
    ...list.map((habit) => row(s, habit)),
    morning ? h('p', { class: 'habits__legend faint' }, t('insights.habits.legend')) : null,
    morning ? h('p', { class: 'habits__legend faint' }, t('insights.habits.hint')) : null,
  );
}
