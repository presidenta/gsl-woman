import { read, write } from '../core/store.js';

/* ПИСЬМО СЕБЕ В БУДУЩЕЕ — счёт и хранение (владелец 14.11.2026: «письмо самому себе через год, через 5, через 10 —
   или любую цифру он сам выставляет; максимум 3 письма; в кабинете ребёнка — можно вместе с родителями; и у мужчины,
   и у женщины — в разделе «Цели»»).

   Письмо: { id, text, writtenAt, openAt (ГГГГ-ММ-ДД), years, together?, readAt? }. Запечатано до openAt — текст
   не показывается даже автору; в этот день «Пришло письмо из прошлого». Запечатанных — не больше трёх сразу.

   Хранение — через «ящик» (box): у взрослого — его кабинет (ключ letters, синхронизируется как цели, sync/),
   у ребёнка — записи семьи (kids/kid-app.js). */

export const MAX_SEALED = 3;
export const MAX_TEXT = 4000;
export const YEAR_CHOICES = [1, 5, 10];
export const MAX_YEARS = 50;

const pad = (n) => String(n).padStart(2, '0');
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** День, когда письмо откроется: тот же день месяца через years лет (29 февраля — 28-го). */
export function openAtFor(years, now = new Date()) {
  const y = Math.min(MAX_YEARS, Math.max(1, Math.round(Number(years) || 1)));
  const d = new Date(now.getFullYear() + y, now.getMonth(), now.getDate());
  if (d.getMonth() !== now.getMonth()) d.setDate(0);
  return isoDay(d);
}

export const isSealed = (l, now = new Date()) => isoDay(now) < l.openAt;

export function daysLeft(l, now = new Date()) {
  const a = new Date(`${isoDay(now)}T12:00:00`);
  const b = new Date(`${l.openAt}T12:00:00`);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export const sealedCount = (list, now = new Date()) => list.filter((l) => isSealed(l, now)).length;
export const canWrite = (list, now = new Date()) => sealedCount(list, now) < MAX_SEALED;

/** Пришли, но ещё не прочитаны. */
export const arrived = (list, now = new Date()) => list.filter((l) => !isSealed(l, now) && !l.readAt);

/** Новое письмо (или null: пусто, три запечатаны). */
export function compose(list, { text, years, together = false }, now = new Date()) {
  const clean = String(text || '').trim().slice(0, MAX_TEXT);
  if (!clean || !canWrite(list, now)) return null;
  const y = Math.min(MAX_YEARS, Math.max(1, Math.round(Number(years) || 1)));
  return {
    id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: clean, writtenAt: now.toISOString(), openAt: openAtFor(y, now), years: y, together: !!together, readAt: null,
  };
}

const KEY = 'letters';
const isLetter = (l) => l && typeof l.id === 'string' && typeof l.text === 'string' && typeof l.openAt === 'string';

/** Ящик взрослого: его кабинет на телефоне (и в копии на сервере — sync/, вид letter). */
export const ownBox = {
  list: () => { const v = read(KEY, []); return Array.isArray(v) ? v.filter(isLetter) : []; },
  save(letter) { write(KEY, [letter, ...this.list().filter((l) => l.id !== letter.id)]); },
  remove(id) { write(KEY, this.list().filter((l) => l.id !== id)); },
};
