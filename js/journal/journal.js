import { read, write } from '../core/store.js';
import { LEVELS } from '../config.js';

/* ЗАПИСИ УЧАСТНИЦЫ — единственный источник правды о выполнении.

   Запись = «в день N сделала упражнение на уровне X» плюс её история: что получилось, с каким
   мужчиной, что произошло, как именно. Отметка «сделала» без текста — тоже запись, с пустыми полями.
   Прогресс, кольцо недели и «наверстать» не хранятся отдельно, а каждый раз считаются из записей:
   так они не могут разойтись.

   Записи о мужчинах — личное: они лежат только на этом телефоне и никуда не отправляются.

   photos — номера снимков (сами снимки — в js/media/photos.js, до 6 на запись). */

const KEY = 'entries';

/** Виды записи: задание дня 1–3, свободная практика дней 4–6, итог и созвон дня 7. */
export const KINDS = ['task', 'flow', 'call'];
export const TEXT_FIELDS = ['worked', 'man', 'happened', 'how'];

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function all() {
  const list = read(KEY, []);
  return Array.isArray(list) ? list.filter(isEntry) : [];
}

function isEntry(e) {
  return e && typeof e.id === 'string' && Number.isInteger(e.day) && KINDS.includes(e.kind);
}

const MAX_PHOTOS = 6;
const cleanPhotos = (list) => (Array.isArray(list) ? list.filter((id) => typeof id === 'string' && id.length <= 40).slice(0, MAX_PHOTOS) : []);

/** Номера всех снимков, на которые ссылаются записи, — остальные можно стирать. */
export function photoIds() {
  return all().flatMap((e) => cleanPhotos(e.photos));
}

function clean(fields) {
  const out = {};
  for (const f of TEXT_FIELDS) out[f] = typeof fields[f] === 'string' ? fields[f].trim().slice(0, 2000) : '';
  return out;
}

export function forDay(day) {
  return all().filter((e) => e.day === day);
}

export function byId(id) {
  return all().find((e) => e.id === id) || null;
}

/** Новая запись. exercise — номер упражнения недели (для свободной практики), иначе null. */
export function add({ day, kind, exercise = null, level = 'full', photos = [], ...fields }, now = new Date()) {
  const entry = {
    id: newId(),
    day,
    kind,
    exercise: Number.isInteger(exercise) ? exercise : null,
    level: LEVELS.includes(level) ? level : 'full',
    ...clean(fields),
    photos: cleanPhotos(photos),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  write(KEY, [...all(), entry]);
  return entry;
}

export function update(id, patch, now = new Date()) {
  const list = all().map((e) => {
    if (e.id !== id) return e;
    const next = { ...e, ...clean({ ...e, ...patch }), updatedAt: now.toISOString() };
    if (LEVELS.includes(patch.level)) next.level = patch.level;
    if ('photos' in patch) next.photos = cleanPhotos(patch.photos);
    if ('exercise' in patch) next.exercise = Number.isInteger(patch.exercise) ? patch.exercise : null;
    return next;
  });
  write(KEY, list);
}

export function remove(id) {
  write(KEY, all().filter((e) => e.id !== id));
}

export const KEY_NAME = KEY;
