import { h } from '../core/dom.js';
import { t } from '../core/i18n.js';

/* НАЗВАНИЕ «GSL Woman+» / «GSL Man+» — плюс отдельным золотым знаком над строкой, как на значке. Плюс — от статуса
   «Жінка-Плюс» (владелец, 12.11.2026). В текстах название пишется целиком (app.name), здесь только вид.
   name — другое название: общее «GSL (W+M)+» на входе и выборе пола (app.shared), плюс так же — «в степени». */

export function brand(cls = '', name = t('app.name')) {
  const plus = name.endsWith('+');
  return h('span', { class: `brand ${cls}`.trim() },
    plus ? name.slice(0, -1) : name,
    plus ? h('span', { class: 'brand__plus' }, '+') : null,
  );
}
