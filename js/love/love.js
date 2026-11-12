import { read, write } from '../core/store.js';
import { langData } from '../program/source.js';

/* ПЯТЬ ЯЗЫКОВ ЛЮБВИ (Гэри Чепмен) — данные и выбор. Тексты (языки, дела, я-сообщения, тест) — на сервере
   вместе с программой: langs.<язык>.love. Здесь только то, что выбрала сама женщина (ключ love в хранилище):
   язык её мужчины, свой и каждого ребёнка — с именем (владелец 13.11.2026: «детей может быть 2, 3, 4, каждому
   свой язык любви и свой подход; пишем имя ребёнка и язык; по каждому ребёнку — напоминание»).

   Решение владельца 12.11.2026: сначала тест, потом выбор; каждый день — одно дело на языке мужчины и каждого
   ребёнка (карточка «Сегодня» и утреннее напоминание); в дни 4–6 — как сказать о своём языке и поблагодарить
   через я-сообщение. */

export const KINDS = ['words', 'time', 'gifts', 'service', 'touch'];
export const WHO = ['him', 'me'];
export const MAX_CHILDREN = 8;

const KEY = 'love';

const kindOrNull = (k) => (KINDS.includes(k) ? k : null);
const cleanName = (n) => (typeof n === 'string' ? n.trim().slice(0, 40) : '');

/** Выбор: { him, me, children: [{ name, kind }] } — kind из KINDS или null. */
export function choices() {
  const saved = read(KEY, {}) || {};
  let children = Array.isArray(saved.children)
    ? saved.children.slice(0, MAX_CHILDREN).map((c) => ({ name: cleanName(c?.name), kind: kindOrNull(c?.kind) }))
    : [];
  // До 13.11.2026 ребёнок был один (поле child) — он становится первым
  if (!Array.isArray(saved.children) && kindOrNull(saved.child)) children = [{ name: '', kind: saved.child }];
  return { him: kindOrNull(saved.him), me: kindOrNull(saved.me), children };
}

function save(next) {
  write(KEY, { him: next.him, me: next.me, children: next.children });
}

export function choose(who, kind) {
  if (!WHO.includes(who)) return;
  save({ ...choices(), [who]: kindOrNull(kind) });
}

/** Сколько детей: лишние строки убираются с конца, новые — пустые. */
export function setChildCount(n) {
  const count = Math.max(0, Math.min(MAX_CHILDREN, Math.floor(Number(n) || 0)));
  const c = choices();
  const children = c.children.slice(0, count);
  while (children.length < count) children.push({ name: '', kind: null });
  save({ ...c, children });
}

/** Имя или язык одного ребёнка (patch: { name } и/или { kind }). */
export function setChild(index, patch) {
  const c = choices();
  if (!c.children[index]) return;
  const child = { ...c.children[index] };
  if ('name' in patch) child.name = cleanName(patch.name);
  if ('kind' in patch) child.kind = kindOrNull(patch.kind);
  c.children[index] = child;
  save(c);
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

/** Дело дня на языке мужчины: { kind, name, text } или null. */
export function ideaFor(who, day, lang) {
  const c = content(lang);
  const kind = choices()[who];
  if (!c || !kind || who !== 'him') return null;
  const k = c.kinds[kind];
  return { kind, name: k.name, text: pickFor(k.him, day) };
}

/** Дела дня для каждого ребёнка с выбранным языком: [{ index, child, kind, name, text }].
    Сдвиг по номеру — у двух детей с одним языком в один день разные дела. */
export function childIdeas(day, lang) {
  const c = content(lang);
  if (!c) return [];
  return choices().children
    .map((child, index) => ({ child, index }))
    .filter(({ child }) => child.kind)
    .map(({ child, index }) => {
      const k = c.kinds[child.kind];
      return { index, child, kind: child.kind, name: k.name, text: pickFor(k.child, day, index) };
    });
}

/** Свой язык: как сказать о нём и чем поблагодарить сегодня — или null. */
export function myLanguage(day, lang) {
  const c = content(lang);
  const kind = choices().me;
  if (!c || !kind) return null;
  const k = c.kinds[kind];
  return { kind, name: k.name, tell: k.tell, thanks: pickFor(k.thanks, day) };
}
