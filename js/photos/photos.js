import { h } from '../core/dom.js';
import { POOLS, FIXED } from './catalog.js';
import { SIZES } from './sizes.js';

/* ФОТО В ПРИЛОЖЕНИИ (js/photos/, владелец 15.11.2026). Где какие — catalog.js; файлы — assets/photos/NNN.webp
   (tools/photos.py). Вёрстка — как «Архетипы»: портретное фото слева, крупно, текст его обтекает; широкое — во всю
   ширину. Фото не обрезается никогда (ни object-fit, ни рамка с пропорцией) — голова и фигура целиком. */

const name = (n) => String(n).padStart(3, '0');

// Номер дня по местному календарю: в полночь фото сменяется у всех мест разом
const dayNo = (d = new Date()) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);

// Сдвиг по имени места: соседние места в один день показывают разные кадры общего ряда
function salt(key) {
  let s = 0;
  for (const c of key) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return s;
}

/** Номер фото места key на сегодня (набор меняется по дням) или null, если такого набора нет. */
export function pick(key, date) {
  const list = POOLS[key];
  if (!list?.length) return null;
  return list[(dayNo(date) + salt(key)) % list.length];
}

/** Постоянное фото: «Вопросы» / «Библиотека», i — порядковый номер плашки. */
export function fixed(kind, i) {
  const list = FIXED[kind];
  return list?.length ? list[i % list.length] : null;
}

/** Узел фото по номеру: портретное — слева с обтеканием, широкое — во всю ширину. Нет файла — null. */
export function photo(n, cls = '') {
  if (n == null) return null;
  const id = name(n);
  const size = SIZES[id];
  if (!size) return null;
  const [w, hgt] = size;
  const wide = w / hgt > 1.15;
  return h('img', {
    class: `photo ${wide ? 'photo--wide' : 'photo--side'} ${cls}`.trim(),
    src: `./assets/photos/${id}.webp`,
    width: String(w),
    height: String(hgt),
    alt: '',
    loading: 'lazy',
    decoding: 'async',
  });
}

/** Фото места на сегодня: photo(pick(key)). */
export const photoOf = (key, cls) => photo(pick(key), cls);
