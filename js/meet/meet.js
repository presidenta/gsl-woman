import { read, write } from '../core/store.js';
import { langData } from '../program/source.js';

/* «ЗНАКОМСТВО» (владелец 14.11.2026): помощь тем, кто в поиске, — как держаться, где встретить, о чём спросить,
   как понять «это мой человек», и запись сразу после свидания, «пока помнишь». Тексты — с сервера вместе с
   программой (поле meet, у каждой части свои; пока только русский). Записи — здесь: ключ meetnotes, копия на
   сервере (sync/, вид meetnote). */

const KEY = 'meetnotes';
export const MAX_NOTES = 200;
export const MAX_TEXT = 1000;

const newId = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clean = (s, n = MAX_TEXT) => String(s || '').trim().slice(0, n);
const isNote = (x) => x && typeof x.id === 'string' && Array.isArray(x.answers);

/* Технология знакомства (владелец 14.11.2026): после встречи человек отмечает сигналы трёх тем — зелёные и
   красные (ключ «тема.номер», например past.0) — и получает подсказку: build — есть смысл строить, look — присмотрись
   ещё, pass — пусть идёт своей дорогой. Решает человек: это только подсказка. */
export const VERDICTS = ['build', 'look', 'pass'];

/** Подсказка по отмеченным сигналам; ничего не отмечено — null. */
export function verdictOf(green = [], red = []) {
  const g = green.length;
  const r = red.length;
  if (!g && !r) return null;
  if (r >= 2 && r >= g) return 'pass';
  if (g >= 3 && r <= 1) return 'build';
  return 'look';
}

const cleanKeys = (list) => (Array.isArray(list) ? list.filter((k) => typeof k === 'string' && /^(past|future|present)\.\d{1,2}$/.test(k)).slice(0, 30) : []);

/** Тексты раздела на языке интерфейса; программа ещё не пришла — null. */
export const content = (lang) => langData(lang)?.meet || null;

/** Записи после свиданий, новые сверху. */
export function all() {
  const list = read(KEY, []);
  return (Array.isArray(list) ? list.filter(isNote) : []).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/**
 * Новая запись: с кем (имя), когда (дата), ответы по подсказкам раздела (answers[i] — к prompts[i]).
 * Пустая (ни имени, ни одного ответа) — null.
 */
export function add({ name, date, answers, green, red }, now = new Date()) {
  const note = {
    id: newId(),
    name: clean(name, 60),
    date: /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : now.toISOString().slice(0, 10),
    answers: (Array.isArray(answers) ? answers : []).slice(0, 12).map((a) => clean(a)),
    green: cleanKeys(green),
    red: cleanKeys(red),
    createdAt: now.toISOString(),
  };
  note.verdict = verdictOf(note.green, note.red);
  if (!note.name && !note.answers.some(Boolean) && !note.verdict) return null;
  const list = all();
  if (list.length >= MAX_NOTES) return null;
  write(KEY, [note, ...list]);
  return note;
}

export function remove(id) {
  write(KEY, all().filter((n) => n.id !== id));
}
