import { read, write, remove } from '../core/store.js';
import { API_BASE } from '../config.js';

/* ТЕЛЕФОН РЕБЁНКА: его вход и записи семьи (сервер — planner/server/src/kids/).

   Вход — только через родителя: ссылка от родителя (#kid=КОД) + пароль, который задал родитель. После входа телефон
   ждёт, пока родитель подтвердит его в своём кабинете (status pending → active).

   Хранилище телефона (свои ключи, со взрослым кабинетом не пересекаются):
     kid        — { token, name, status, code } — сессия ребёнка;
     kid-family — семья: участники и номер последней правки (как у взрослых в circles);
     kid-data   — { cursor, items, pending } — общие записи семьи и то, что ждёт отправки.
   Обмен — как у взрослых: правка сразу на телефон и через полсекунды на сервер; опрос при открытии, при возврате и
   раз в 30 секунд на экране. Нет сети — ждёт. */

const KEY = 'kid';
const FAMILY = 'kid-family';
const DATA = 'kid-data';
const POLL_MS = 30_000;
const PUSH_DELAY_MS = 500;

export class KidApiError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

let fetchFn = (...a) => fetch(...a);
let pushTimer = null;
let running = null;
let started = false;

export const session = () => read(KEY, null);
export const family = () => read(FAMILY, null);

async function request(path, { body, token = session()?.token } = {}) {
  let res;
  try {
    res = await fetchFn(API_BASE + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new KidApiError('network', 0);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (res.status === 429) throw new KidApiError(data?.error === 'locked' ? 'locked' : 'rate_limited', 429);
  if (!res.ok) throw new KidApiError(data?.error || 'other', res.status);
  return data;
}

/** Код входа из ссылки родителя: #kid=КОД — запомнить до входа и убрать из адреса. */
export function takeLink() {
  const params = new URLSearchParams(location.hash.replace(/^#\/?/, ''));
  const code = params.get('kid');
  if (!code) return null;
  history.replaceState(null, '', location.pathname + location.search);
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function deviceName() {
  const ua = globalThis.navigator?.userAgent || '';
  const m = ua.match(/\(([^)]+)\)/);
  return (m ? m[1].split(';').slice(0, 2).join(',') : 'Телефон').slice(0, 80);
}

/** Вход: код из ссылки + пароль от родителя → телефон ждёт подтверждения. */
export async function login(code, password) {
  const res = await request('/api/kids/login', { body: { code, password, device: deviceName() }, token: null });
  write(KEY, { token: res.token, name: res.name, status: res.status, code });
  return res;
}

/** Спросить сервер: подтвердил ли родитель, кто в семье, есть ли новое. Отказ сессии — выход. */
export async function checkMe() {
  const s = session();
  if (!s?.token) return null;
  try {
    const me = await request('/api/kids/me');
    const next = { ...s, name: me.name || s.name, status: me.status, closed: false };
    if (JSON.stringify(next) !== JSON.stringify(s)) write(KEY, next);
    if (me.family) {
      const prev = family();
      if (JSON.stringify(prev) !== JSON.stringify(me.family)) write(FAMILY, me.family);
    }
    return me;
  } catch (err) {
    if (err.code === 'access_expired') write(KEY, { ...s, closed: true });
    else if (err.status === 401) forget();
    throw err;
  }
}

/** Выйти на этом телефоне: сессия и записи семьи стираются с телефона (у семьи всё остаётся). */
export async function logout() {
  const s = session();
  if (s?.token) await request('/api/kids/logout', { body: {} }).catch(() => {});
  forget();
}

export function forget() {
  remove(KEY);
  remove(FAMILY);
  remove(DATA);
}

/* ---------- Записи семьи ---------- */

function slot() {
  const d = read(DATA, null);
  return d && typeof d === 'object' ? { cursor: d.cursor || 0, items: d.items || {}, pending: d.pending || {} } : { cursor: 0, items: {}, pending: {} };
}

export function items(kind = null) {
  return Object.values(slot().items).filter((x) => !x.deletedAt && (!kind || x.kind === kind));
}

export const item = (kind, id) => {
  const x = slot().items[`${kind}/${id}`];
  return x && !x.deletedAt ? x : null;
};

export function put(kind, id, data) {
  const s = slot();
  const key = `${kind}/${id}`;
  const prev = s.items[key];
  const rec = { kind, id, author: prev?.author || family()?.me, data, updatedAt: new Date().toISOString(), deletedAt: null };
  s.items[key] = rec;
  s.pending[key] = rec;
  write(DATA, s);
  schedulePush();
  return rec;
}

export function drop(kind, id) {
  const s = slot();
  const key = `${kind}/${id}`;
  if (!s.items[key]) return;
  const at = new Date().toISOString();
  const rec = { ...s.items[key], data: null, updatedAt: at, deletedAt: at };
  s.items[key] = rec;
  s.pending[key] = rec;
  write(DATA, s);
  schedulePush();
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => refresh().catch(() => {}), PUSH_DELAY_MS);
}

async function pull() {
  let s = slot();
  for (let guard = 0; guard < 20; guard++) {
    const sent = Object.values(s.pending);
    const res = await request('/api/kids/sync', {
      body: { cursor: s.cursor, changes: sent.map(({ kind, id, data, updatedAt, deletedAt }) => ({ kind, id, data, updatedAt, deletedAt })) },
    });
    s = slot();
    for (const r of sent) {
      const key = `${r.kind}/${r.id}`;
      if (s.pending[key]?.updatedAt === r.updatedAt) delete s.pending[key];
    }
    // Отказ сервера (например, «только родитель») — своя правка уходит, остаётся то, что на сервере
    for (const r of res.rejected || []) delete s.items[`${r.kind}/${r.id}`];
    for (const r of res.changes || []) {
      const key = `${r.kind}/${r.id}`;
      if (s.pending[key]) continue;
      s.items[key] = r;
    }
    s.cursor = res.cursor ?? s.cursor;
    write(DATA, s);
    if (!res.more) break;
  }
}

/** Сверить с сервером: подтверждён ли телефон, дочитать новое, отправить своё. */
export async function refresh() {
  if (!session()?.token) return;
  if (running) return running;
  running = (async () => {
    const me = await checkMe();
    if (me?.status !== 'active') return;
    const s = slot();
    if ((me.family?.version || 0) > s.cursor || Object.keys(s.pending).length) await pull();
  })().finally(() => { running = null; });
  return running;
}

export function start() {
  if (started) return;
  started = true;
  const tick = () => { if (globalThis.document?.visibilityState !== 'hidden') refresh().catch(() => {}); };
  tick();
  setInterval(tick, POLL_MS);
  globalThis.document?.addEventListener('visibilitychange', tick);
  globalThis.addEventListener?.('online', tick);
}

export const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Ребёнок как «участник семьи» для общих экранов (дела семьи, звёзды): то же устройство, что у родителя. */
export function adapter() {
  const f = family();
  return {
    circle: f,
    me: f?.me,
    role: 'child',
    items: (kind) => items(kind),
    put: (kind, id, data) => put(kind, id, data),
    drop: (kind, id) => drop(kind, id),
    newId,
    name: (id) => f?.members?.find((m) => m.id === id)?.name || '',
    markSeen: () => {},
  };
}

/** Для проверок. */
export function _useFetch(fn) {
  fetchFn = fn || ((...a) => fetch(...a));
}
