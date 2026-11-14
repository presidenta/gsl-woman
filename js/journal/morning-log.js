import { read, write } from '../core/store.js';

/* УТРЕННЯЯ МИНУТА: отметка «сделала сегодня» по дате. Отдельно от записей: это привычка каждого дня,
   а не задание недели, и в процент недели она не входит. Хранятся последние 400 дат.

   С 53 (владелец 14.11.2026: баллы за день) — с уровнем: morning[iso] = { level: 'min' | 'full' | 'max' }
   (1, 2 или 3 минуты; остаётся лучший за день). Старая отметка true — «сделала», уровень неизвестен: считаем
   Минимумом. Значение — объект, а не строка: синхронизация принимает объект или true (sync/, сервер gsl/sync). */

const KEY = 'morning';
const KEEP = 400;
const LEVELS = ['min', 'full', 'max'];

function log() {
  const value = read(KEY, {});
  return value && typeof value === 'object' ? value : {};
}

/** Уровень минуты за день: 'min' | 'full' | 'max' или null — минуты не было. */
export function levelOf(iso) {
  const v = log()[iso];
  if (v === true) return 'min';
  return LEVELS.includes(v?.level) ? v.level : null;
}

export const isDone = (iso) => levelOf(iso) !== null;

/** Минута дошла до конца: уровень по длине (1 мин — min, 2 — full, 3 — max); остаётся лучший за день. */
export function markDone(iso, level = 'min') {
  const lv = LEVELS.includes(level) ? level : 'min';
  const now = levelOf(iso);
  if (now && LEVELS.indexOf(now) >= LEVELS.indexOf(lv)) return;
  const next = { ...log(), [iso]: { level: lv } };
  const keys = Object.keys(next).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - KEEP))) delete next[k];
  write(KEY, next);
}

export const KEY_NAME = KEY;
