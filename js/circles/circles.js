import { read, write, subscribe } from '../core/store.js';
import { isoDate, addDays } from '../core/dates.js';
import { current, request } from '../account/session.js';
import * as side from '../side/side.js';

/* «ПАРА» И «СЕМЬЯ» — ДАННЫЕ И ОБМЕН (владелец 13.11.2026, ТЗ — docs/TZ-para-semya.md; сервер — planner/server/src/circles/).

   Контур (circle) — пара или семья: участники и общие записи (items). На телефоне:
     circles     — { userId, list }: мои контуры с участниками (как их отдал сервер);
     circle-data — { [id]: { cursor, items, pending } }: общие записи по ключу «вид/id» и то, что ждёт отправки.

   Обмен — ничего нового (владелец: «как сейчас: изменилось — сразу на сервер; у другого — обновилось»):
     - правка (put / drop) ложится сразу на телефон и через полсекунды уходит на сервер; нет сети — ждёт;
     - получатель спрашивает список своих контуров при открытии, при возврате в приложение и раз в 30 секунд,
       пока оно на экране: в списке — номер последней правки каждого контура; вырос — дочитываем записи.
   Закрытое приложение ничего не спрашивает (сознательно: без сторонних служб и без нагрузки на телефон).

   Запись: { kind, id, author, data, updatedAt, deletedAt }. Свои виды (msg, mark, talk, contrib) сервер даёт
   править только автору. Отдельные части — chat.js, wishes.js, goals-model.js, talk.js, dreams.js. */

const LIST = 'circles';
const DATA = 'circle-data';
const SEEN = 'circle-seen';
const BASE = '/api/gsl/circles';
const POLL_MS = 30_000;
const PUSH_DELAY_MS = 500;

let requestFn = request;
let pushTimer = null;
let running = null;
let started = false;
const listeners = new Set();

/* ---------- Чтение ---------- */

function listState() {
  const s = read(LIST, null);
  const me = current()?.userId || null;
  return s && s.userId === me && Array.isArray(s.list) ? s.list : [];
}

/** Мои контуры: пара и/или семья. */
export const all = () => listState();
export const pair = () => all().find((c) => c.kind === 'pair') || null;
export const family = () => all().find((c) => c.kind === 'family') || null;
export const byId = (id) => all().find((c) => c.id === id) || null;

/** Контур готов: в паре двое, в семье есть хотя бы один родитель (дети — по желанию). */
export const isComplete = (c) => !!c && (c.kind === 'pair' ? c.members.filter((m) => m.role !== 'child').length === 2 : true);

export const meOf = (c) => c?.members.find((m) => m.id === c.me) || null;
export const othersOf = (c) => (c ? c.members.filter((m) => m.id !== c.me) : []);
export const partnerOf = (c) => othersOf(c).find((m) => m.role !== 'child') || null;
export const memberName = (c, id) => c?.members.find((m) => m.id === id)?.name || '';
/** Короткая метка участника для ключей записей (ключ ограничен 64 знаками). */
export const short = (memberId) => String(memberId).replace(/-/g, '').slice(0, 8);

function dataState() {
  const s = read(DATA, {});
  return s && typeof s === 'object' ? s : {};
}

function slot(id) {
  const d = dataState()[id];
  return d && typeof d === 'object' ? { cursor: d.cursor || 0, items: d.items || {}, pending: d.pending || {} } : { cursor: 0, items: {}, pending: {} };
}

/** Живые записи контура одного вида (или всех). */
export function items(circleId, kind = null) {
  return Object.values(slot(circleId).items).filter((x) => !x.deletedAt && (!kind || x.kind === kind));
}

export const item = (circleId, kind, id) => {
  const x = slot(circleId).items[`${kind}/${id}`];
  return x && !x.deletedAt ? x : null;
};

/* ---------- Неделя ---------- */

/** Понедельник календарной недели даты (желания, счётчики «на неделю», разговор). */
export function weekOf(iso = isoDate()) {
  const d = new Date(`${iso}T12:00:00`);
  const shift = (d.getDay() + 6) % 7;
  return addDays(iso, -shift);
}
export const compact = (iso) => iso.replace(/-/g, '');

/* ---------- Правки ---------- */

function saveSlot(id, s) {
  const all = dataState();
  all[id] = s;
  write(DATA, all);
}

/** Положить запись (новую или правку) — сразу на телефон, на сервер — через полсекунды. */
export function put(circleId, kind, id, data) {
  const c = byId(circleId);
  if (!c) return null;
  const s = slot(circleId);
  const key = `${kind}/${id}`;
  const prev = s.items[key];
  const rec = { kind, id, author: prev?.author || c.me, data, updatedAt: new Date().toISOString(), deletedAt: null };
  s.items[key] = rec;
  s.pending[key] = rec;
  saveSlot(circleId, s);
  schedulePush();
  return rec;
}

/** Убрать запись: остаётся отметка удаления, чтобы она дошла до второго. */
export function drop(circleId, kind, id) {
  const s = slot(circleId);
  const key = `${kind}/${id}`;
  if (!s.items[key]) return;
  const rec = { ...s.items[key], data: null, updatedAt: new Date().toISOString(), deletedAt: new Date().toISOString() };
  s.items[key] = rec;
  s.pending[key] = rec;
  saveSlot(circleId, s);
  schedulePush();
}

export const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/* ---------- Прочитано (только на этом телефоне) ---------- */

export function seenAt(circleId) {
  return (read(SEEN, {}) || {})[circleId] || '';
}

export function markSeen(circleId) {
  const last = items(circleId, 'msg').map((m) => m.data?.at || m.updatedAt).sort().pop();
  if (!last || last <= seenAt(circleId)) return;
  write(SEEN, { ...(read(SEEN, {}) || {}), [circleId]: last });
}

/** Новые сообщения от других: [{ circle, msg }] — свежие сверху. */
export function unread() {
  const out = [];
  for (const c of all()) {
    const seen = seenAt(c.id);
    for (const m of items(c.id, 'msg')) {
      const at = m.data?.at || m.updatedAt;
      if (m.author !== c.me && at > seen) out.push({ circle: c, msg: m, at });
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/** Пришло новое сообщение от другого — карточка/плашка зовут onMessage. */
export function onMessage(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ---------- Обмен с сервером ---------- */

const ready = () => {
  const s = current();
  return !!s?.token && !side.needsChoice(s);
};

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => refresh().catch(() => {}), PUSH_DELAY_MS);
}

function setList(list) {
  const me = current()?.userId || null;
  const prev = read(LIST, null);
  const next = { userId: me, list };
  if (JSON.stringify(prev) !== JSON.stringify(next)) write(LIST, next);
  // Контура больше нет (вышли из пары) — его записи с телефона уходят
  const data = dataState();
  const keep = new Set(list.map((c) => c.id));
  let changed = false;
  for (const id of Object.keys(data)) if (!keep.has(id)) { delete data[id]; changed = true; }
  if (changed) write(DATA, data);
}

async function pull(circleId) {
  let s = slot(circleId);
  const fresh = [];
  for (let guard = 0; guard < 20; guard++) {
    const sent = Object.values(s.pending);
    const res = await requestFn(`${BASE}/${circleId}/sync`, {
      body: { cursor: s.cursor, changes: sent.map(({ kind, id, data, updatedAt, deletedAt }) => ({ kind, id, data, updatedAt, deletedAt })) },
    });
    s = slot(circleId);
    // Отправленное снимаем с очереди, если его не поправили, пока шёл ответ
    for (const r of sent) {
      const key = `${r.kind}/${r.id}`;
      if (s.pending[key]?.updatedAt === r.updatedAt) delete s.pending[key];
    }
    const c = byId(circleId);
    for (const r of res.changes || []) {
      const key = `${r.kind}/${r.id}`;
      if (s.pending[key]) continue; // своя правка новее — уйдёт следующим запросом
      const had = s.items[key];
      s.items[key] = r;
      if (r.kind === 'msg' && !r.deletedAt && !had && c && r.author !== c.me) fresh.push({ circle: c, msg: r });
    }
    s.cursor = res.cursor ?? s.cursor;
    saveSlot(circleId, s);
    if (!res.more) break;
  }
  return fresh;
}

/** Сверить с сервером: список контуров, дочитать новое, отправить своё. Нет сети — тихо ждём. */
export async function refresh() {
  if (!ready()) return;
  if (running) return running;
  running = (async () => {
    const list = await requestFn(BASE);
    if (!Array.isArray(list)) return;
    setList(list);
    const fresh = [];
    for (const c of list) {
      const s = slot(c.id);
      if (c.version > s.cursor || Object.keys(s.pending).length) fresh.push(...await pull(c.id));
    }
    const seen = (read(SEEN, {}) || {});
    for (const f of fresh) {
      const at = f.msg.data?.at || f.msg.updatedAt;
      if (at > (seen[f.circle.id] || '')) for (const fn of listeners) fn(f);
    }
  })().finally(() => { running = null; });
  return running;
}

/* Действия со связкой — сразу на сервер (нужен интернет). Ответ — свежий список контуров. */
async function act(path, body) {
  const list = await requestFn(path, { body: body ?? {} });
  if (Array.isArray(list)) setList(list);
  return list;
}

export const create = (kind) => act(BASE, { kind });
export const join = (code) => act(`${BASE}/join`, { code });
export const leave = (id) => act(`${BASE}/${id}/leave`);
export const addChild = (id, name) => act(`${BASE}/${id}/children`, { name });
export const renameChild = (id, child, name) => act(`${BASE}/${id}/children/${child}`, { name });
export const invite = (id) => requestFn(`${BASE}/${id}/invite`, { body: {} });

/** Включить обмен: при старте, при возврате в приложение, раз в 30 секунд на экране и при появлении сети. */
export function start() {
  if (started) return;
  started = true;
  const tick = () => { if (globalThis.document?.visibilityState !== 'hidden') refresh().catch(() => {}); };
  tick();
  setInterval(tick, POLL_MS);
  globalThis.document?.addEventListener('visibilitychange', tick);
  globalThis.addEventListener?.('online', tick);
}

/** Подписка на правки хранилища — для привязки счётчиков целей к привычкам (goals-model.js). */
export const watchStore = (fn) => subscribe(fn);

/** Для проверок. */
export function _useRequest(fn) {
  requestFn = fn || request;
}
