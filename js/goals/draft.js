import { read, write } from '../core/store.js';

/* ЧЕРНОВИК НОВОЙ ЦЕЛИ — строка «Новая цель» с голосом и фото, как дверь «Кванта» (сборка 68, владелец 15.11.2026:
   «нажимаю плюсик — и нет даже упоминания, что можно добавить; перенеси плеер, фото — всё»).

   У черновика заранее есть номер будущей цели: голос и снимки ложатся под ним ещё до дискеты, а по дискете цель
   получает этот же номер — ничего переносить не надо. Черновик переживает перерисовку и перезапуск (ключ goal-draft;
   main.js его перерисовкой не отвечает — иначе каждая буква перестраивала бы экран). В копию на сервер не идёт. */

const KEY = 'goal-draft';
const newId = () => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clean = (d) => ({
  id: d.id,
  text: typeof d.text === 'string' ? d.text : '',
  photos: Array.isArray(d.photos) ? d.photos.filter((x) => typeof x === 'string' && x.length <= 40) : [],
});

/** Черновик { id, text, photos }; нет — заводится пустой. */
export function draft() {
  const d = read(KEY, null);
  if (d && typeof d.id === 'string' && d.id) return clean(d);
  const fresh = { id: newId(), text: '', photos: [] };
  write(KEY, fresh);
  return fresh;
}

export function setDraft(patch) {
  write(KEY, clean({ ...draft(), ...patch }));
}

/** Цель сохранена — следующий черновик с новым номером. */
export function resetDraft() {
  write(KEY, { id: newId(), text: '', photos: [] });
}

/** Снимки черновика нужны — уборка их не стирает (media/used.js). */
export function draftPhotoIds() {
  const d = read(KEY, null);
  return Array.isArray(d?.photos) ? d.photos.filter((x) => typeof x === 'string') : [];
}
