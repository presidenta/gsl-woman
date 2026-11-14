import { LEVELS, SKILL_STEPS, DEFAULT_STARS } from './catalog.js';

/* ЗВЁЗДЫ, СТУПЕНИ, НАВЫКИ — только счёт, без экрана и хранилища (проверки — tests/kids.test.js).

   Записи семьи (circle_items), из которых всё считается:
     deed — дело ребёнка (автор — ребёнок): { type: skill|task|game|help, ref, text, at, minutes?, opens?, friends? };
     ok   — подтверждение родителя, id = id дела: { stars, at, by, again? } — again: «потренируемся ещё», 0 звёзд;
     task — дело семьи из чата: { text, stars, by, at, takenBy, doneAt, deed? }. Сделал взрослый — звёзды ему сразу
            (взрослым верим), сделал ребёнок — он кладёт дело (deed), звёзды — после подтверждения родителя.

   Всё — по записям с датами: недели, месяцы и рейтинги (отложены владельцем) потом посчитаются из этого же. */

const live = (list) => (list || []).filter((x) => x && !x.deletedAt && x.data);

/** Подтверждения по id дела. */
export function okMap(oks) {
  const out = new Map();
  for (const o of live(oks)) out.set(o.id, o);
  return out;
}

const okStars = (o) => (o?.data?.again ? 0 : Math.max(0, Number(o?.data?.stars ?? DEFAULT_STARS) || 0));

/** Дела ребёнка, которые ждут родителя (новые сверху). */
export function waiting(deeds, oks) {
  const ok = okMap(oks);
  return live(deeds).filter((d) => !ok.has(d.id)).sort((a, b) => String(b.data.at).localeCompare(String(a.data.at)));
}

/** Звёзды участника с даты since (ISO, необязательно). Ребёнок — подтверждённые дела, взрослый — сделанные дела семьи. */
export function starsOf(member, { deeds = [], oks = [], tasks = [] }, since = '') {
  const ok = okMap(oks);
  let sum = 0;
  for (const d of live(deeds)) {
    if (d.author !== member) continue;
    const o = ok.get(d.id);
    if (o && String(o.data.at || o.updatedAt) >= since) sum += okStars(o);
  }
  for (const t of live(tasks)) {
    const x = t.data;
    if (x.takenBy === member && x.doneAt && !x.deed && String(x.doneAt) >= since) sum += Math.max(1, Number(x.stars) || DEFAULT_STARS);
  }
  return sum;
}

/** Ступень по звёздам: { level, next, toNext, progress 0…1 }. */
export function levelOf(stars) {
  let i = 0;
  while (i + 1 < LEVELS.length && stars >= LEVELS[i + 1].at) i++;
  const level = LEVELS[i];
  const next = LEVELS[i + 1] || null;
  const progress = next ? (stars - level.at) / (next.at - level.at) : 1;
  return { level, next, toNext: next ? next.at - stars : 0, progress: Math.max(0, Math.min(1, progress)) };
}

/** Сколько раз родитель подтвердил этот навык у ребёнка. */
export function skillCount(member, skillId, deeds, oks) {
  const ok = okMap(oks);
  return live(deeds).filter((d) => d.author === member && d.data.type === 'skill' && d.data.ref === skillId && okStars(ok.get(d.id)) > 0).length;
}

/** Ступень навыка по числу подтверждений: { step, next } (step — null, пока ни разу). */
export function skillStep(count) {
  let step = null;
  for (const s of SKILL_STEPS) if (count >= s.at) step = s;
  const next = SKILL_STEPS.find((s) => s.at > count) || null;
  return { step, next };
}

/** Звёзды семьи с даты: каждый участник и его звёзды — порядок семьи (без мест и соревнования). */
export function familyScore(circle, data, since = '') {
  return (circle?.members || []).map((m) => ({ id: m.id, name: m.name, role: m.role, stars: starsOf(m.id, data, since) }));
}

/** Все сыгранные живые игры ребёнка: минуты и «сколько раз брали телефон». */
export function gamesOf(member, deeds) {
  return live(deeds).filter((d) => d.author === member && d.data.type === 'game');
}
