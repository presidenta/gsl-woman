import { read, write, remove } from '../core/store.js';
import { FALLBACK_LANG } from '../config.js';
import { request } from '../account/session.js';
import * as side from '../side/side.js';

/* ОТКУДА БЕРЁТСЯ ПРОГРАММА. Сайт открытый, а программа платная, поэтому в коде сайта её нет: она
   лежит на сервере «Кванта» (server/src/woman/program/ в planner) и приходит только вошедшей.

   Пришла один раз — хранится на телефоне (ключ program): дальше приложение работает без интернета, а
   при каждом открытии с сетью сверяет отпечаток version и забирает правку, если она вышла. Сразу три
   языка — чтобы переключать язык и без сети. Выход из аккаунта стирает копию.

   У каждой части GSL (W+M)⁺ своя программа (/api/woman/program или /api/men/program, side/side.js): копия помнит,
   чья она (side), и программа другой части за свою не считается — придёт заново. Копия без отметки — женская:
   так было до появления мужской части. */

const KEY = 'program';

let cache = read(KEY, null);

/** Программа уже на телефоне. */
const sideOf = (c) => c?.side || 'woman';

export function loaded() {
  return !!cache?.langs && sideOf(cache) === (side.get() || 'woman');
}

/** { months, weeks } на языке; нет такого — на основном; не загружена — null. */
export function langData(lang) {
  if (!loaded()) return null;
  return cache.langs[lang] || cache.langs[FALLBACK_LANG] || null;
}

/** Сверить с сервером. Вернёт true, если текст сменился. Отказ сервера или сети — исключение. */
export async function refresh() {
  const mine = side.get() || 'woman';
  const p = await request(`${side.api()}/program`);
  if (!p?.langs) throw new Error('program: пустой ответ');
  if (cache?.version === p.version && sideOf(cache) === mine) return false;
  cache = { version: p.version, langs: p.langs, side: mine };
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
