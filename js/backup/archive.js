import { read, write } from '../core/store.js';
import { COLLECTIONS } from '../sync/sync.js';
import * as photos from '../media/photos.js';
import { usedPhotoIds } from '../media/used.js';
import * as goals from '../goals/goals.js';
import { getGoalAudio, getGoalAudioMeta, restoreGoalAudio } from '../goals/audio.js';

/* ФАЙЛ КОПИИ: всё своё одним файлом — то, что синхронизируется (sync.js COLLECTIONS: записи, цели, отметки по дням,
   настройки, письма…), снимки, которые нужны (media/used.js, и фото профиля), и голос к целям. Файл — JSON, снимки и
   голос внутри строками base64: открывается где угодно, переживает пересылку почтой.

   Возврат из файла ДОПОЛНЯЕТ телефон и ничего не стирает: из списков — записи с номерами, которых на телефоне нет; из
   отметок по дням — дни, которых нет; одиночное (настройки, языки любви) — если на телефоне пусто; снимки и голос —
   если их на телефоне нет. Дальше обмен с сервером сам отправит вернувшееся в копию. */

export const FORMAT = 'gsl-backup';
const VERSION = 1;

async function toBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

function fromBase64(data, type) {
  const s = atob(data);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Собрать файл копии → { blob, name, counts }. */
export async function buildArchive({ side = null, now = new Date() } = {}) {
  const data = {};
  for (const c of COLLECTIONS) {
    const v = read(c.key, null);
    if (v !== null && v !== undefined) data[c.key] = v;
  }
  const shots = [];
  for (const id of new Set([...usedPhotoIds(), photos.AVATAR_ID])) {
    const p = await photos.get(id);
    if (p?.blob) shots.push({ id, w: p.w || 0, h: p.h || 0, type: p.blob.type || 'image/jpeg', data: await toBase64(p.blob) });
  }
  const voices = [];
  for (const g of goals.all()) {
    const a = await getGoalAudio(g.id);
    if (a?.blob) {
      voices.push({
        goalId: g.id, fileName: a.fileName, durationMs: a.durationMs || 0, createdAt: a.createdAt || 0,
        type: a.mimeType || a.blob.type || 'audio/webm', data: await toBase64(a.blob),
      });
    }
  }
  const json = JSON.stringify({ format: FORMAT, version: VERSION, side, createdAt: now.toISOString(), data, photos: shots, voices });
  const blob = new Blob([json], { type: 'application/json' });
  return { blob, name: `GSL-${now.toISOString().slice(0, 10)}.json`, counts: { photos: shots.length, voices: voices.length } };
}

/** Разобрать файл; чужой — ошибка с code 'format'. */
export function parseArchive(text) {
  let a = null;
  try {
    a = JSON.parse(text);
  } catch {
    // ниже — общий отказ
  }
  if (!a || a.format !== FORMAT || !a.data || typeof a.data !== 'object') {
    throw Object.assign(new Error('gsl-backup: другой файл'), { code: 'format' });
  }
  return a;
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** Дополнить телефон из файла; вернёт, сколько вернулось. */
export async function restoreArchive(archive) {
  let added = 0;
  for (const c of COLLECTIONS) {
    const v = archive.data[c.key];
    if (v === null || v === undefined) continue;
    const cur = read(c.key, c.empty);
    if (c.type === 'list' && Array.isArray(v)) {
      const list = Array.isArray(cur) ? cur : [];
      const have = new Set(list.map((x) => x?.id));
      const extra = v.filter((x) => x && typeof x.id === 'string' && !have.has(x.id));
      if (extra.length) {
        write(c.key, [...list, ...extra]);
        added += extra.length;
      }
    } else if (c.type === 'map' && isObj(v)) {
      const base = isObj(cur) ? cur : {};
      const extra = Object.keys(v).filter((k) => !(k in base));
      if (extra.length) {
        write(c.key, { ...base, ...Object.fromEntries(extra.map((k) => [k, v[k]])) });
        added += extra.length;
      }
    } else if (c.type === 'single' && (cur === null || cur === undefined) && isObj(v)) {
      write(c.key, v);
      added += 1;
    }
  }
  for (const p of Array.isArray(archive.photos) ? archive.photos : []) {
    if (typeof p?.id !== 'string' || typeof p.data !== 'string' || await photos.get(p.id)) continue;
    await photos.put(p.id, fromBase64(p.data, p.type || 'image/jpeg'), p.w || 0, p.h || 0);
    added += 1;
  }
  const goalIds = new Set(goals.all().map((g) => g.id));
  for (const a of Array.isArray(archive.voices) ? archive.voices : []) {
    if (!goalIds.has(a?.goalId) || typeof a.data !== 'string' || await getGoalAudioMeta(a.goalId)) continue;
    await restoreGoalAudio(a.goalId, fromBase64(a.data, a.type || 'audio/webm'), a);
    added += 1;
  }
  return added;
}
