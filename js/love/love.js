import { read, write } from '../core/store.js';
import { langData } from '../program/source.js';

/* ПЯТЬ ЯЗЫКОВ ЛЮБВИ (Гэри Чепмен) — данные и выбор. Тексты (языки, дела, я-сообщения, тест) — на сервере
   вместе с программой: langs.<язык>.love. Здесь только то, что выбрала сама женщина (ключ love в хранилище):
   язык её мужчины, свой, каждого ребёнка и каждого из родных — с именем (владелец 13.11.2026: «детей может быть
   2, 3, 4, каждому свой язык и свой подход»; «родители, братья, сёстры — отдельный раздел, точно так же»).

   Решение владельца 12.11.2026: сначала тест, потом выбор; каждый день — одно дело на языке мужчины и каждого
   ребёнка (карточка «Сегодня» и утреннее напоминание); в дни 4–6 — как сказать о своём языке и поблагодарить
   через я-сообщение. */

export const KINDS = ['words', 'time', 'gifts', 'service', 'touch'];
export const WHO = ['him', 'me'];
export const MAX_PEOPLE = 8;

/* Группы людей (владелец 13.11.2026: «отдельно мужчина, потом дети, потом родители и другие родственники — три
   разных раздела»). У группы: сколько человек, у каждого имя («Маша», «Папа», «Брат Вася») и свой язык.
   ideas — из какого списка дел брать (у языка на сервере: child — детям, family — взрослым родным),
   quiz — какой тест. */
export const GROUPS = {
  children: { ideas: 'child', quiz: 'child' },
  family: { ideas: 'family', quiz: 'family' },
};

const KEY = 'love';

const kindOrNull = (k) => (KINDS.includes(k) ? k : null);
const cleanName = (n) => (typeof n === 'string' ? n.trim().slice(0, 40) : '');
const cleanList = (list) => (Array.isArray(list)
  ? list.slice(0, MAX_PEOPLE).map((p) => ({ name: cleanName(p?.name), kind: kindOrNull(p?.kind) }))
  : []);

/** Выбор: { him, me, children: [{ name, kind }], family: [{ name, kind }] } — kind из KINDS или null. */
export function choices() {
  const saved = read(KEY, {}) || {};
  let children = cleanList(saved.children);
  // До 13.11.2026 ребёнок был один (поле child) — он становится первым
  if (!Array.isArray(saved.children) && kindOrNull(saved.child)) children = [{ name: '', kind: saved.child }];
  return { him: kindOrNull(saved.him), me: kindOrNull(saved.me), children, family: cleanList(saved.family) };
}

function save(next) {
  write(KEY, { him: next.him, me: next.me, children: next.children, family: next.family });
}

export function choose(who, kind) {
  if (!WHO.includes(who)) return;
  save({ ...choices(), [who]: kindOrNull(kind) });
}

/** Сколько человек в группе: лишние строки убираются с конца, новые — пустые. */
export function setCount(group, n) {
  if (!GROUPS[group]) return;
  const count = Math.max(0, Math.min(MAX_PEOPLE, Math.floor(Number(n) || 0)));
  const c = choices();
  const list = c[group].slice(0, count);
  while (list.length < count) list.push({ name: '', kind: null });
  save({ ...c, [group]: list });
}

/** Имя или язык одного человека группы (patch: { name } и/или { kind }). */
export function setPerson(group, index, patch) {
  if (!GROUPS[group]) return;
  const c = choices();
  if (!c[group][index]) return;
  const person = { ...c[group][index] };
  if ('name' in patch) person.name = cleanName(patch.name);
  if ('kind' in patch) person.kind = kindOrNull(patch.kind);
  c[group][index] = person;
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

/** Дела дня для каждого человека группы с выбранным языком: [{ index, person, kind, name, text }].
    Сдвиг по номеру — у двоих с одним языком в один день разные дела. */
export function groupIdeas(group, day, lang) {
  const c = content(lang);
  const g = GROUPS[group];
  if (!c || !g) return [];
  return choices()[group]
    .map((person, index) => ({ person, index }))
    .filter(({ person }) => person.kind)
    .map(({ person, index }) => {
      const k = c.kinds[person.kind];
      return { index, person, kind: person.kind, name: k.name, text: pickFor(k[g.ideas], day, index) };
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
