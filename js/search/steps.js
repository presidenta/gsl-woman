import { read, write } from '../core/store.js';
import { isoDate, addDays, daysBetween, isValidIso } from '../core/dates.js';
import * as settings from '../settings/settings.js';

/* «МОИ ДЕЙСТВИЯ НА 7 ДНЕЙ» — «В ПОИСКЕ» (владелец 15–16.11.2026): переписка, выходы в люди, знакомства, свидания —
   человек отмечает каждое действие. Счёт — 7 дней ОТ ДНЯ СТАРТА человека («проплатил и подключился в среду — как
   будет?»): дни 1–7, 8–14… программы; старта ещё нет — с понедельника. Цели — в текстах с сервера (meet.search.steps).

   ОДИН ЖУРНАЛ ПО ДНЯМ (сборка 98): searchlog = { 'ISO дня': { chat: 2, out: 1 } } — уходит в копию (sync.js, вид
   searchlog). Из него считается всё: полоски — сумма дней семидневки, «+1 балл» — есть ли отметка в этот день.
   До 98 полоски и балл жили в двух разных ключах (searchsteps по семидневкам и searchday по дням) и расходились:
   отметки под прежней «неделей с понедельника» оставляли балл при нулевых полосках (владелец 16.11.2026: «везде
   0, а вверху +1 — это как понимать?»). Теперь расхождению неоткуда взяться. */

const KEY = 'searchlog';
const MAX = 99; // одного действия за 7 дней
const KEEP_DAYS = 60; // столько дней журнал помнит — хватает и на семидневку, и на баллы прошлых дней
const STEP_RX = /^[a-z]{1,20}$/;

function log() {
  const all = read(KEY, {});
  return all && typeof all === 'object' && !Array.isArray(all) ? all : {};
}

function dayOf(all, iso) {
  const d = all[iso];
  return d && typeof d === 'object' && !Array.isArray(d) ? d : {};
}

const sum = (d) => Object.values(d).reduce((s, v) => s + (Number(v) || 0), 0);

/** Сколько действий отмечено в день iso (по умолчанию — сегодня). */
export function today(iso = isoDate(new Date())) {
  return sum(dayOf(log(), iso));
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

/** Дни семидневки, начиная с её первого дня — до сегодня включительно (будущих отметок нет). */
function daysOf(week, todayIso) {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const iso = addDays(week, i);
    if (daysBetween(iso, todayIso) < 0) break;
    out.push(iso);
  }
  return out;
}

/** Счёт семидневки { действие: число } — сумма её дней. */
export function counts(week = weekKey()) {
  const all = log();
  const out = {};
  for (let i = 0; i < 7; i++) {
    for (const [k, v] of Object.entries(dayOf(all, addDays(week, i)))) out[k] = (out[k] || 0) + (Number(v) || 0);
  }
  return out;
}

/** Отметить действие сегодня (+1) или снять отметку (−1): снимается сегодняшняя, а нет её — последняя в семидневке. */
export function bump(step, delta) {
  if (!STEP_RX.test(step)) return 0;
  const now = new Date();
  const todayIso = isoDate(now);
  const week = weekKey(now);
  const all = { ...log() };
  const total = Number(counts(week)[step]) || 0;
  let iso = todayIso;
  if (delta > 0) {
    if (total >= MAX) return total;
  } else {
    iso = daysOf(week, todayIso).reverse().find((x) => (Number(dayOf(all, x)[step]) || 0) > 0);
    if (!iso) return total;
  }
  const day = { ...dayOf(all, iso) };
  const n = Math.max(0, (Number(day[step]) || 0) + (delta > 0 ? 1 : -1));
  if (n) day[step] = n; else delete day[step];
  if (Object.keys(day).length) all[iso] = day; else delete all[iso];
  for (const k of Object.keys(all)) if (!isValidIso(k) || daysBetween(k, todayIso) > KEEP_DAYS) delete all[k];
  write(KEY, all);
  return total + (delta > 0 ? 1 : -1);
}
