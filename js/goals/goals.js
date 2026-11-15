import { read, write } from '../core/store.js';

/* МОИ ЦЕЛИ — то, чего женщина хочет добиться за программу и в жизни. Пишет сама, сколько хочет;
   сбылось — отмечает, и цель уходит в «Сбылось» с датой. Лежат на телефоне и в копии на сервере (sync/).

   С 64 (владелец 15.11.2026) у цели есть описание (note), фото (photos — номера снимков media/, как у записей,
   уходят в копию вместе с фото записей) и голос (goals/audio.js — на этом телефоне, как аудио «Дверей» «Кванта»). */

const KEY = 'goals';
export const MAX_GOALS = 100;
export const MAX_TEXT = 300;
export const MAX_NOTE = 2000;
const MAX_PHOTOS = 6;
const cleanPhotos = (list) => (Array.isArray(list) ? list.filter((id) => typeof id === 'string' && id.length <= 40).slice(0, MAX_PHOTOS) : []);

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

/** Описание и фото цели: { note?, photos? }. */
export function update(id, { note, photos } = {}) {
  write(KEY, all().map((g) => {
    if (g.id !== id) return g;
    const next = { ...g };
    if (note !== undefined) next.note = String(note || '').trim().slice(0, MAX_NOTE);
    if (photos !== undefined) next.photos = cleanPhotos(photos);
    return next;
  }));
}

/** Номера снимков, на которые ссылаются цели, — их нельзя стирать (media/used.js). */
export function photoIds() {
  return all().flatMap((g) => cleanPhotos(g.photos));
}

export function remove(id) {
  write(KEY, all().filter((g) => g.id !== id));
}
