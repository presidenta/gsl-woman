import { read, write } from '../core/store.js';

/* СТАКАН ВЫПИТ: отметка по дате (владелец 13.11.2026: «нужна статистика, пил ли человек воду, каждый день»).
   Человек ставит её сам кнопкой «Я выпила стакан» на карточке — пить ли воду, приложение узнать само не может.
   Как и отметки утренней минуты (journal/morning-log.js), это привычка дня: в процент недели не входит, идёт в
   итоги «Утро» (insights/habits.js) и синхронизируется (sync/ → вид записи water). Хранятся последние 400 дат. */

const KEY = 'waterlog';
const KEEP = 400;

function log() {
  const value = read(KEY, {});
  return value && typeof value === 'object' ? value : {};
}

export function isDone(iso) {
  return log()[iso] === true;
}

/** Поставить или снять отметку дня. */
export function setDone(iso, on) {
  const next = { ...log() };
  if (on) next[iso] = true;
  else delete next[iso];
  const keys = Object.keys(next).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - KEEP))) delete next[k];
  write(KEY, next);
}

export const KEY_NAME = KEY;
