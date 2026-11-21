import { read, write } from '../core/store.js';
import * as circles from '../circles/circles.js';

/* КАРТА ЖЕЛАНИЙ «ИНТИМ 18⁺» (владелец 21.11.2026): отметки только «Да» и «Может быть» — «нет» просто не отмечаем;
   партнёру видны только совпадения. Карта постоянная (не на неделю, как «Желания на выходные»).

   Своя карта — всегда на телефоне (ключ intimmap, копия на сервере — sync/, вид intimmap): { marks: { «раздел.пункт»:
   yes|maybe }, own: [{ id, section, text }] }. В связанной паре каждая отметка дублируется в контур пары: вид imark,
   id «участник.ключ», data { key, mark } — правит только автор (сервер: OWN_KINDS); своё желание — вид iwish
   { section, text } с тем же id, чтобы второй мог отметить и его. Совпадения считаются по ключам. */

const KEY = 'intimmap';
export const MARKS = ['yes', 'maybe'];
export const MARK_KIND = 'imark';
export const WISH_KIND = 'iwish';
const MAX_TEXT = 120;

function local() {
  const v = read(KEY, null);
  return {
    marks: v?.marks && typeof v.marks === 'object' ? v.marks : {},
    own: Array.isArray(v?.own) ? v.own.filter((w) => w && typeof w.id === 'string' && typeof w.text === 'string') : [],
  };
}
const saveLocal = (next) => write(KEY, next);

/** Связанная пара (оба на месте) или null. */
export const pairNow = () => {
  const p = circles.pair();
  return p && circles.isComplete(p) ? p : null;
};

const markId = (p, key) => `${circles.short(p.me)}.${key}`.slice(0, 64);

/** Мои отметки: { ключ: mark }. */
export const myMarks = () => local().marks;

/** Поставить, сменить или снять (то же ещё раз) отметку. */
export function setMark(key, mark) {
  const s = local();
  const marks = { ...s.marks };
  const off = marks[key] === mark;
  if (off) delete marks[key];
  else marks[key] = mark;
  saveLocal({ ...s, marks });
  const p = pairNow();
  if (!p) return;
  if (off) {
    if (circles.item(p.id, MARK_KIND, markId(p, key))) circles.drop(p.id, MARK_KIND, markId(p, key));
  } else circles.put(p.id, MARK_KIND, markId(p, key), { key, mark });
}

/** Свои желания раздела: свои с телефона и (в паре) желания обоих из контура. */
export function ownList(section) {
  const p = pairNow();
  const mine = local().own.filter((w) => w.section === section).map((w) => ({ ...w, mine: true }));
  if (!p) return mine;
  const seen = new Set(mine.map((w) => w.id));
  const shared = circles.items(p.id, WISH_KIND)
    .filter((w) => w.data?.section === section && w.data?.text && !seen.has(w.id))
    .map((w) => ({ id: w.id, section, text: w.data.text, mine: w.author === p.me }));
  return [...mine, ...shared];
}

export function addOwn(section, text) {
  const clean = String(text || '').trim().slice(0, MAX_TEXT);
  if (!clean) return null;
  const w = { id: circles.newId('iw'), section, text: clean };
  const s = local();
  saveLocal({ ...s, own: [...s.own, w] });
  const p = pairNow();
  if (p) circles.put(p.id, WISH_KIND, w.id, { section, text: clean });
  return w;
}

/** Убрать своё желание (и его отметки). */
export function removeOwn(id) {
  const s = local();
  const own = s.own.filter((w) => w.id !== id);
  const marks = Object.fromEntries(Object.entries(s.marks).filter(([k]) => !k.endsWith(`.${id}`)));
  saveLocal({ marks, own });
  const p = pairNow();
  if (!p) return;
  if (circles.item(p.id, WISH_KIND, id)) circles.drop(p.id, WISH_KIND, id);
  for (const m of circles.items(p.id, MARK_KIND)) if (m.author === p.me && String(m.data?.key).endsWith(`.${id}`)) circles.drop(p.id, MARK_KIND, m.id);
}

/** Отметки партнёра (только для подсчёта совпадений — на экран идут лишь совпадения). */
function partnerMarks(p) {
  const out = {};
  for (const m of circles.items(p.id, MARK_KIND)) if (m.author !== p.me && m.data?.key && MARKS.includes(m.data.mark)) out[m.data.key] = m.data.mark;
  return out;
}

/** Совпадение двух отметок: both — оба «да», soft — остальные пары отметок; одной отметки мало — null. */
export function matchOf(a, b) {
  if (!a || !b) return null;
  return a === 'yes' && b === 'yes' ? 'both' : 'soft';
}

/** Совпадения пары: [{ key, match }] — сначала «оба да». Пары нет — []. */
export function matches(p = pairNow()) {
  if (!p) return [];
  const mine = myMarks();
  const theirs = partnerMarks(p);
  return Object.keys(mine)
    .map((key) => ({ key, match: matchOf(mine[key], theirs[key]) }))
    .filter((x) => x.match)
    .sort((a, b) => (a.match === b.match ? 0 : a.match === 'both' ? -1 : 1));
}

/** Перенести в контур пары то, что отмечено до пары (только недостающее — повторный вызов ничего не пишет). */
export function mirrorToPair(p = pairNow()) {
  if (!p) return;
  const s = local();
  for (const [key, mark] of Object.entries(s.marks)) {
    if (circles.item(p.id, MARK_KIND, markId(p, key))?.data?.mark !== mark) circles.put(p.id, MARK_KIND, markId(p, key), { key, mark });
  }
  for (const w of s.own) if (!circles.item(p.id, WISH_KIND, w.id)) circles.put(p.id, WISH_KIND, w.id, { section: w.section, text: w.text });
}

export const KEY_NAME = KEY;
