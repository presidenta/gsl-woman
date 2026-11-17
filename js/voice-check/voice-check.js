import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { isoDate } from '../core/dates.js';
import { icons } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import { canRecord, startRecording } from '../circles/media.js';

/* МИКРОФОН В ЗАДАНИИ НА ГОЛОС (владелец 17.11.2026: «чтобы женщина не искала диктофоны — прямо в приложении нажала
   микрофон, записала, как говорит, а потом включила и прослушала»).

   У заданий с полем voice (программа на сервере: алфавит у зеркала, настройка на день) в карточке — «Записать голос».
   - Длина — сколько она запишет (владелец: «2 минуты — мало, насколько она запишет»).
   - Запись хранится на этом телефоне до конца дня, потом удаляется сама — об этом написано под записью.
     Хранилище — IndexedDB приложения (gsl-voice-check), ключ — день задания и дата записи; при открытии приложения
     всё, что записано не сегодня, стирается. Никуда не уходит.
   - «Сохранить себе» — поделиться файлом (Telegram, «Файлы», заметки) или скачать на телефон. Записала ещё раз —
     прежняя заменяется. */

const DB_NAME = 'gsl-voice-check';
const STORE = 'takes';
let dbPromise = null;

function db() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'day' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const r = fn(d.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}

const getTake = (day) => tx('readonly', (s) => s.get(day)).catch(() => null);
const putTake = (take) => tx('readwrite', (s) => s.put(take)).catch(() => null);

/** Стереть всё, записанное не сегодня (зовётся при открытии приложения и при каждой карточке). */
export async function sweep() {
  const today = isoDate();
  try {
    const all = await tx('readonly', (s) => s.getAll());
    await Promise.all((all || []).filter((x) => x.date !== today).map((x) => tx('readwrite', (s) => s.delete(x.day))));
  } catch { /* хранилище недоступно — записей и не было */ }
}

let live = null; // { day, handle }
const urls = new Map();
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const extOf = (type = '') => (type.includes('mp4') || type.includes('aac') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm');

/** Поделиться файлом (Telegram и т. п.) или скачать, если делиться телефон не умеет. */
async function saveOut(take) {
  const name = `GSL-${take.date}.${extOf(take.blob.type)}`;
  const file = new File([take.blob], name, { type: take.blob.type || 'audio/webm' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e?.name === 'AbortError') return; }
  }
  const a = h('a', { href: URL.createObjectURL(file), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

export function voiceCheck(day) {
  if (!canRecord()) return null;
  const box = h('div', { class: 'voice-check' });
  let take = null;

  const paint = () => {
    const recording = live?.day === day;
    if (take && !urls.has(day)) urls.set(day, URL.createObjectURL(take.blob));
    // Пустое пропускаем: replaceChildren печатает null словом
    box.replaceChildren(...[
      h('p', { class: 'caps voice-check__title' }, t('voiceCheck.title')),
      recording
        ? h('button', { type: 'button', class: 'btn btn--gold btn--block voice-check__btn is-rec', onclick: stop }, h('span', { class: 'voice-check__dot' }), t('voiceCheck.stop'))
        : h('button', { type: 'button', class: 'btn btn--ghost btn--block voice-check__btn', onclick: start }, svg(icons.mic), t(take ? 'voiceCheck.again' : 'voiceCheck.record')),
      take && !recording ? h('audio', { class: 'voice-check__audio', controls: true, src: urls.get(day) }) : null,
      take && !recording ? h('button', { type: 'button', class: 'btn btn--ghost btn--block voice-check__btn', onclick: () => saveOut(take) }, svg(icons.send), t('voiceCheck.save')) : null,
      take && !recording ? h('p', { class: 'faint voice-check__hint' }, t('voiceCheck.hint', { time: mmss(take.ms) })) : null,
    ].filter(Boolean));
  };

  async function start() {
    if (live) return;
    try {
      live = { day, handle: await startRecording() };
      paint();
    } catch {
      live = null;
      toast({ title: t('voiceCheck.denied') });
    }
  }

  async function stop() {
    if (!live) return;
    const { handle } = live;
    live = null;
    const { blob, ms } = await handle.stop();
    if (blob?.size) {
      take = { day, date: isoDate(), blob, ms };
      if (urls.has(day)) { URL.revokeObjectURL(urls.get(day)); urls.delete(day); }
      await putTake(take);
    }
    if (box.isConnected) paint();
  }

  paint();
  // Сегодняшняя запись — из хранилища; вчерашние стираются
  sweep().then(() => getTake(day)).then((saved) => {
    if (saved?.date === isoDate() && saved.blob) { take = saved; if (box.isConnected && live?.day !== day) paint(); }
  });
  return box;
}
