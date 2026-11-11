import { WEEK_DAYS, MONTH_WEEKS, PROGRAM_DAYS } from '../config.js';

/* ДАТЫ И ДНИ ПРОГРАММЫ.

   У каждой участницы своя неделя: она отсчитывается от её даты старта, а не от календарного
   понедельника (владелец, 05.11.2026: начала в среду — седьмой день во вторник, там и созвон).

   Дата хранится строкой «ГГГГ-ММ-ДД» по местному времени. Разницу дней считаем через UTC от
   года-месяца-числа: так переход на летнее время (сутки в 23 или 25 часов) не сдвигает номер дня. */

const pad = (n) => String(n).padStart(2, '0');

/** Местная дата «ГГГГ-ММ-ДД» для момента времени. */
export function isoDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Строку «ГГГГ-ММ-ДД» → [год, месяц, число]; кривая строка → null. */
function parts(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function isValidIso(iso) {
  const p = parts(iso);
  if (!p) return false;
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
}

function utcDay(iso) {
  const p = parts(iso);
  return Date.UTC(p[0], p[1] - 1, p[2]) / 86_400_000;
}

/** Сколько дней от a до b (b позже — положительное). */
export function daysBetween(a, b) {
  return Math.round(utcDay(b) - utcDay(a));
}

/** Дата через n дней. */
export function addDays(iso, n) {
  const p = parts(iso);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Номер дня программы: день старта — 1. До старта — 0 и меньше, после финала — больше 168. */
export function programDay(startIso, todayIso) {
  return daysBetween(startIso, todayIso) + 1;
}

/** Дата, на которую приходится день программы. */
export function dateOfDay(startIso, day) {
  return addDays(startIso, day - 1);
}

export const weekOf = (day) => Math.ceil(day / WEEK_DAYS);
export const dayInWeek = (day) => ((day - 1) % WEEK_DAYS) + 1;
export const monthOf = (week) => Math.ceil(week / MONTH_WEEKS);
export const firstDayOfWeek = (week) => (week - 1) * WEEK_DAYS + 1;
export const inProgram = (day) => day >= 1 && day <= PROGRAM_DAYS;

/** Момент «дата + ЧЧ:ММ» по местному времени. */
export function atTime(iso, hhmm) {
  const p = parts(iso);
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return new Date(p[0], p[1] - 1, p[2], h || 0, m || 0, 0, 0);
}

/** «ЧЧ:ММ» допустимо? */
export function isValidTime(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(hhmm || ''));
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60;
}
