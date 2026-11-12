import { read, write } from '../core/store.js';

/* МОИ ЦЕЛИ — то, чего женщина хочет добиться за программу и в жизни. Пишет сама, сколько хочет;
   сбылось — отмечает, и цель уходит в «Сбылось» с датой. Лежат только на этом телефоне, как и записи. */

const KEY = 'goals';
export const MAX_GOALS = 100;
export const MAX_TEXT = 300;

const newId = () => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const isGoal = (g) => g && typeof g.id === 'string' && typeof g.text === 'string';

export function all() {
  const list = read(KEY, []);
  return Array.isArray(list) ? list.filter(isGoal) : [];
}

/** Новая цель; пустой текст — null. */
export function add(text, now = new Date()) {
  const clean = String(text || '').trim().slice(0, MAX_TEXT);
  const list = all();
  if (!clean || list.length >= MAX_GOALS) return null;
  const goal = { id: newId(), text: clean, done: false, createdAt: now.toISOString(), doneAt: null };
  write(KEY, [goal, ...list]);
  return goal;
}

export function rename(id, text) {
  const clean = String(text || '').trim().slice(0, MAX_TEXT);
  if (!clean) return;
  write(KEY, all().map((g) => (g.id === id ? { ...g, text: clean } : g)));
}

/** Сбылось / вернуть в работу. */
export function toggle(id, now = new Date()) {
  write(KEY, all().map((g) => (g.id === id ? { ...g, done: !g.done, doneAt: g.done ? null : now.toISOString() } : g)));
}

export function remove(id) {
  write(KEY, all().filter((g) => g.id !== id));
}
