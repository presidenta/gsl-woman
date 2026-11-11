import { read, write, remove } from '../core/store.js';
import { FALLBACK_LANG } from '../config.js';
import { request } from '../account/session.js';

/* ОТКУДА БЕРЁТСЯ ПРОГРАММА. Сайт открытый, а программа платная, поэтому в коде сайта её нет: она
   лежит на сервере «Кванта» (server/src/woman/program/ в planner) и приходит только вошедшей.

   Пришла один раз — хранится на телефоне (ключ program): дальше приложение работает без интернета, а
   при каждом открытии с сетью сверяет отпечаток version и забирает правку, если она вышла. Сразу три
   языка — чтобы переключать язык и без сети. Выход из аккаунта стирает копию. */

const KEY = 'program';

let cache = read(KEY, null);

/** Программа уже на телефоне. */
export function loaded() {
  return !!cache?.langs;
}

/** { months, weeks } на языке; нет такого — на основном; не загружена — null. */
export function langData(lang) {
  return cache?.langs?.[lang] || cache?.langs?.[FALLBACK_LANG] || null;
}

/** Сверить с сервером. Вернёт true, если текст сменился. Отказ сервера или сети — исключение. */
export async function refresh() {
  const p = await request('/api/woman/program');
  if (!p?.langs) throw new Error('program: пустой ответ');
  if (cache?.version === p.version) return false;
  cache = { version: p.version, langs: p.langs };
  write(KEY, cache);
  return true;
}

/** Стереть копию (выход из аккаунта). */
export function forget() {
  cache = null;
  remove(KEY);
}

/** Для проверок: подставить программу без сервера. */
export function _use(program) {
  cache = program;
}
