import { read, write } from '../core/store.js';
import { langData } from '../program/source.js';
import * as settings from '../settings/settings.js';
import { touchDeed } from '../tender/tender.js';

/* ПЯТЬ ЯЗЫКОВ ЛЮБВИ (Гэри Чепмен) — данные и выбор. Тексты (языки, дела, я-сообщения) — на сервере
   вместе с программой: langs.<язык>.love. Здесь только то, что выбрала сама женщина (ключ love в хранилище):
   язык её мужчины, свой, каждого ребёнка и каждого из родных — с именем (владелец 13.11.2026: «детей может быть
   2, 3, 4, каждому свой язык и свой подход»; «родители, братья, сёстры — отдельный раздел, точно так же»).

   Решение владельца 12.11.2026: сначала анкета (с 22.11.2026 — две анкеты, js/love-quiz/), потом выбор; каждый
   день — одно дело на языке мужчины и каждого ребёнка (карточка «Сегодня» и утреннее напоминание); в дни 4–6 —
   как сказать о своём языке и поблагодарить через я-сообщение. */

export const KINDS = ['words', 'time', 'gifts', 'service', 'touch'];
export const WHO = ['him', 'me'];
export const MAX_PEOPLE = 8;

/* Группы людей (владелец 13.11.2026: «отдельно мужчина, потом дети, потом родители и другие родственники — три
   разных раздела»). У группы: сколько человек, у каждого имя («Маша», «Папа», «Брат Вася») и свой язык.
   ideas — из какого списка дел брать (у языка на сервере: child — детям, family — взрослым родным). */
export const GROUPS = {
  children: { ideas: 'child' },
  family: { ideas: 'family' },
};

const KEY = 'love';

const kindOrNull = (k) => (KINDS.includes(k) ? k : null);
/* ДВА ЯЗЫКА (владелец 25.11.2026: «язык может быть неярко выраженный и меняться — если два, вероятность попадания
   гораздо больше»): у каждого — главный язык и второй по желанию. Анкета сама ставит два, когда первые два языка
   разделяет 10% и меньше (как «два ведущих» в итоге анкеты, love-quiz/quiz.js → shapeOf); при большем разрыве
   второй человек ставит сам. Второй — только при главном и отличный от него. */
const secondOrNull = (main, k) => (kindOrNull(main) && kindOrNull(k) && k !== main ? k : null);
/** Язык дела на этот день: при двух — по очереди (нечётный день — главный, чётный — второй). */
export const dayKind = (main, second, day) => (second && day % 2 === 0 ? second : main);
const cleanName = (n) => (typeof n === 'string' ? n.trim().slice(0, 40) : '');

/* ИТОГ АНКЕТЫ — хранится у каждого, кто её прошёл (владелец 24.11.2026: «результат должен сохраняться открытым…
   чтобы можно было вернуться и посмотреть свой результат, детей, родителей — какие языки в приоритете в процентах»).
   { mode, group, ranking: [{ k, kind, n, pct }] × 5, answered, total, max, shape, at } — как отдаёт love-quiz/score. */
const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0);
export function cleanResult(r) {
  if (!r || !Array.isArray(r.ranking) || r.ranking.length !== 5) return null;
  const ranking = r.ranking.map((x) => ({ k: num(x?.k), kind: kindOrNull(x?.kind), n: num(x?.n), pct: Math.min(100, num(x?.pct)) }));
  if (ranking.some((x) => x.k < 1 || x.k > 5 || !x.kind)) return null;
  return {
    mode: r.mode === 'self' ? 'self' : 'observe',
    group: ['child', 'teen', 'adult'].includes(r.group) ? r.group : null,
    ranking,
    answered: num(r.answered),
    total: num(r.total),
    max: num(r.max),
    shape: ['flat', 'dual', 'dominant'].includes(r.shape) ? r.shape : 'flat',
    at: typeof r.at === 'string' ? r.at.slice(0, 30) : null,
  };
}
const cleanList = (list) => (Array.isArray(list)
  ? list.slice(0, MAX_PEOPLE).map((p) => ({ name: cleanName(p?.name), kind: kindOrNull(p?.kind), kind2: secondOrNull(p?.kind, p?.kind2), result: cleanResult(p?.result) }))
  : []);

/** Выбор: { him, him2, me, me2, children: [{ name, kind, kind2 }], family: [{ name, kind, kind2 }] } — kind из KINDS или null; *2 — второй язык. */
export function choices() {
  const saved = read(KEY, {}) || {};
  let children = cleanList(saved.children);
  // До 13.11.2026 ребёнок был один (поле child) — он становится первым
  if (!Array.isArray(saved.children) && kindOrNull(saved.child)) children = [{ name: '', kind: saved.child, kind2: null }];
  return {
    him: kindOrNull(saved.him),
    him2: secondOrNull(saved.him, saved.him2),
    me: kindOrNull(saved.me),
    me2: secondOrNull(saved.me, saved.me2),
    children,
    family: cleanList(saved.family),
    results: { him: cleanResult(saved.results?.him), me: cleanResult(saved.results?.me) },
  };
}

function save(next) {
  write(KEY, { him: next.him, him2: secondOrNull(next.him, next.him2), me: next.me, me2: secondOrNull(next.me, next.me2), children: next.children, family: next.family, results: next.results });
}

/** Итог анкеты: who — 'him' | 'me' или группа ('children' | 'family') с номером человека; null — не проходили. */
export function resultOf(who, index) {
  const c = choices();
  return GROUPS[who] ? c[who][index]?.result || null : c.results[who] || null;
}

/** Сохранить итог пройденной анкеты — сразу, как только она пройдена; прошлый итог заменяется новым. */
export function setResult(who, index, result) {
  const r = cleanResult(result);
  if (!r) return;
  const c = choices();
  if (GROUPS[who]) {
    if (!c[who][index]) return;
    c[who][index] = { ...c[who][index], result: r };
  } else if (WHO.includes(who)) {
    c.results = { ...c.results, [who]: r };
  } else return;
  save(c);
}

/** Главный язык (second = false) или второй (second = true). Новый главный, совпавший со вторым, убирает второй. */
export function choose(who, kind, second = false) {
  if (!WHO.includes(who)) return;
  save({ ...choices(), [second ? `${who}2` : who]: kindOrNull(kind) });
}

/** Оба языка сразу — из анкеты: второй или null. */
export function chooseBoth(who, kind, kind2) {
  if (!WHO.includes(who)) return;
  save({ ...choices(), [who]: kindOrNull(kind), [`${who}2`]: kindOrNull(kind2) });
}

/** Сколько человек в группе: лишние строки убираются с конца, новые — пустые. */
export function setCount(group, n) {
  if (!GROUPS[group]) return;
  const count = Math.max(0, Math.min(MAX_PEOPLE, Math.floor(Number(n) || 0)));
  const c = choices();
  const list = c[group].slice(0, count);
  while (list.length < count) list.push({ name: '', kind: null, kind2: null, result: null });
  save({ ...c, [group]: list });
}

/** Имя или язык одного человека группы (patch: { name }, { kind }, { kind2 }). */
export function setPerson(group, index, patch) {
  if (!GROUPS[group]) return;
  const c = choices();
  if (!c[group][index]) return;
  const person = { ...c[group][index] };
  if ('name' in patch) person.name = cleanName(patch.name);
  if ('kind' in patch) person.kind = kindOrNull(patch.kind);
  if ('kind2' in patch) person.kind2 = kindOrNull(patch.kind2);
  person.kind2 = secondOrNull(person.kind, person.kind2);
  c[group][index] = person;
  save(c);
}

/** Тексты раздела на языке интерфейса; программа ещё не пришла — null. */
export function content(lang) {
  return langData(lang)?.love || null;
}

/** Один пункт из списка на этот день: весь день тот же, назавтра — другой. */
export function pickFor(list, day, salt = 0) {
  if (!list?.length) return '';
  const n = list.length;
  return list[(((day + salt) % n) + n) % n];
}

/** У партнёра язык «Прикосновения» — главный или второй. */
export function partnerTouch() {
  const c = choices();
  return c.him === 'touch' || c.him2 === 'touch';
}

/** Дело дня на языке партнёра: { kind, name, text } или null. При двух языках — по очереди. Язык «Прикосновения» —
    раз в неделю, на 4-й день, дело — ритуал прикосновений (tender/, владелец 25.11.2026: «обязательная программа,
    хотя бы раз в неделю; гладить — это минимум»). */
export function ideaFor(who, day, lang) {
  const c = content(lang);
  const mine = choices();
  if (!c || !mine[who] || who !== 'him') return null;
  const ritual = partnerTouch() ? touchDeed(day, lang) : null;
  if (ritual) return { kind: 'touch', name: ritual.title, text: ritual.text };
  const kind = dayKind(mine.him, mine.him2, day);
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
      const kind = dayKind(person.kind, person.kind2, day);
      const k = c.kinds[kind];
      return { index, person, kind, name: k.name, text: pickFor(k[g.ideas], day, index) };
    });
}

/** Свой язык: как сказать о нём и чем поблагодарить сегодня — или null. */
export function myLanguage(day, lang) {
  const c = content(lang);
  const mine = choices();
  if (!c || !mine.me) return null;
  const kind = dayKind(mine.me, mine.me2, day);
  const k = c.kinds[kind];
  // «Встречаемся» и «в поиске» — свои фразы (сервер: gsl/imsg/love-*.js, поле by; владелец 17.11.2026): на свидании
  // и в переписке; в поиске — с мамой, папой, подругой, другом. «Замужем» и «живём вместе» — основные.
  const own = k.by?.[settings.get().profile];
  const tell = own?.tell || k.tell;
  const thanks = own?.thanks?.length ? own.thanks : k.thanks;
  return { kind, name: k.name, tell, thanks: pickFor(thanks, day) };
}
