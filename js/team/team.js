import { DEFAULT_STARS } from '../kids/catalog.js';
import { okMap } from '../kids/stars.js';
import { addDays, isoDate } from '../core/dates.js';

/* КОМАНДНАЯ ЦЕЛЬ СЕМЬИ — только счёт, без экрана (проверки — tests/team.test.js).

   Владелец 21.11.2026: «10 звёзд за день; лучший день недели, итог недели — кто сколько внёс; ребёнок видит, кто сколько
   делает; может быть мама и ребёнок, папа и ребёнок — без разницы». Семья соревнуется сама с собой: каждый день —
   цель на всех, у каждого ребёнка своя доля (без неё цель дня не взята — ребёнок в команде, его вклад обязателен).

   Звёзды дня — те же записи семьи, что у «Мечты нашей семьи» (kids/stars.js):
     deed + ok — дело ребёнка, звёзды по подтверждению родителя; день — день САМОГО ДЕЛА (data.at): родитель подтвердил
                 утром — звёзды ложатся во вчерашний день, когда ребёнок старался;
     task      — дело семьи, сделанное взрослым (doneAt); сделанное ребёнком идёт через deed;
     award     — «＋ Звезда» от родителя (at).
   Настройка — запись семьи teamgoal, id «goal»: { target, share, by, at } — ставит только родитель (сервер:
   circles PARENT_KINDS). Нет записи — 10 звёзд на семью и по 2 на каждого ребёнка. */

export const KIND = 'teamgoal';
export const GOAL_ID = 'goal';
export const DEFAULT_TARGET = 10;
export const DEFAULT_SHARE = 2;
export const TARGET_RANGE = [3, 50];
export const SHARE_RANGE = [0, 10];

const live = (list) => (list || []).filter((x) => x && !x.deletedAt && x.data);
const clamp = (n, [lo, hi], dflt) => (Number.isFinite(Number(n)) ? Math.min(hi, Math.max(lo, Math.round(Number(n)))) : dflt);
const okStars = (o) => (o?.data?.again ? 0 : Math.max(0, Number(o?.data?.stars ?? DEFAULT_STARS) || 0));

/** Цель семьи из записи teamgoal (или по умолчанию). */
export function goalOf(items) {
  const g = live(items).find((x) => x.id === GOAL_ID)?.data || {};
  return { target: clamp(g.target, TARGET_RANGE, DEFAULT_TARGET), share: clamp(g.share, SHARE_RANGE, DEFAULT_SHARE) };
}

/** Границы дня по часам телефона: [начало, начало следующего) — ISO-строки, как метки записей. */
export function dayRange(iso) {
  return [new Date(`${iso}T00:00:00`).toISOString(), new Date(`${addDays(iso, 1)}T00:00:00`).toISOString()];
}

const inRange = (at, [from, to]) => !!at && String(at) >= from && String(at) < to;

/** Звёзды каждого участника за день iso: Map id → звёзды. */
export function starsOfDay(data, iso) {
  const range = dayRange(iso);
  const ok = okMap(data.oks);
  const out = new Map();
  const add = (id, n) => { if (id && n > 0) out.set(id, (out.get(id) || 0) + n); };
  for (const d of live(data.deeds)) if (inRange(d.data.at, range)) add(d.author, okStars(ok.get(d.id)));
  for (const t of live(data.tasks)) {
    const x = t.data;
    if (x.takenBy && x.doneAt && !x.deed && inRange(x.doneAt, range)) add(x.takenBy, Math.max(1, Number(x.stars) || DEFAULT_STARS));
  }
  for (const a of live(data.awards)) if (inRange(a.data.at || a.updatedAt, range)) add(a.data.to, Math.max(0, Number(a.data.stars) || 0));
  return out;
}

const tone = (m) => (m.role === 'child' ? 'child' : m.side === 'man' ? 'man' : 'woman');

/** День команды: кто сколько внёс, доля каждого ребёнка, взята ли цель (все звёзды и все доли). */
export function dayResult(circle, data, goal, iso = isoDate()) {
  const byId = starsOfDay(data, iso);
  const members = (circle?.members || []).map((m) => {
    const stars = byId.get(m.id) || 0;
    const kid = m.role === 'child';
    return { id: m.id, name: m.name, role: m.role, tone: tone(m), stars, share: kid ? goal.share : 0, shareDone: !kid || stars >= goal.share };
  });
  const total = members.reduce((s, m) => s + m.stars, 0);
  const kidsLeft = members.filter((m) => !m.shareDone);
  return { iso, total, target: goal.target, members, kidsLeft, reached: total >= goal.target && kidsLeft.length === 0 };
}

/** Понедельник недели даты iso. */
export function weekStart(iso = isoDate()) {
  const d = new Date(`${iso}T12:00:00`);
  return addDays(iso, -((d.getDay() + 6) % 7));
}

/** Неделя команды (пн–вс) до дня today: дни, лучший день, дни с целью, вклад каждого за неделю. */
export function weekResult(circle, data, goal, monday, today = isoDate()) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const iso = addDays(monday, i);
    days.push(iso > today ? { iso, future: true, total: 0, reached: false } : dayResult(circle, data, goal, iso));
  }
  const past = days.filter((d) => !d.future);
  // Лучший день — больше всех звёзд; при равенстве — тот, где цель взята, потом более ранний
  const best = past.filter((d) => d.total > 0).sort((a, b) => b.total - a.total || Number(b.reached) - Number(a.reached) || a.iso.localeCompare(b.iso))[0] || null;
  const members = (circle?.members || []).map((m) => ({
    id: m.id, name: m.name, role: m.role, tone: tone(m),
    stars: past.reduce((s, d) => s + (d.members.find((x) => x.id === m.id)?.stars || 0), 0),
  }));
  return {
    monday, days, best,
    reached: past.filter((d) => d.reached).length,
    total: members.reduce((s, m) => s + m.stars, 0),
    members,
  };
}

/** Есть ли в семье дети — карточка команды нужна только тогда. */
export const hasKids = (circle) => (circle?.members || []).some((m) => m.role === 'child');
