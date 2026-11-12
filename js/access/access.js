import { read, write, remove } from '../core/store.js';

/* ДОСТУП К GSL WOMAN+ — как у «Кванта» (planner/web/js/core/access-controller.js; владелец 13.11.2026:
   «принцип как сделали в Кванте, точно так же»).

   Администратор «Кванта» ставит в карточке человека галочку «GSL Woman+» и срок (сервер — access/apps.js).
   Сервер отдаёт срок этого приложения в /api/me?app=gsl-woman (accessUntil): телефон хранит его у себя и
   решает сам, без интернета:
     • срок пустой — бессрочно: приложение работает всегда, что бы ни было с сетью и часами;
     • дата наступила — приложение закрывается само, пока при следующей связи сервер не пришлёт новую;
     • сервер ответил access_expired (галочку сняли или срок вышел) — закрыто сразу.
   Падение сервера и отсутствие сети закрытием НЕ считаются. Записи при закрытии НЕ стираются: ложное
   срабатывание уничтожило бы их безвозвратно. Часы перевели назад больше чем на 12 часов — по дате больше
   не решаем, закрыто до связи с сервером (как в «Кванте»). */

const KEY = 'access';
const UNLIMITED = 'unlimited';
const CLOCK_TOLERANCE_MS = 12 * 60 * 60 * 1000;

function state() {
  const s = read(KEY, null);
  return s && typeof s === 'object' ? s : { until: null, closed: false, clock: 0 };
}

function save(next) {
  write(KEY, next);
}

/** Приводит accessUntil к метке времени или к признаку бессрочного. */
function normalize(value) {
  if (value === null || value === undefined || value === '') return UNLIMITED;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isNaN(ms) ? UNLIMITED : ms;
}

/** Сервер прислал срок (вход, сверка): запомнить и открыть. */
export function remember(accessUntil, now = Date.now()) {
  save({ until: normalize(accessUntil), closed: false, clock: Math.max(state().clock || 0, now) });
}

/** Сервер ответил access_expired: закрыто, пока не продлят. */
export function close() {
  save({ ...state(), closed: true });
}

/** Открыто ли приложение сейчас — решает телефон сам, по сохранённой дате. */
export function isOpen(now = Date.now()) {
  const s = state();
  if (s.closed) return false;
  // Сервер ещё ни разу не прислал срок (старый сервер, первый запуск) или бессрочно — открыто
  if (s.until === null || s.until === undefined || s.until === UNLIMITED) return true;
  if (s.clock && now < s.clock - CLOCK_TOLERANCE_MS) return false;
  if (now > (s.clock || 0)) save({ ...s, clock: now });
  return now < s.until;
}

/** Срок для показа: null — бессрочно или ещё неизвестен; число — метка времени. */
export function until() {
  const u = state().until;
  return typeof u === 'number' ? u : null;
}

/** Другой человек на телефоне или выход — прежний срок здесь ни при чём. */
export function forget() {
  remove(KEY);
}
