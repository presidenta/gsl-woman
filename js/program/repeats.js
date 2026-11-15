/* ПОВТОР ПО ГРАФИКУ (владелец 15.11.2026: «если она раз в полгода выйдет из машины или скажет сексуальным голосом —
   забудет; повторение — мать учения»). У задания с сервера — ритм task.repeat (planner/server/src/gsl/repeat.js):
     month — раз в месяц (через 4 недели), two — раз в два месяца (8), three — раз в три месяца (12).
   Навык возвращается в неделю, когда с его недели прошло ровно столько (и дальше — так же по кругу).
   В дни практики: 4-й — главные и важные (месяц и два), 5-й — остальные (три месяца); не больше трёх за день —
   чтобы день остался лёгким. Ничего не хранит: всё считается из номера недели. */

export const INTERVAL_WEEKS = { month: 4, two: 8, three: 12 };
const ORDER = ['month', 'two', 'three'];
export const MAX_PER_DAY = 3;

/** Какие ритмы возвращаются в день недели n: 4 — month и two, 5 — three; в остальные дни — ничего. */
export function tiersForDay(n) {
  if (n === 4) return ['month', 'two'];
  if (n === 5) return ['three'];
  return [];
}

/**
 * Навыки, к которым пора вернуться на неделе week: [{ task, fromWeek, tier }].
 * weeks — недели программы (week 1 — weeks[0]); tiers — какие ритмы брать.
 */
export function dueRepeats(weeks, week, tiers, max = MAX_PER_DAY) {
  if (!tiers.length) return [];
  const seen = new Set();
  const out = [];
  weeks.forEach((w, i) => {
    const fromWeek = i + 1;
    if (fromWeek >= week) return;
    for (const task of w.tasks || []) {
      const step = INTERVAL_WEEKS[task.repeat];
      if (!step || !tiers.includes(task.repeat)) continue;
      if ((week - fromWeek) % step !== 0 || seen.has(task.title)) continue;
      seen.add(task.title);
      out.push({ task, fromWeek, tier: task.repeat });
    }
  });
  out.sort((a, b) => ORDER.indexOf(a.tier) - ORDER.indexOf(b.tier) || a.fromWeek - b.fromWeek);
  return out.slice(0, max);
}
