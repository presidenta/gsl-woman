import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { read } from '../core/store.js';
import * as settings from '../settings/settings.js';
import * as side from '../side/side.js';
import { icons } from '../ui/icons.js';
import { foldCard } from '../ui/fold.js';
import { bizFor } from '../profile/profile.js';
import { KEGEL_KEY, STEPS_KEY } from '../habits/logs.js';
import { NIGHT_KEY_NAME } from '../water/water-log.js';

/* РАЗДЕЛЫ ДНЯ (владелец 17.11.2026: «риск перегрузки дня — самый ключевой… как конструктор»).

   Всегда на виду только ядро дня: стакан тёплой воды утром, задание, итог. Остальное — три раздела:
     rel    — «Отношения»: я-сообщение, вопрос на вечер, языки любви, разговор пары, повтор навыков, «В поиске»;
     health — «Здоровье»: утренняя минута, упражнение Кегеля, шаги, стакан воды на ночь;
     biz    — «Мужчина⁺» (только у мужской части): совет недели по работе и «Стержень недели».

   В шапке дня — маленькие круглые кнопки со значком и подписью под ним, в одну строку, и шестерёнка (владелец: «кнопки
   на телефоне занимают много места… сделать маленькими, сбоку шестеренку»). Кнопка раздела открывает и закрывает его
   на «Сегодня». Шестерёнка ведёт в настройки, в блок «Разделы дня»: там каждый раздел собирается как конструктор —
   что в нём показывать, а что нет.

   Выбор помнится (настройки: sections — какие разделы открыты, sectionItems — что в каждом). С самого начала открыты
   «Отношения» — суть тренинга; «Здоровье» — у тех, кто уже отмечал Кегель, шаги или воду на ночь; «Мужчина⁺» закрыт.
   Стакан на ночь по умолчанию выключен (владелец: «утром — всегда, на ночь — если человеку надо»). */

export const KEYS = ['rel', 'health', 'biz'];
const ICON = { rel: icons.heart, health: icons.pulse, biz: icons.crown };

/** Что лежит в каждом разделе — в этом порядке и на «Сегодня», и в настройках. */
export const ITEMS = {
  rel: ['imsg', 'evening', 'love', 'talk', 'repeat', 'search'],
  health: ['minute', 'kegel', 'steps', 'waterNight'],
  biz: ['tip', 'stem'],
};

const hasLogs = (key) => {
  const v = read(key, {});
  return !!v && typeof v === 'object' && Object.keys(v).length > 0;
};

/** Разделы этой части: «Мужчина⁺» — только у мужской. */
export const keysForSide = () => KEYS.filter((k) => k !== 'biz' || side.get() === 'man');

/** Какие разделы открыты. */
export function state(s = settings.get()) {
  const saved = s.sections && typeof s.sections === 'object' ? s.sections : {};
  return {
    rel: typeof saved.rel === 'boolean' ? saved.rel : true,
    health: typeof saved.health === 'boolean' ? saved.health : (hasLogs(KEGEL_KEY) || hasLogs(STEPS_KEY) || hasLogs(NIGHT_KEY_NAME)),
    biz: typeof saved.biz === 'boolean' ? saved.biz : false,
  };
}

export function setOpen(key, on) {
  settings.update({ sections: { ...state(), [key]: !!on } });
}

export function toggle(key) {
  setOpen(key, !state()[key]);
}

/** Показывать ли пункт в разделе. Всё включено, кроме стакана на ночь (его включают, если надо). */
export function picked(key, id, s = settings.get()) {
  const saved = s.sectionItems?.[key]?.[id];
  if (typeof saved === 'boolean') return saved;
  if (id === 'waterNight') return hasLogs(NIGHT_KEY_NAME);
  return true;
}

export function setPicked(key, id, on) {
  const s = settings.get();
  const all = s.sectionItems && typeof s.sectionItems === 'object' ? s.sectionItems : {};
  settings.update({ sectionItems: { ...all, [key]: { ...(all[key] || {}), [id]: !!on } } });
}

/* Шестерёнка → настройки, сразу к блоку «Разделы дня»: экран настроек спрашивает takeFocus() и прокручивает. */
let focusWanted = false;
export const takeFocus = () => { const f = focusWanted; focusWanted = false; return f; };

/** Ряд кнопок для шапки дня: значок с подписью под ним, в одну строку, и шестерёнка. */
export function sectionButtons(ctx, available) {
  const open = state(ctx.settings);
  const keys = keysForSide().filter((k) => available[k]);
  if (!keys.length) return null;
  return h('div', { class: 'day-sections', role: 'group', 'aria-label': t('sections.group') },
    ...keys.map((k) => h('button', {
      type: 'button',
      class: `day-sections__btn${open[k] ? ' is-open' : ''}`,
      'aria-pressed': String(open[k]),
      title: t(`sections.${k}`),
      onclick: () => { toggle(k); ctx.rerender(); },
    }, h('span', { class: 'day-sections__ring' }, svg(ICON[k], 'day-sections__icon')), h('span', { class: 'day-sections__name' }, t(`sections.${k}`)))),
    h('button', {
      type: 'button', class: 'day-sections__btn day-sections__gear', title: t('sections.setup'), 'aria-label': t('sections.setup'),
      onclick: () => { focusWanted = true; ctx.go('settings'); },
    }, h('span', { class: 'day-sections__ring' }, svg(icons.gear, 'day-sections__icon')), h('span', { class: 'day-sections__name' }, t('sections.setupShort'))),
  );
}

/** Открытый раздел на странице: название и выбранные карточки. Закрыт или пуст — ничего.
    entries — [{ id, build }]: build() отдаёт карточку или null, если сегодня её нет. Невыбранное даже не строится. */
export function sectionBlock(ctx, key, entries) {
  if (!state(ctx.settings)[key]) return null;
  const cards = entries.filter((e) => picked(key, e.id, ctx.settings)).map((e) => e.build()).filter(Boolean);
  if (!cards.length) return null;
  return h('div', { class: `stack day-section day-section--${key}` },
    h('p', { class: 'caps day-section__title' }, svg(ICON[key], 'day-section__icon'), t(`sections.${key}`)),
    ...cards,
  );
}

/** Блок «Разделы дня» для экрана настроек: у каждого раздела — «показывать» и галочки его пунктов.
    Переключатели меняют настройки сразу, экран не перерисовывается — прокрутка остаётся на месте. */
export function settingsBlock(switchRow) {
  const s = settings.get();
  const open = state(s);
  return h('section', { class: 'card settings__section day-sections-setup', id: 'day-sections-setup' },
    h('h2', { class: 'caps settings__heading' }, t('sections.setupTitle')),
    h('p', { class: 'card__text faint' }, t('sections.setupLead')),
    ...keysForSide().map((k) => {
      const items = h('div', { class: `day-sections-setup__items${open[k] ? '' : ' is-off'}` },
        ...ITEMS[k].map((id) => switchRow({
          title: t(`sections.items.${id}`),
          checked: picked(k, id, s),
          onChange: (on) => setPicked(k, id, on),
        })));
      return h('div', { class: 'day-sections-setup__group' },
        switchRow({
          title: t(`sections.${k}`),
          hint: t(`sections.hint.${k}`),
          checked: open[k],
          onChange: (on) => { setOpen(k, on); items.classList.toggle('is-off', !on); },
        }),
        items,
      );
    }),
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
