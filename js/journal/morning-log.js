import { read, write } from '../core/store.js';

/* УТРЕННЯЯ МИНУТА: отметка «сделала сегодня» по дате. Отдельно от записей: это привычка каждого дня,
   а не задание недели, и в процент недели она не входит. Хранятся последние 200 дат. */

const KEY = 'morning';

function log() {
  const value = read(KEY, {});
  return value && typeof value === 'object' ? value : {};
}

export function isDone(iso) {
  return log()[iso] === true;
}

export function markDone(iso) {
  const next = { ...log(), [iso]: true };
  const keys = Object.keys(next).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 200))) delete next[k];
  write(KEY, next);
}

export const KEY_NAME = KEY;
