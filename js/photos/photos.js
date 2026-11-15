import { h } from '../core/dom.js';
import { POOLS, FIXED } from './catalog.js';
import { SIZES } from './sizes.js';
import * as side from '../side/side.js';

/* ФОТО В ПРИЛОЖЕНИИ (js/photos/, владелец 15.11.2026). Где какие — catalog.js; файлы — assets/photos/NNN.webp
   (tools/photos.py). Вёрстка — как «Архетипы»: портретное фото слева, крупно, текст его обтекает; широкое — во всю
   ширину. Фото не обрезается никогда (ни object-fit, ни рамка с пропорцией) — голова и фигура целиком.
   У каждой части свои фото: место ищется сначала как «ключ.woman» / «ключ.man»; есть такой ключ, но пустой —
   фото нет совсем (чужая роль не подставляется). */

const name = (n) => String(n).padStart(3, '0');

// Номер дня по местному календарю: в полночь фото сменяется у всех мест разом
const dayNo = (d = new Date()) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);

/* Круг по порядку (владелец 16.11.2026: «первый день — одна фотография, второй — совсем другая, третий — где они вместе…
   столько, сколько есть фотографий, а потом по кругу»): с 16.11.2026 каждое место показывает свой ряд с первого кадра,
   по кадру в день, дошло до конца — заново. Порядок кадров — тот, что записан в catalog.js. */
const START = dayNo(new Date(2026, 10, 16));
const mod = (a, n) => ((a % n) + n) % n;

/** Ряд места для части: свой («ключ.часть»), иначе общий; нет ни того, ни другого — null. */
function listOf(table, key, part) {
  const own = `${key}.${part || side.get() || 'woman'}`;
  return own in table ? table[own] : table[key] ?? null;
}

/** Номер фото места key на сегодня (набор меняется по дням) или null. part — 'woman' / 'man', по умолчанию текущая. */
export function pick(key, date, part) {
  const list = listOf(POOLS, key, part);
  if (!list?.length) return null;
  return list[mod(dayNo(date) - START, list.length)];
}

/** Постоянное фото: «Вопросы» / «Библиотека», i — порядковый номер плашки. */
export function fixed(kind, i, part) {
  const list = listOf(FIXED, kind, part);
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
