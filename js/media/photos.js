/* ФОТО НА ТЕЛЕФОНЕ: снимки к записям и фото профиля.

   Почему не в store.js (localStorage): там на всё 5 МБ и только строки, а один снимок с камеры — несколько
   мегабайт. Поэтому фото — в своей базе IndexedDB «gsl-woman-media» (своя приставка: адрес общий с
   «Квантом» и спортом), а запись хранит только номера снимков.

   Снимок перед сохранением ужимается до 1600 точек по длинной стороне (JPEG ~0,82): на экране телефона
   разницы не видно, а полгода записей не съедают память. Фото, на которые больше никто не ссылается
   (убрали из записи, удалили запись, закрыли форму без «Сохранить»), стирает prune(). */

const DB_NAME = 'gsl-woman-media';
const STORE = 'photos';
const MAX_SIDE = 1600;
const QUALITY = 0.82;

/** Сколько снимков можно прикрепить к одной записи. */
export const MAX_PER_ENTRY = 6;
/** Номер фото профиля — один на телефон. */
export const AVATAR_ID = 'avatar';

let dbPromise = null;
const urls = new Map();   // номер → адрес снимка для <img>, чтобы перерисовка не мигала

function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

async function run(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* Картинка из файла с учётом поворота камеры. createImageBitmap есть почти везде; где нет — через <img>. */
async function decode(file) {
  if (globalThis.createImageBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // старый браузер не знает imageOrientation — ниже обычный путь
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Ужать снимок: длинная сторона не больше max, JPEG. */
export async function shrink(file, max = MAX_SIDE) {
  const img = await decode(file);
  const w0 = img.width || img.naturalWidth;
  const h0 = img.height || img.naturalHeight;
  const k = Math.min(1, max / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * k));
  const h = Math.max(1, Math.round(h0 * k));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  img.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!blob) throw new Error('photo: не удалось сжать');
  return { blob, w, h };
}

/** Сохранить снимок из файла; вернёт его номер. id — свой номер (фото профиля), иначе новый. */
export async function save(file, { id = newId(), max = MAX_SIDE } = {}) {
  const { blob, w, h } = await shrink(file, max);
  await run('readwrite', (s) => s.put({ id, blob, w, h, createdAt: new Date().toISOString() }));
  forgetUrl(id);
  return id;
}

/** Адрес снимка для <img>; нет такого — null. */
export async function url(id) {
  if (urls.has(id)) return urls.get(id);
  const row = await run('readonly', (s) => s.get(id)).catch(() => null);
  if (!row?.blob) return null;
  const u = URL.createObjectURL(row.blob);
  urls.set(id, u);
  return u;
}

/** Адрес, если снимок уже открывали, — чтобы нарисовать сразу, без ожидания. */
export function cachedUrl(id) {
  return urls.get(id) || null;
}

function forgetUrl(id) {
  const u = urls.get(id);
  if (u) URL.revokeObjectURL(u);
  urls.delete(id);
}

export async function remove(id) {
  forgetUrl(id);
  await run('readwrite', (s) => s.delete(id)).catch(() => {});
}

/** Стереть все снимки, кроме нужных (и фото профиля). */
export async function prune(keepIds) {
  const keep = new Set([...keepIds, AVATAR_ID]);
  const ids = await run('readonly', (s) => s.getAllKeys()).catch(() => []);
  for (const id of ids || []) if (!keep.has(id)) await remove(id);
}

/** Стереть всё (кнопка «Стереть все мои данные»). */
export async function clear() {
  for (const id of [...urls.keys()]) forgetUrl(id);
  await run('readwrite', (s) => s.clear()).catch(() => {});
}
