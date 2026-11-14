import { read, write, subscribe } from '../core/store.js';
import { current, request as apiRequest, isClosed } from '../account/session.js';
import * as access from '../access/access.js';
import * as side from '../side/side.js';
import * as media from '../media/photos.js';
import { syncPhotos, _use as usePhotos } from './photos.js';

/* СИНХРОНИЗАЦИЯ GSL WOMAN+ МЕЖДУ УСТРОЙСТВАМИ (владелец 13.11.2026: «это очень важно, обязательно»).

   До неё всё, что вводит женщина, жило только на одном устройстве. Теперь — как у GoldenFit: сервер «Кванта»
   хранит копию (POST /api/woman/sync, таблица woman_records), вошла на любом устройстве — всё на месте.
   Приложение остаётся автономным: правки сразу ложатся в хранилище телефона, а сюда — в очередь отправки;
   нет сети — очередь ждёт и уходит, когда связь появится.

   Что синхронизируется — COLLECTIONS: записи (каждая отдельно), цели, отметки утренней минуты и выпитого стакана воды по дням,
   настройки, «Пять языков любви». Фото — отдельным шагом (они тяжёлые). Остальные модули о синхронизации
   ничего не знают: этот модуль сам замечает изменение ключа хранилища и сам находит, что поменялось
   (сравнение с «тенью» — отпечатками того, что уже согласовано с сервером).

   Правила:
   - побеждает более поздняя правка (updatedAt), удаление доходит пометкой — так решает и сервер;
   - первый раз на устройстве (данные были до синхронизации): сначала забираем то, что уже есть на сервере;
     одиночное (настройки, языки) — берём с сервера, если оно там есть; из списков — добавляем то, чего на
     сервере ещё нет. Так полный кабинет на компьютере не затрётся пустым телефоном;
   - на устройство вошла ДРУГАЯ женщина — данные прежней с него убираются (они у неё на сервере), в кабинет
     новой они не уходят ни при каких условиях. */

const STATE = 'sync';
const ID_RX = /^[A-Za-z0-9_.:-]{1,64}$/;
const LEGACY = '2000-01-01T00:00:00.000Z';
const DEBOUNCE_MS = 2000;
const PERIOD_MS = 5 * 60_000;

/* Что синхронизируется: ключ хранилища, вид записи на сервере и как значение раскладывается на записи.
   list — массив объектов с id; map — объект «ключ → значение»; single — один объект целиком. */
export const COLLECTIONS = [
  { key: 'entries', kind: 'entry', type: 'list', empty: [] },
  { key: 'goals', kind: 'goal', type: 'list', empty: [] },
  { key: 'morning', kind: 'morning', type: 'map', empty: {} },
  // Стакан тёплой воды выпит — по дням (water/water-log.js), с 40
  { key: 'waterlog', kind: 'water', type: 'map', empty: {} },
  // Кегель и шаги — по дням (habits/logs.js), с 42
  { key: 'kegel', kind: 'kegel', type: 'map', empty: {} },
  // Стакан воды на ночь (water/water-log.js), с 43
  { key: 'waternight', kind: 'waternight', type: 'map', empty: {} },
  { key: 'steps', kind: 'steps', type: 'map', empty: {} },
  { key: 'settings', kind: 'settings', type: 'single', empty: null },
  { key: 'love', kind: 'love', type: 'single', empty: null },
  // Записи после свиданий — «Знакомство» (meet/, 14.11.2026)
  { key: 'meetnotes', kind: 'meetnote', type: 'list', empty: [] },
];
const BY_KEY = Object.fromEntries(COLLECTIONS.map((c) => [c.key, c]));
const BY_KIND = Object.fromEntries(COLLECTIONS.map((c) => [c.kind, c]));

let requestFn = apiRequest;
let applying = false;
let timer = null;
let running = null;
let started = false;
// Состояние идущего обмена: правки, сделанные во время него, ложатся сюда же и уйдут следующей пачкой
let active = null;

/* ---------- Состояние ---------- */

function state() {
  const s = read(STATE, null);
  return s && typeof s === 'object'
    ? { userId: s.userId || null, cursor: Number(s.cursor) || 0, shadow: s.shadow || {}, pending: s.pending || {}, savedAt: s.savedAt || null, status: s.status || '' }
    : { userId: null, cursor: 0, shadow: {}, pending: {}, savedAt: null, status: '' };
}

function save(s) {
  write(STATE, s);
}

/** Для настроек: когда последний раз сохранилось на сервере, сколько ждёт отправки и что с сетью. */
export function status() {
  const s = state();
  return { savedAt: s.savedAt, pending: Object.keys(s.pending).length, status: s.status };
}

/* ---------- Раскладка значений на записи и обратно ---------- */

// Короткий отпечаток: тень хранит его, а не копию данных
function hash(value) {
  const str = JSON.stringify(value);
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return `${str.length}:${h.toString(36)}`;
}

const isMeaningful = (v) => v && typeof v === 'object' && Object.keys(v).length > 0;

function toRecords(c, value) {
  const out = new Map();
  if (c.type === 'list') {
    for (const item of Array.isArray(value) ? value : []) if (item && typeof item.id === 'string' && ID_RX.test(item.id)) out.set(item.id, item);
  } else if (c.type === 'map') {
    for (const [k, v] of Object.entries(value && typeof value === 'object' ? value : {})) if (ID_RX.test(k)) out.set(k, v);
  } else if (isMeaningful(value)) {
    out.set('main', value);
  }
  return out;
}

function fromRecords(c, records, prev) {
  if (c.type === 'list') {
    // Порядок прежний; новые — в конец по времени создания
    const old = Array.isArray(prev) ? prev.filter((x) => records.has(x?.id)).map((x) => records.get(x.id)) : [];
    const known = new Set(old.map((x) => x.id));
    const added = [...records.values()].filter((x) => !known.has(x.id))
      .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    return [...old, ...added];
  }
  if (c.type === 'map') return Object.fromEntries(records);
  return records.get('main') ?? prev ?? null;
}

function writeLocal(c, value) {
  applying = true;
  try {
    write(c.key, value);
  } finally {
    applying = false;
  }
}

/* ---------- Что поменялось на устройстве ---------- */

function diff(s, c, when) {
  const now = toRecords(c, read(c.key, c.empty));
  const shadow = s.shadow[c.kind] || {};
  const next = {};
  for (const [id, data] of now) {
    const h = hash(data);
    next[id] = h;
    if (shadow[id] !== h) s.pending[`${c.kind}/${id}`] = { kind: c.kind, id, data, updatedAt: when, deletedAt: null };
  }
  for (const id of Object.keys(shadow)) {
    if (!now.has(id)) s.pending[`${c.kind}/${id}`] = { kind: c.kind, id, data: null, updatedAt: when, deletedAt: when };
  }
  s.shadow[c.kind] = next;
}

function onLocalChange(key) {
  // Сменила или убрала фото профиля — обменяться сразу (само фото ходит в sync/photos.js)
  if (key === 'avatar' && !applying) {
    schedule();
    return;
  }
  const c = BY_KEY[key];
  if (!c || applying) return;
  const s = active || state();
  if (!s.userId || s.userId !== owner()) return;
  diff(s, c, new Date().toISOString());
  if (!active) save(s);
  schedule();
}

/* ---------- Пришло с сервера ---------- */

function apply(s, changes) {
  const grouped = new Map();
  for (const ch of changes) {
    const c = BY_KIND[ch.kind];
    if (!c) continue;
    // Здесь уже есть более новая правка, ещё не отправленная, — она победит на сервере, не откатываем
    const mine = s.pending[`${ch.kind}/${ch.id}`];
    if (mine && mine.updatedAt > ch.updatedAt) continue;
    if (!grouped.has(c)) grouped.set(c, []);
    grouped.get(c).push(ch);
  }
  for (const [c, list] of grouped) {
    const prev = read(c.key, c.empty);
    const records = toRecords(c, prev);
    const shadow = s.shadow[c.kind] || (s.shadow[c.kind] = {});
    for (const ch of list) {
      if (ch.deletedAt || ch.data === null) {
        records.delete(ch.id);
        delete shadow[ch.id];
      } else {
        records.set(ch.id, ch.data);
        shadow[ch.id] = hash(ch.data);
      }
    }
    writeLocal(c, fromRecords(c, records, prev));
  }
}

/* ---------- Обмен с сервером ---------- */

async function exchange(s, changes) {
  const res = await requestFn(`${side.api()}/sync`, { body: { cursor: s.cursor, changes } });
  return res || { cursor: s.cursor, changes: [], more: false };
}

// Забрать всё, что новее курсора, страницами
async function pullAll(s) {
  const got = [];
  for (let guard = 0; guard < 200; guard++) {
    const r = await exchange(s, []);
    got.push(...r.changes);
    s.cursor = r.cursor;
    if (!r.more) break;
  }
  return got;
}

/* Первый раз на этом устройстве под этим кабинетом: свести то, что уже здесь, с тем, что на сервере. */
async function adopt(s, userId) {
  s.userId = userId;
  s.cursor = 0;
  s.shadow = {};
  s.pending = {};
  const server = await pullAll(s);
  const byKind = new Map();
  for (const ch of server) {
    if (!byKind.has(ch.kind)) byKind.set(ch.kind, new Map());
    byKind.get(ch.kind).set(ch.id, ch);
  }
  for (const c of COLLECTIONS) {
    const local = toRecords(c, read(c.key, c.empty));
    const remote = byKind.get(c.kind) || new Map();
    const merged = new Map();
    for (const [id, ch] of remote) if (!ch.deletedAt && ch.data !== null) merged.set(id, ch.data);
    if (c.type === 'single') {
      // Одиночное: есть на сервере — берём оттуда; нет — отправляем своё
      if (!merged.has('main') && local.has('main')) {
        merged.set('main', local.get('main'));
        s.pending[`${c.kind}/main`] = { kind: c.kind, id: 'main', data: local.get('main'), updatedAt: LEGACY, deletedAt: null };
      }
    } else {
      // Списки: чего на сервере нет (и не удалено там) — добавляем и отправляем
      for (const [id, data] of local) {
        if (merged.has(id) || remote.get(id)?.deletedAt) continue;
        merged.set(id, data);
        s.pending[`${c.kind}/${id}`] = { kind: c.kind, id, data, updatedAt: data?.updatedAt || data?.createdAt || LEGACY, deletedAt: null };
      }
    }
    s.shadow[c.kind] = Object.fromEntries([...merged].map(([id, data]) => [id, hash(data)]));
    writeLocal(c, fromRecords(c, merged, read(c.key, c.empty)));
  }
}

// Другая женщина вошла на этом устройстве: данные прежней — у неё на сервере, здесь их убираем
function wipeForOther() {
  for (const c of COLLECTIONS) writeLocal(c, c.empty);
}

/* Чьи данные на этом телефоне: кабинет и часть GSL (W+M)⁺ (side/side.js → ownerKey). У женской части — просто
   кабинет, как было всегда; у мужской — «кабинет:man». Администратор переключил часть — для телефона это как
   другой человек: данные прежней части уже на сервере, здесь их убираем и забираем свои. */
function owner() {
  const id = current()?.userId;
  return id ? side.ownerKey(id) : null;
}

async function run() {
  const session = current();
  // Пол ещё не выбран — какой части данные, неизвестно: ждём (screens/gender/)
  if (!session?.userId || !access.isOpen() || side.needsChoice(session)) return;
  const me = owner();
  const s = state();
  active = s;
  try {
    s.status = 'syncing';
    if (s.userId && s.userId !== me) {
      wipeForOther();
      // И фото прежней: снимки, её фото профиля и что согласовано по фото
      await media.clear();
      write('avatar', null);
      write('photo-sync', {});
      s.userId = null;
    }
    if (!s.userId) await adopt(s, me);
    // Сверить всё с тенью: правка, о которой не пришёл сигнал, тоже уйдёт
    const when = new Date().toISOString();
    for (const c of COLLECTIONS) diff(s, c, when);
    // Отправить очередь (пачками по 500) и забрать новое
    for (let guard = 0; guard < 200; guard++) {
      const batch = Object.values(s.pending).slice(0, 500);
      const r = await exchange(s, batch);
      for (const sent of batch) {
        const key = `${sent.kind}/${sent.id}`;
        if (s.pending[key]?.updatedAt === sent.updatedAt) delete s.pending[key];
      }
      apply(s, r.changes);
      s.cursor = r.cursor;
      if (!r.more && !Object.keys(s.pending).length) break;
    }
    // Фото — после записей: теперь видно, какие снимки к ним нужны (sync/photos.js)
    await syncPhotos().catch(() => {});
    s.savedAt = new Date().toISOString();
    s.status = 'ok';
  } catch (err) {
    if (isClosed(err)) access.close();
    s.status = err?.code === 'network' ? 'offline' : 'error';
  } finally {
    active = null;
  }
  save(s);
}

/** Синхронизировать сейчас (не чаще одного обмена одновременно). */
export function now() {
  if (!running) running = run().finally(() => { running = null; });
  return running;
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(now, DEBOUNCE_MS);
}

/** Запуск один раз из main.js: следит за изменениями и сверяется при открытии, возвращении, появлении сети и раз в 5 минут. */
export function start() {
  if (started) return;
  started = true;
  subscribe(onLocalChange);
  addEventListener('online', () => now());
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && now());
  setInterval(() => now(), PERIOD_MS);
  now();
}

/** Для проверок: подменить запрос к серверу. */
export function _useRequest(fn) {
  requestFn = fn;
  // Фото ходят тем же подставным сервером; сами снимки в проверках не качаются
  usePhotos({ request: fn, raw: async () => null });
}
