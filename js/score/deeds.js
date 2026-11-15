import { read, write } from '../core/store.js';

/* ОТМЕТКИ «ПОЛУЧИЛОСЬ» (владелец 14.11.2026, сборка 57): у карточек без своего журнала — «Пять языков любви» и
   «Я-сообщение» — человек сам нажимает «Получилось» и получает +1 балл. «Хоть одно слово сказал, хоть одному человеку
   что-то сделал — уже балл». Повторное нажатие снимает отметку.

     deeds[iso] = { love: true, imsg: true }

   Синхронизируется (sync/ → вид deeds): значение — объект, как у остальных отметок. Хранятся последние 400 дат. */

const KEY = 'deeds';
const KEEP = 400;

function log() {
  const v = read(KEY, {});
  return v && typeof v === 'object' ? v : {};
}

/** Отмечено ли дело what ('love' | 'imsg') в день iso. */
export const isDone = (iso, what) => log()[iso]?.[what] === true;

/** Поставить или снять отметку. */
export function toggle(iso, what) {
  const all = { ...log() };
  const day = { ...(all[iso] || {}) };
  if (day[what]) delete day[what];
  else day[what] = true;
  if (Object.keys(day).length) all[iso] = day;
  else delete all[iso];
  const keys = Object.keys(all).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - KEEP))) delete all[k];
  write(KEY, all);
}

export const KEY_NAME = KEY;
