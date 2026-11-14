import { API_BASE } from '../config.js';
import { shrink } from '../media/photos.js';

/* ГОЛОСОВЫЕ И ФОТО В ЧАТАХ «ПАРЫ» И «СЕМЬИ» (владелец 14.11.2026: «везде, где можно написать, — микрофон и фото;
   видит вся семья»). Файл уходит на сервер «Кванта» (planner/server/src/circles/media.js) и принадлежит семье:
   его слышат и видят все её участники. Сообщение чата ссылается на файл: msg { audio: { id, ms } } или
   { photo: { id, w, h } }. Кто отправляет — взрослый (вход «Кванта», /api/gsl/circles/:id/media) или ребёнок со
   своего телефона (/api/kids/media) — решает mediaFor: у каждого свой адрес и свой ключ.

   Предел — 1 МБ на файл (nginx хоста): голосовое пишется до 2 минут при 24 кбит/с (около 360 КБ), фото
   ужимается до 1600 точек по длинной стороне и до 950 КБ. */

export const MAX_RECORD_MS = 2 * 60 * 1000;
export const MAX_BYTES = 950 * 1024;
const BITRATE = 24000;

// Что умеет записывать телефон: Android — webm/opus, iPhone — mp4/aac
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/aac'];

export const newMediaId = () => `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Подходящий тип записи или '' (тогда телефон выберет сам). */
export function pickMime(isSupported = (m) => globalThis.MediaRecorder?.isTypeSupported?.(m)) {
  return MIME_CANDIDATES.find((m) => isSupported(m)) || '';
}

export const canRecord = () => !!(globalThis.MediaRecorder && navigator.mediaDevices?.getUserMedia);

/**
 * Начать запись с микрофона. Вернёт { stop(): Promise<{ blob, ms, mime }>, cancel(), startedAt }.
 * Отказ в микрофоне — исключение с code 'mic_denied'.
 */
export async function startRecording() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    const err = new Error('mic_denied');
    err.code = 'mic_denied';
    err.cause = e;
    throw err;
  }
  const mime = pickMime();
  const recorder = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: BITRATE });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
  const startedAt = Date.now();
  recorder.start(1000);
  const release = () => stream.getTracks().forEach((tr) => tr.stop());
  return {
    startedAt,
    stop: () => new Promise((resolve) => {
      recorder.onstop = () => {
        release();
        const type = (recorder.mimeType || mime || 'audio/webm').split(';')[0];
        resolve({ blob: new Blob(chunks, { type }), ms: Date.now() - startedAt, mime: type });
      };
      recorder.stop();
    }),
    cancel: () => {
      recorder.onstop = release;
      try { recorder.stop(); } catch { release(); }
    },
  };
}

/** Ужать фото под предел: 1600 точек, качество по шагам вниз, пока файл больше 950 КБ. */
export async function preparePhoto(file) {
  let last = null;
  for (const [max, q] of [[1600, 0.82], [1600, 0.7], [1280, 0.7], [1024, 0.65], [800, 0.6]]) {
    last = await shrink(file, max, q);
    if (last.blob.size <= MAX_BYTES) return last;
  }
  return last;
}

// Скачанные файлы — в памяти на время работы приложения: второй раз не качаем
const cache = new Map();

/** Адрес и ключ для файлов: взрослый — по семье, ребёнок — по своей сессии. */
function client({ path, token }) {
  const headers = () => {
    const tk = token();
    return tk ? { Authorization: `Bearer ${tk}` } : {};
  };
  return {
    async upload(id, blob, query) {
      const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null)).toString();
      const res = await fetch(`${API_BASE}${path(id)}?${qs}`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': blob.type || 'application/octet-stream' },
        body: blob,
      });
      if (!res.ok) {
        const err = new Error('upload_failed');
        err.status = res.status;
        throw err;
      }
      cache.set(id, URL.createObjectURL(blob));
      return id;
    },
    /** Адрес файла для <audio> / <img>: из памяти или скачать. */
    async url(id) {
      if (cache.has(id)) return cache.get(id);
      const res = await fetch(`${API_BASE}${path(id)}`, { headers: headers() });
      if (!res.ok) throw new Error(`media ${res.status}`);
      const u = URL.createObjectURL(await res.blob());
      cache.set(id, u);
      return u;
    },
    cached: (id) => cache.get(id) || null,
  };
}

/** Файлы семьи для взрослого: свой вход «Кванта». */
export function circleMedia(circleId, token) {
  return client({ path: (id) => `/api/gsl/circles/${circleId}/media/${id}`, token });
}

/** Файлы семьи для ребёнка: его сессия. */
export function kidMedia(token) {
  return client({ path: (id) => `/api/kids/media/${id}`, token });
}
