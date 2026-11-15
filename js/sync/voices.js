import { API_BASE } from '../config.js';
import { current, request as apiRequest } from '../account/session.js';
import { read, write } from '../core/store.js';
import * as goals from '../goals/goals.js';
import { getGoalAudio, restoreGoalAudio } from '../goals/audio.js';

/* ГОЛОС К ЦЕЛЯМ МЕЖДУ ТЕЛЕФОНАМИ (владелец 15.11.2026: «голос тоже должен переходить между телефонами и сохраняться,
   чтобы можно было восстановить»). Копия — на сервере «Кванта» (planner/server/src/audio-backup/, адрес
   /api/gsl/audio); телефон остаётся главным. Зовётся из sync.js после обмена записями: к этому моменту цели уже
   общие, и видно, к каким нужен голос.

   - Запись на телефоне есть, а на сервере нет (или там старее, или пришла не вся) — отправить кусками по 700 КБ:
     nginx хоста режет запросы больше 1 МБ.
   - На сервере целая запись, а здесь нет (новый телефон) или здесь старее — забрать и положить как была.
   - На сервере запись к цели, которой больше нет, — убрать там.
   - Человек убрал запись (✕) — номер цели ждёт в очереди удаления (ключ voice-sync), пока сервер не подтвердит.
   Номер версии записи (sid) — время её создания: новее та, что записана позже. */

const STATE = 'voice-sync'; // { deleted: [id цели] }
const PART = 700 * 1024;
const PREFIX = '/api/gsl/audio';

let requestFn = apiRequest;

const sidOf = (createdAt) => 'a' + Number(createdAt || 0).toString(36);
const timeOf = (sid) => parseInt(String(sid || '').slice(1), 36) || 0;

function state() {
  const s = read(STATE, {});
  return { deleted: Array.isArray(s?.deleted) ? s.deleted : [] };
}

/** Человек убрал голос у цели — убрать и на сервере (при ближайшей сверке). */
export function markDeleted(goalId) {
  const s = state();
  if (!s.deleted.includes(goalId)) write(STATE, { deleted: [...s.deleted, goalId] });
}

async function remove(key) {
  const token = current()?.token;
  const res = await fetch(`${API_BASE}${PREFIX}/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  if (!res.ok && res.status !== 404) throw new Error(`voice delete ${res.status}`);
}

async function toBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

function fromBase64(data) {
  const s = atob(data);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function upload(key, rec) {
  const total = Math.max(1, Math.ceil(rec.blob.size / PART));
  for (let n = 0; n < total; n++) {
    const data = await toBase64(rec.blob.slice(n * PART, (n + 1) * PART));
    await requestFn(`${PREFIX}/${encodeURIComponent(key)}/${n}`, {
      body: {
        sid: sidOf(rec.createdAt),
        total,
        fileName: String(rec.fileName || 'audio').slice(0, 200),
        mime: /^audio\//.test(rec.mimeType || '') ? rec.mimeType.slice(0, 100) : 'audio/webm',
        durationMs: Math.max(0, Math.round(rec.durationMs || 0)),
        data,
      },
    });
  }
}

async function download(item) {
  const parts = [];
  for (let n = 0; n < item.total; n++) {
    const p = await requestFn(`${PREFIX}/${encodeURIComponent(item.key)}/${n}`);
    if (p?.sid !== item.sid) return; // пока качали, запись сменилась — заберём при следующей сверке
    parts.push(fromBase64(p.data));
  }
  const blob = new Blob(parts, { type: item.mime || 'audio/webm' });
  await restoreGoalAudio(item.key, blob, { fileName: item.fileName, durationMs: item.durationMs, createdAt: timeOf(item.sid) });
}

/** Свести голос целей с сервером. Ошибка одной записи не мешает остальным. */
export async function syncVoices() {
  if (typeof indexedDB === 'undefined') return; // проверки в node — без базы звука
  const s = state();
  // Сначала — удаления, о которых просил человек
  const stillDeleted = [];
  for (const key of s.deleted) {
    try {
      if (!(await getGoalAudio(key))) await remove(key);
    } catch {
      stillDeleted.push(key);
    }
  }
  if (stillDeleted.length !== s.deleted.length) write(STATE, { deleted: stillDeleted });

  const list = await requestFn(PREFIX);
  if (!Array.isArray(list)) return;
  const onServer = new Map(list.map((x) => [x.key, x]));
  const ids = new Set(goals.all().map((g) => g.id));

  for (const id of ids) {
    try {
      const rec = await getGoalAudio(id);
      const srv = onServer.get(id);
      if (rec) {
        const mine = sidOf(rec.createdAt);
        const newer = !srv || timeOf(mine) > timeOf(srv.sid);
        if (newer || (srv.sid === mine && !srv.complete)) await upload(id, rec);
        else if (srv.sid !== mine && srv.complete) await download(srv);
      } else if (srv?.complete && !stillDeleted.includes(id)) {
        await download(srv);
      }
    } catch {
      // эта запись — в следующий раз
    }
  }
  // Голос к целям, которых больше нет, — убрать с сервера
  for (const key of onServer.keys()) {
    if (!ids.has(key)) await remove(key).catch(() => {});
  }
}

/** Для проверок: подменить запрос к серверу. */
export function _use(fn) {
  requestFn = fn;
}
