import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { read } from '../core/store.js';
import * as settings from '../settings/settings.js';
import { icons } from '../ui/icons.js';
import { kegelCard } from '../habits/kegel-card.js';
import { stepsCard } from '../habits/steps-card.js';
import { KEGEL_KEY, STEPS_KEY } from '../habits/logs.js';

/* РАЗДЕЛ «ЗДОРОВЬЕ» — Кегель и шаги ПО ЖЕЛАНИЮ (владелец 17.11.2026: «риск перегрузки дня — самый ключевой…
   Кегель и шаги могут перегрузить; поставить кнопку здоровья, и оно дополнительно откроется; не хочет — даже
   не открывается»).

   Ядро дня — задание, стакан воды утром и вечером, утренняя минута. Упражнение Кегеля и шаги — раздел «Здоровье»:
   пока человек его не открыл, на «Сегодня» вместо двух карточек одна тонкая строка «Здоровье — по желанию».
   Открыл — карточки на месте, как раньше; закрыть обратно — в настройках.

   Выбор хранится в настройках (поле health: true / false). Кто уже отмечал Кегель или шаги до этой сборки —
   у того раздел открыт сам: привычку у человека не отбираем. */

const hasLogs = (key) => {
  const v = read(key, {});
  return !!v && typeof v === 'object' && Object.keys(v).length > 0;
};

/** Открыт ли раздел: сказано в настройках, иначе — по прошлым отметкам. */
export function isOn(s = settings.get()) {
  if (typeof s.health === 'boolean') return s.health;
  return hasLogs(KEGEL_KEY) || hasLogs(STEPS_KEY);
}

export function setOn(on) {
  settings.update({ health: !!on });
}

/** Карточки для «Сегодня»: открыт — Кегель и шаги, закрыт — одна строка-приглашение. */
export function healthCards(ctx) {
  if (isOn(ctx.settings)) return [kegelCard(ctx), stepsCard(ctx)];
  return [
    h('section', { class: 'card card--soft health-offer' },
      h('div', { class: 'card__eyebrow' },
        h('span', { class: 'card__icon' }, svg(icons.pulse)),
        h('span', { class: 'caps' }, t('health.title')),
      ),
      h('p', { class: 'card__text' }, t('health.offer')),
      h('button', {
        type: 'button', class: 'btn btn--block health-offer__open',
        onclick: () => { setOn(true); ctx.rerender(); },
      }, svg(icons.plus), t('health.open')),
    ),
  ];
}
