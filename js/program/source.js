import { read, write, remove } from '../core/store.js';
import { FALLBACK_LANG } from '../config.js';
import { request } from '../account/session.js';
import * as side from '../side/side.js';

/* ОТКУДА БЕРЁТСЯ ПРОГРАММА. Сайт открытый, а программа платная, поэтому в коде сайта её нет: она
   лежит на сервере «Кванта» (server/src/woman/program/ в planner) и приходит только вошедшей.

   Пришла один раз — хранится на телефоне: дальше приложение работает без интернета, а при каждом открытии с сетью
   сверяет отпечаток version и забирает правку, если она вышла. Сразу три языка — чтобы переключать язык и без сети.
   Выход из аккаунта стирает копии.

   У каждой части GSL (W+M)⁺ своя программа (/api/woman/program или /api/men/program, side/side.js) и своя копия на
   телефоне: женская — ключ program (как было всегда), мужская — program-man. Программа другой части за свою не
   считается. Обе копии хранятся рядом (владелец 22.11.2026: «переключаться мгновенно, без всяких других страничек») —
   раньше копия была одна на обе части, и при смене части приложение показывало экран входа, пока качало другую. */

const KEYS = { woman: 'program', man: 'program-man' };
const sideOf = (c) => c?.side || 'woman'; // копия без отметки — женская: так было до мужской части

const slots = { woman: null, man: null };
load();

/* До 174 копия была одна (ключ program) и помнила, чья она: мужскую переносим на её ключ. */
function load() {
  const old = read(KEYS.woman, null);
  if (old && sideOf(old) === 'man') {
    write(KEYS.man, old);
    remove(KEYS.woman);
  } else {
    slots.woman = old;
  }
  slots.man = read(KEYS.man, null);
}

const mine = () => side.get() || 'woman';

/** Программа части (по умолчанию — открытой) уже на телефоне. */
export function loaded(which = mine()) {
  return !!slots[which]?.langs;
}

/** { months, weeks } на языке; нет такого — на основном; не загружена — null. */
export function langData(lang) {
  if (!loaded()) return null;
  const { langs } = slots[mine()];
  return langs[lang] || langs[FALLBACK_LANG] || null;
}

/** Сверить с сервером программу части (по умолчанию — открытой). Вернёт true, если текст сменился. Отказ сервера
    или сети — исключение. */
export async function refresh(which = mine()) {
  const p = await request(`${side.apiOf(which)}/program`);
  if (!p?.langs) throw new Error('program: пустой ответ');
  if (slots[which]?.version === p.version) return false;
  slots[which] = { version: p.version, langs: p.langs, side: which };
  write(KEYS[which], slots[which]);
  return true;
}

/** Стереть копии обеих частей (выход из аккаунта). */
export function forget() {
  slots.woman = null;
  slots.man = null;
  remove(KEYS.woman);
  remove(KEYS.man);
}

/** Для проверок: подставить программу без сервера — в копию той части, что отмечена в ней (без отметки — женская);
    null — стереть обе. */
export function _use(program) {
  if (!program) {
    slots.woman = null;
    slots.man = null;
    return;
  }
  slots[sideOf(program)] = program;
}

/** Для проверок: перечитать копии из хранилища (как при запуске приложения). */
export function _reload() {
  slots.woman = null;
  slots.man = null;
  load();
}
