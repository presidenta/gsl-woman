import { read, write } from '../core/store.js';
import * as side from '../side/side.js';
import { API_BASE } from '../config.js';
import { current, request as apiRequest } from '../account/session.js';
import * as media from '../media/photos.js';
import * as journal from '../journal/journal.js';

/* ФОТО МЕЖДУ УСТРОЙСТВАМИ (владелец 13.11.2026: «фотография не перенеслась на телефон»). Точно как у GoldenFit:
   на сервере (/api/woman/photos, миграция 022) — список без снимков одним запросом, каждый снимок отдельно и
   только тот, которого нет на устройстве. Зовётся из sync.js после обмена записями: к этому моменту записи
   уже общие, и видно, какие фото к ним нужны.

   - Фото к записям: запись ссылается на номер снимка (entry.photos). Нужен, а здесь нет — скачать; здесь есть,
     а на сервере нет — отправить; на сервере есть, а ни одна запись на него больше не ссылается — убрать там.
   - Фото профиля — одно. На сервере у него свой номер (a + время): по нему видно, что на другом устройстве
     поставили новое. Убрала фото здесь — убирается и там (помним номер последнего согласованного).
   Хост пропускает до 1 МБ на запрос — снимок крупнее перед отправкой ужимается сильнее. */

const STATE = 'photo-sync'; // { avatarSid } — номер фото профиля, последний согласованный с сервером
const LIMIT = 950 * 1024;

let requestFn = apiRequest;
let rawFn = rawFetch;

async function rawFetch(path, { method = 'GET', body, type } = {}) {
  const token = current()?.token;
  const res = await fetch(API_BASE + path, {
    method,
    headers: { ...(type ? { 'Content-Type': type } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body,
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = new Error(`photo ${method} ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return method === 'GET' ? res.blob() : null;
}

// Под предел хоста: крупный снимок ужимаем сильнее, пока не влезет
async function fitted(row) {
  let { blob, w, h } = row;
  for (const [max, q] of [[1600, 0.75], [1280, 0.7], [1024, 0.65]]) {
    if (blob.size <= LIMIT) break;
    ({ blob, w, h } = await media.shrink(blob, max, q));
  }
  return { blob, w, h };
}

async function upload(id, role, row) {
  const { blob, w, h } = await fitted(row);
  await rawFn(`${side.api()}/photos/${encodeURIComponent(id)}?role=${role}&w=${w}&h=${h}`, { method: 'POST', body: blob, type: 'image/jpeg' });
}

async function download(serverId, localId, p) {
  const blob = await rawFn(`${side.api()}/photos/${encodeURIComponent(serverId)}`);
  await media.put(localId, blob, p.width, p.height);
}

/** Свести фото устройства с сервером. Ошибка одного снимка не мешает остальным. */
export async function syncPhotos() {
  const list = await requestFn(`${side.api()}/photos`);
  if (!Array.isArray(list)) return;
  const onServer = new Map(list.map((p) => [p.id, p]));
  const here = new Set(await media.ids());
  const wanted = new Set(journal.photoIds());

  // Фото к записям
  for (const id of wanted) {
    try {
      if (!here.has(id) && onServer.has(id)) await download(id, id, onServer.get(id));
      else if (here.has(id) && !onServer.has(id)) {
        const row = await media.get(id);
        if (row?.blob) await upload(id, 'entry', row);
      }
    } catch { /* следующий раз */ }
  }
  for (const p of list) {
    if (p.role === 'entry' && !wanted.has(p.id)) {
      await rawFn(`${side.api()}/photos/${encodeURIComponent(p.id)}`, { method: 'DELETE' }).catch(() => {});
    }
  }

  // Фото профиля
  const st = read(STATE, {}) || {};
  const flag = read('avatar', null);
  const server = list.find((p) => p.role === 'avatar') || null;
  try {
    // На сервере фото, которого здесь ещё не было, и оно новее здешнего (поставили на другом устройстве)
    const serverNewer = server && st.avatarSid !== server.id && server.id !== flag?.sid
      && (!flag || new Date(server.createdAt).getTime() > (flag.at || 0));
    if (flag && flag.sid && server && server.id === flag.sid) {
      // Согласовано — ничего не делать
    } else if (serverNewer) {
      // На другом устройстве поставили новое (или здесь фото ещё нет) — скачать
      await download(server.id, media.AVATAR_ID, server);
      write('avatar', { at: new Date(server.createdAt).getTime(), sid: server.id });
      st.avatarSid = server.id;
    } else if (flag && here.has(media.AVATAR_ID)) {
      // Здесь новое — отправить под новым номером
      const row = await media.get(media.AVATAR_ID);
      const sid = `a${(flag.at || Date.now()).toString(36)}`;
      if (row?.blob) {
        await upload(sid, 'avatar', row);
        write('avatar', { ...flag, sid });
        st.avatarSid = sid;
      }
    } else if (!flag && server && st.avatarSid === server.id) {
      // Убрала здесь то, что было согласовано, — убрать и на сервере
      await rawFn(`${side.api()}/photos/${encodeURIComponent(server.id)}`, { method: 'DELETE' });
      st.avatarSid = null;
    }
  } catch { /* следующий раз */ }
  write(STATE, st);
}

/** Для проверок: подменить запросы. */
export function _use({ request, raw }) {
  if (request) requestFn = request;
  if (raw) rawFn = raw;
}
