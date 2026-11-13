import * as settings from '../settings/settings.js';
import { t } from '../core/i18n.js';

/* СТАКАН ТЁПЛОЙ ВОДЫ — что человек кладёт в воду (владелец 13.11.2026: «составляющие стоят в столбик; нажимает —
   оно перемещается в стакан; человек сам себе выбирает, с чем пить воду»).

   Выбор живёт в настройках (settings.water — список ключей): он синхронизируется между устройствами вместе с
   настройками (sync/) и наутро уже стоит в стакане — менять каждый день незачем. Тексты — morning.water.items.<ключ>
   в js/texts обеих частей; рисунки — js/water/art.js. */

/** Составляющие по порядку в столбике. Перец — сразу за куркумой: с ним она усваивается. */
export const ITEMS = ['lemon', 'ginger', 'honey', 'turmeric', 'pepper', 'cinnamon', 'mint'];

/* Как составляющая окрашивает воду: [r, g, b, сила]. Перец и мята почти не красят — у них свой рисунок в стакане.
   Чистая тёплая вода — светлая и прозрачная: на тёмном фоне она светится, а не сереет. */
const BASE = [255, 240, 210];
const TINTS = {
  lemon: [255, 226, 104, 0.45],
  ginger: [240, 212, 150, 0.25],
  honey: [228, 150, 44, 0.55],
  turmeric: [238, 166, 24, 0.85],
  pepper: [120, 96, 72, 0.06],
  cinnamon: [170, 96, 40, 0.45],
  mint: [150, 214, 150, 0.3],
};

/** Что сейчас в стакане — только знакомые ключи, в порядке столбика. */
export function chosen(list = settings.get().water) {
  const set = new Set(Array.isArray(list) ? list : []);
  return ITEMS.filter((k) => set.has(k));
}

/** Положить или убрать составляющую. */
export function setItem(item, on) {
  const now = new Set(chosen());
  if (on) now.add(item);
  else now.delete(item);
  settings.update({ water: ITEMS.filter((k) => now.has(k)) });
}

/** Цвет воды по составляющим: верх светлее, низ гуще; чем больше красящего, тем насыщеннее. */
export function waterColor(items) {
  let r = BASE[0];
  let g = BASE[1];
  let b = BASE[2];
  let weight = 1;
  let strength = 0;
  for (const k of items) {
    const tint = TINTS[k];
    if (!tint) continue;
    r += tint[0] * tint[3];
    g += tint[1] * tint[3];
    b += tint[2] * tint[3];
    weight += tint[3];
    strength += tint[3];
  }
  const rgb = [r, g, b].map((v) => Math.round(v / weight)).join(', ');
  // Чистая вода — почти прозрачная, тёплая к низу: на тёмном она светится, а не сереет
  const top = Math.min(0.12 + strength * 0.11, 0.42);
  const bottom = Math.min(0.28 + strength * 0.19, 0.8);
  return { top: `rgba(${rgb}, ${top.toFixed(2)})`, bottom: `rgba(${rgb}, ${bottom.toFixed(2)})` };
}

/** Короткая строка для виджета и напоминаний: «тёплая вода: лимон, мёд». */
export function label(items = chosen()) {
  if (!items.length) return t('morning.water.plainShort');
  return t('morning.water.withList', { list: items.map((k) => t(`morning.water.items.${k}.name`).toLowerCase()).join(', ') });
}
