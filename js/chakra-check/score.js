/* ПОДСЧЁТ анкеты «Чек-лист: 7 чакр в паре». Коды ответов — с сервера, у каждого вопроса (planner/server/src/gsl/
   chakra-test/score.js): ok — как должно быть, m — перекос у него, w — у неё, mw — у обоих, pair — у пары, null — в
   подсчёт не идёт. Перекос по чакре — с порога (threshold, 2 балла). Строки «now» и «par» считаются раздельно. */

const POINTS = { m: ['man'], w: ['woman'], mw: ['man', 'woman'], pair: ['pair'] };
export const WHO = ['man', 'woman', 'pair'];

/** Баллы одной строки одной чакры. s — чакра с сервера (p1[i].score, p2.who); got — ответы строки:
    { p1: ['M'|'W'|'B'|'N'], place: ['his'|…] (жильё), p2: [true|false] }. */
export function points(s, got = {}) {
  const sum = { man: 0, woman: 0, pair: 0, answered: 0 };
  const add = (code) => { for (const k of POINTS[code] || []) sum[k] += 1; };
  s.p1.forEach((q, i) => {
    const sc = q.score || {};
    const place = got.place?.[i];
    if (sc.home && place && place in sc.place) { sum.answered += 1; add(sc.place[place]); }
    const a = got.p1?.[i];
    if (['M', 'W', 'B', 'N'].includes(a) && a in sc) { sum.answered += 1; add(sc[a]); }
  });
  (got.p2 || []).forEach((yes) => {
    if (yes === true || yes === false) sum.answered += 1;
    if (yes === true) add(s.p2.who);
  });
  return sum;
}

/** Чей перекос: список 'man' | 'woman' | 'pair' с порога; пусто — в балансе; ничего не отвечено — null. */
export function leanOf(p, threshold = 2) {
  if (!p.answered) return null;
  return WHO.filter((k) => p[k] >= threshold);
}

/** Сравнение строк чакры: repeat (тот же перекос — who), swap (у родителей был у другого), own (у родителей был, у вас —
    в балансе), nothing (оба в балансе). null — одна из строк пуста или у родителей баланс, а у вас перекос. */
export function compare(now, par) {
  if (!now || !par) return null;
  const repeat = now.filter((k) => par.includes(k));
  if (repeat.length) return { kind: 'repeat', who: repeat };
  if (par.length && now.length) return { kind: 'swap', par, now };
  if (par.length) return { kind: 'own' };
  return now.length ? null : { kind: 'nothing' };
}
