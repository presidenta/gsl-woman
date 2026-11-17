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

/* КОНСТРУКТОР РАЗДЕЛА (владелец 17.11.2026: «кнопка должна быть как конструктор: человек заходит в раздел и выбирает —
   хочу только Кегеля, или только шаги считать»). В открытом разделе под названием — ряд галочек: что в нём показывать.
   Снял галочку — карточка ушла, поставил — вернулась. Выбор помнится (настройки, поле sectionItems). */
export function picked(key, id, s = settings.get()) {
  const saved = s.sectionItems?.[key]?.[id];
  return typeof saved === 'boolean' ? saved : true;
}

export function pick(key, id) {
  const s = settings.get();
  const all = s.sectionItems && typeof s.sectionItems === 'object' ? s.sectionItems : {};
  settings.update({ sectionItems: { ...all, [key]: { ...(all[key] || {}), [id]: !picked(key, id, s) } } });
}

/** Открытый раздел на странице: название, галочки-конструктор и выбранные карточки. Закрыт или пуст — ничего.
    entries — [{ id, build }]: build() отдаёт карточку или null, если сегодня её нет (тогда и галочки нет). */
export function sectionBlock(ctx, key, entries) {
  if (!state(ctx.settings)[key]) return null;
  const rows = [];
  for (const e of entries) {
    const on = picked(key, e.id, ctx.settings);
    // Невыбранное строим только чтобы узнать, есть ли оно сегодня; «ленивое» (с таймером) — считаем, что есть
    const node = on || !e.lazy ? e.build() : true;
    if (node) rows.push({ id: e.id, on, node: on ? node : null });
  }
  if (!rows.length) return null;
  return h('div', { class: `stack day-section day-section--${key}` },
    h('p', { class: 'caps day-section__title' }, svg(ICON[key], 'day-section__icon'), t(`sections.${key}`)),
    h('div', { class: 'day-section__picks', role: 'group', 'aria-label': t('sections.pick') },
      ...rows.map((r) => h('button', {
        type: 'button', class: `day-section__pick${r.on ? ' is-on' : ''}`, 'aria-pressed': String(r.on),
        onclick: () => { pick(key, r.id); ctx.rerender(); },
      }, svg(r.on ? icons.check : icons.plus, 'day-section__pick-mark'), t(`sections.items.${r.id}`)))),
    ...rows.map((r) => r.node).filter(Boolean),
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
