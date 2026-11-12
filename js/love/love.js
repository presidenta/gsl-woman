import { read, write } from '../core/store.js';
import { langData } from '../program/source.js';

/* ПЯТЬ ЯЗЫКОВ ЛЮБВИ (Гэри Чепмен) — данные и выбор. Тексты (языки, дела, я-сообщения, тест) — на сервере
   вместе с программой: langs.<язык>.love. Здесь только то, что выбрала сама женщина: язык её мужчины, свой
   и ребёнка (ключ love в хранилище телефона), и подсчёт теста.

   Решение владельца 12.11.2026: сначала тест, потом выбор; каждый день — одно дело на языке мужчины
   (карточка «Сегодня» и утреннее напоминание); в дни 4–6 — как сказать о своём языке и поблагодарить
   через я-сообщение. */

export const KINDS = ['words', 'time', 'gifts', 'service', 'touch'];
export const WHO = ['him', 'me', 'child'];

const KEY = 'love';

/** Выбранные языки: { him, me, child } — ключ из KINDS или null. */
export function choices() {
  const saved = read(KEY, {}) || {};
  return Object.fromEntries(WHO.map((w) => [w, KINDS.includes(saved[w]) ? saved[w] : null]));
}

export function choose(who, kind) {
  if (!WHO.includes(who)) return;
  write(KEY, { ...choices(), [who]: KINDS.includes(kind) ? kind : null });
}

/** Тексты раздела на языке интерфейса; программа ещё не пришла — null. */
export function content(lang) {
  return langData(lang)?.love || null;
}

/** Итог теста: языки по числу голосов, при равенстве — в порядке KINDS. */
export function score(picks) {
  const count = Object.fromEntries(KINDS.map((k) => [k, 0]));
  for (const k of picks) if (k in count) count[k]++;
  return KINDS.slice()
    .sort((a, b) => count[b] - count[a] || KINDS.indexOf(a) - KINDS.indexOf(b))
    .map((kind) => ({ kind, count: count[kind] }));
}

/** Один пункт из списка на этот день: весь день тот же, назавтра — другой. */
export function pickFor(list, day, salt = 0) {
  if (!list?.length) return '';
  const n = list.length;
  return list[(((day + salt) % n) + n) % n];
}

/** Дело дня на языке выбранного человека: { name, text } или null. */
export function ideaFor(who, day, lang) {
  const c = content(lang);
  const kind = choices()[who];
  if (!c || !kind) return null;
  const k = c.kinds[kind];
  return { kind, name: k.name, text: pickFor(who === 'child' ? k.child : k.him, day) };
}

/** Свой язык: как сказать о нём и чем поблагодарить сегодня — или null. */
export function myLanguage(day, lang) {
  const c = content(lang);
  const kind = choices().me;
  if (!c || !kind) return null;
  const k = c.kinds[kind];
  return { kind, name: k.name, tell: k.tell, thanks: pickFor(k.thanks, day) };
}
