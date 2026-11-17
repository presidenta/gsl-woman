import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { read } from '../core/store.js';
import * as settings from '../settings/settings.js';
import { icons } from '../ui/icons.js';
import { foldCard } from '../ui/fold.js';
import { bizFor } from '../profile/profile.js';
import { KEGEL_KEY, STEPS_KEY } from '../habits/logs.js';

/* РАЗДЕЛЫ ДНЯ — КНОПКИ В ШАПКЕ «СЕГОДНЯ» (владелец 17.11.2026: «риск перегрузки дня — самый ключевой… как
   конструктор: нажал кнопочку — открылось, нажал опять — закрылось; настройки не отзываются»).

   Всегда на виду только ядро дня: задание, стакан воды утром и на ночь, итог. Остальное — три раздела, каждый
   открывается и закрывается своей кнопкой в шапке дня:
     rel    — «Отношения»: я-сообщение, вопрос на вечер, языки любви, разговор пары, повтор навыков, «В поиске»;
     health — «Здоровье»: утренняя минута, упражнение Кегеля, шаги;
     biz    — «Дело»: совет недели по работе и «Стержень недели» (пока только у мужской части — у женской кнопки нет,
              пока для неё нет содержания).
   Человек берёт столько, сколько хочет: всё хорошо с делами — раздел просто закрыт.

   Выбор помнится (настройки, поле sections). С самого начала открыты «Отношения» — это суть тренинга; «Здоровье»
   открыто у тех, кто уже отмечал Кегель или шаги; «Дело» закрыто. */

export const KEYS = ['rel', 'health', 'biz'];
const ICON = { rel: icons.heart, health: icons.pulse, biz: icons.goals };

const hasLogs = (key) => {
  const v = read(key, {});
  return !!v && typeof v === 'object' && Object.keys(v).length > 0;
};

/** Какие разделы открыты. */
export function state(s = settings.get()) {
  const saved = s.sections && typeof s.sections === 'object' ? s.sections : {};
  return {
    rel: typeof saved.rel === 'boolean' ? saved.rel : true,
    health: typeof saved.health === 'boolean' ? saved.health : (hasLogs(KEGEL_KEY) || hasLogs(STEPS_KEY)),
    biz: typeof saved.biz === 'boolean' ? saved.biz : false,
  };
}

export function toggle(key) {
  const now = state();
  settings.update({ sections: { ...now, [key]: !now[key] } });
}

/** Ряд кнопок для шапки дня. available — у каких разделов сегодня есть содержание. */
export function sectionButtons(ctx, available) {
  const open = state(ctx.settings);
  const keys = KEYS.filter((k) => available[k]);
  if (!keys.length) return null;
  return h('div', { class: 'day-sections', role: 'group', 'aria-label': t('sections.group') },
    ...keys.map((k) => h('button', {
      type: 'button',
      class: `day-sections__btn${open[k] ? ' is-open' : ''}`,
      'aria-pressed': String(open[k]),
      onclick: () => { toggle(k); ctx.rerender(); },
    }, svg(ICON[k], 'day-sections__icon'), h('span', {}, t(`sections.${k}`)), svg(open[k] ? icons.check : icons.plus, 'day-sections__mark'))));
}

/** Открытый раздел на странице: подпись и его карточки. Закрыт или пуст — ничего. */
export function sectionBlock(ctx, key, cards) {
  const list = cards.filter(Boolean);
  if (!list.length || !state(ctx.settings)[key]) return null;
  return h('div', { class: `stack day-section day-section--${key}` },
    h('p', { class: 'caps day-section__title' }, svg(ICON[key], 'day-section__icon'), t(`sections.${key}`)),
    ...list,
  );
}

/** «Совет недели по работе» (у мужской части): подсказка на этот день недели — программа, поле biz. */
export function bizCard(ctx, plan) {
  const text = bizFor(plan.biz, plan.dayInWeek);
  if (!text) return null;
  return foldCard({
    id: 'biz',
    cls: 'biz',
    icon: icons.goals,
    title: t('sections.bizTip'),
    lead: plan.biz.title,
    body: [
      h('h2', { class: 'card__title' }, plan.biz.title),
      h('p', { class: 'card__text' }, text),
    ],
  }).node;
}
