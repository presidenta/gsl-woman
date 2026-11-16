import { read, write } from '../core/store.js';
import { isoDate, addDays, daysBetween, isValidIso } from '../core/dates.js';
import * as settings from '../settings/settings.js';

/* «МОИ ДЕЙСТВИЯ НА 7 ДНЕЙ» — «В ПОИСКЕ» (владелец 15–16.11.2026): переписка, выходы в люди, знакомства, свидания —
   человек отмечает каждое действие. Счёт — 7 дней ОТ ДНЯ СТАРТА человека («проплатил и подключился в среду — как
   будет?»): дни 1–7, 8–14… программы; старта ещё нет — с понедельника. Цели — в текстах с сервера (meet.search.steps).
   Ключ searchsteps: { 'первый день семидневки ISO': { out: 2, date: 1 } } — уходит в копию (sync.js, вид searchstep). */

const KEY = 'searchsteps';
const MAX = 99;
// Отметки сегодняшнего дня (владелец 15.11.2026: карточка «В поиске» на «Сегодня» — как все, с «+1 балл» у названия):
// searchday: { 'ISO дня': { n: сколько шагов отмечено в этот день } } (копия принимает только объекты); уходит в копию (sync.js, вид searchday), как и шаги,
// — балл тот же на любом телефоне; хранятся последние 60 дней
const DAY_KEY = 'searchday';
const KEEP_DAYS = 60;

/** Сколько шагов отмечено в день iso (по умолчанию — сегодня). */
export function today(iso = isoDate(new Date())) {
  return Number(read(DAY_KEY, {})?.[iso]?.n) || 0;
}

function bumpDay(delta) {
  const iso = isoDate(new Date());
  const all = { ...(read(DAY_KEY, {}) || {}) };
  all[iso] = { n: Math.max(0, (Number(all[iso]?.n) || 0) + delta) };
  const keys = Object.keys(all).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete all[k];
  write(DAY_KEY, all);
}

/** Ключ семидневки даты: первый её день — от дня старта шагами по 7 дней; старта нет — понедельник. */
export function weekKey(d = new Date(), start = settings.get().startDate) {
  const iso = isoDate(d);
  if (start && isValidIso(start)) {
    const n = daysBetween(start, iso);
    if (n >= 0) return addDays(start, n - (n % 7));
  }
  return addDays(iso, -((d.getDay() + 6) % 7));
}

/** Счёт недели { шаг: число }. */
export function counts(week = weekKey()) {
  const w = read(KEY, {})?.[week];
  return w && typeof w === 'object' && !Array.isArray(w) ? w : {};
}

/** Отметить шаг (+1) или убрать отметку (-1). */
export function bump(step, delta, week = weekKey()) {
  if (!/^[a-z]{1,20}$/.test(step)) return 0;
  const all = read(KEY, {}) || {};
  const cur = counts(week);
  const was = Number(cur[step]) || 0;
  const n = Math.max(0, Math.min(MAX, was + delta));
  write(KEY, { ...all, [week]: { ...cur, [step]: n } });
  if (n !== was && week === weekKey()) bumpDay(n - was);
  return n;
}
