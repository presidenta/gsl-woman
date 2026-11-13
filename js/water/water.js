import * as settings from '../settings/settings.js';
import { t } from '../core/i18n.js';

/* СТАКАН ТЁПЛОЙ ВОДЫ — что человек кладёт в воду (владелец 13.11.2026: «составляющие стоят в столбик; нажимает —
   оно перемещается в стакан; человек сам себе выбирает, с чем пить воду»).

   Выбор живёт в настройках (settings.water — список ключей): он синхронизируется между устройствами вместе с
   настройками (sync/) и наутро уже стоит в стакане — менять каждый день незачем. Тексты — morning.water.items.<ключ>
   в js/texts обеих частей; рисунки — js/water/art.js. Выпил ли человек стакан сегодня — water-log.js. */

/** Составляющие по порядку: первая половина стоит слева от стакана, вторая — справа. Справа — «золотая смесь»
    подряд: мёд, куркума и перец (с перцем куркума усваивается в разы лучше). Семена чиа и льна (сборка 43) — внизу
    сторон: их замачивают заранее (чиа 15–30 минут, молотый лён 10–15, цельный — с вечера). */
export const ITEMS = ['lemon', 'ginger', 'mint', 'cinnamon', 'chia', 'honey', 'turmeric', 'pepper', 'clove', 'flax'];

/* Два стакана (сборка 43): утренний — бодрит, вечерний — успокаивает (владелец 13.11.2026: «стакан воды на ночь —
   успокаивающий, другой состав»). У каждого свои составляющие, свой выбор в настройках и свои тексты. */
export const KINDS = {
  morning: { items: ITEMS, setting: 'water', texts: 'morning.water' },
  night: { items: ['chamomile', 'melissa', 'linden', 'fennel', 'lemon', 'honey', 'turmeric', 'pepper', 'cinnamon'], setting: 'waterNight', texts: 'night' },
};
const kindOf = (kind) => KINDS[kind] || KINDS.morning;

/** «Золотая смесь» — собирается одной кнопкой в «Состав и польза». */
export const GOLDEN = ['honey', 'turmeric', 'pepper'];

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
  clove: [130, 72, 40, 0.12],
  chia: [200, 200, 190, 0.1],
  flax: [190, 150, 100, 0.14],
  chamomile: [250, 214, 110, 0.4],
  melissa: [176, 214, 140, 0.25],
  linden: [242, 222, 150, 0.32],
  fennel: [222, 212, 160, 0.15],
};

/** Что сейчас в стакане вида kind — только знакомые ключи, в порядке столбика. */
export function chosenOf(kind, list = settings.get()[kindOf(kind).setting]) {
  const set = new Set(Array.isArray(list) ? list : []);
  return kindOf(kind).items.filter((k) => set.has(k));
}

/** Утренний стакан (как было до вечернего). */
export const chosen = (list = settings.get().water) => chosenOf('morning', list);

/** Положить или убрать сразу несколько (золотая смесь) — в стакан вида kind. */
export function setItems(list, on, kind = 'morning') {
  const { items, setting } = kindOf(kind);
  const now = new Set(chosenOf(kind));
  for (const k of list) {
    if (!items.includes(k)) continue;
    if (on) now.add(k);
    else now.delete(k);
  }
  settings.update({ [setting]: items.filter((k) => now.has(k)) });
}

/** Положить или убрать одну составляющую. */
export const setItem = (item, on, kind = 'morning') => setItems([item], on, kind);

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
export function label(items = chosen(), kind = 'morning') {
  const base = kindOf(kind).texts;
  if (!items.length) return t(`${base}.plainShort`);
  return t(`${base}.withList`, { list: items.map((k) => t(`${base}.items.${k}.name`).toLowerCase()).join(', ') });
}
