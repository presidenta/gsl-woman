// «Командная цель семьи» (js/team/, владелец 21.11.2026): 10 звёзд за день на семью, доля каждого ребёнка, неделя —
// лучший день, дни с целью, кто сколько внёс. Звёзды — те же записи, что у «Мечты нашей семьи».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { goalOf, starsOfDay, dayResult, weekResult, weekStart, hasKids, DEFAULT_TARGET, DEFAULT_SHARE } from '../js/team/team.js';
import { TT } from '../js/team/texts.js';

const MOM = 'm', DAD = 'd', KID = 'k';
const circle = { members: [{ id: MOM, name: 'Анна', role: 'parent', side: 'woman' }, { id: DAD, name: 'Андрей', role: 'parent', side: 'man' }, { id: KID, name: 'Маша', role: 'child' }] };
const at = (iso, hh = '12') => new Date(`${iso}T${hh}:00:00`).toISOString();
let n = 0;
const rec = (author, data) => ({ id: `r${++n}`, author, data, updatedAt: data.at || data.doneAt });

/** Дело ребёнка и подтверждение родителя (ok — с тем же id). */
function kidDeed(iso, stars, okIso = iso) {
  const d = rec(KID, { type: 'help', text: 'помощь', at: at(iso) });
  return { deed: d, ok: { id: d.id, author: MOM, data: { stars, at: at(okIso, '09'), by: MOM } } };
}

test('цель по умолчанию — 10 звёзд и доля ребёнка 2; родитель меняет в пределах', () => {
  assert.deepEqual(goalOf([]), { target: DEFAULT_TARGET, share: DEFAULT_SHARE });
  assert.deepEqual(goalOf([{ id: 'goal', data: { target: 15, share: 3 } }]), { target: 15, share: 3 });
  assert.deepEqual(goalOf([{ id: 'goal', data: { target: 999, share: -4 } }]), { target: 50, share: 0 });
});

test('день: звёзды каждого; дело ребёнка — в день самого дела, даже если подтвердили утром', () => {
  const a = kidDeed('2026-11-20', 2, '2026-11-21');
  const data = {
    deeds: [a.deed], oks: [a.ok],
    tasks: [rec(DAD, { text: 'вынести мусор', stars: 3, takenBy: DAD, doneAt: at('2026-11-20', '19') })],
    awards: [rec(DAD, { to: MOM, stars: 5, text: 'ужин', at: at('2026-11-20', '20'), by: DAD })],
  };
  const day = starsOfDay(data, '2026-11-20');
  assert.equal(day.get(KID), 2, 'подтвердили 21-го — звёзды за 20-е');
  assert.equal(day.get(DAD), 3);
  assert.equal(day.get(MOM), 5);
  assert.equal(starsOfDay(data, '2026-11-21').size, 0);
});

test('цель дня взята только вместе с долей ребёнка', () => {
  const goal = { target: 10, share: 2 };
  const one = kidDeed('2026-11-20', 1);
  const base = { deeds: [one.deed], oks: [one.ok], tasks: [], awards: [rec(MOM, { to: DAD, stars: 10, text: 'ремонт', at: at('2026-11-20'), by: MOM })] };
  const r1 = dayResult(circle, base, goal, '2026-11-20');
  assert.equal(r1.total, 11);
  assert.equal(r1.reached, false, 'звёзд хватает, доли ребёнка нет');
  assert.deepEqual(r1.kidsLeft.map((m) => m.name), ['Маша']);
  const two = kidDeed('2026-11-20', 1);
  const r2 = dayResult(circle, { ...base, deeds: [one.deed, two.deed], oks: [one.ok, two.ok] }, goal, '2026-11-20');
  assert.equal(r2.reached, true);
  // «Потренируемся ещё» — 0 звёзд, не ждёт и не считается
  const again = kidDeed('2026-11-20', 0);
  again.ok.data.again = true;
  assert.equal(starsOfDay({ deeds: [again.deed], oks: [again.ok], tasks: [], awards: [] }, '2026-11-20').get(KID), undefined);
});

test('неделя: лучший день, дни с целью, вклад каждого; один родитель и ребёнок — тоже команда', () => {
  const pair = { members: [circle.members[1], circle.members[2]] }; // папа и ребёнок
  const goal = { target: 4, share: 1 };
  const d = (iso, s) => kidDeed(iso, s);
  const deeds = [d('2026-11-16', 1), d('2026-11-17', 3), d('2026-11-18', 1)];
  const data = {
    deeds: deeds.map((x) => x.deed), oks: deeds.map((x) => x.ok),
    tasks: [rec(DAD, { text: 'магазин', stars: 3, takenBy: DAD, doneAt: at('2026-11-16') }), rec(DAD, { text: 'ужин', stars: 4, takenBy: DAD, doneAt: at('2026-11-17') })],
    awards: [],
  };
  assert.equal(weekStart('2026-11-19'), '2026-11-16');
  const w = weekResult(pair, data, goal, '2026-11-16', '2026-11-19');
  assert.deepEqual(w.days.map((x) => x.total), [4, 7, 1, 0, 0, 0, 0]);
  assert.deepEqual(w.days.map((x) => !!x.future), [false, false, false, false, true, true, true]);
  assert.equal(w.best.iso, '2026-11-17', 'лучший день — вторник, 7 звёзд');
  assert.equal(w.reached, 2, 'цель взята в пн и вт');
  assert.deepEqual(w.members.map((m) => [m.name, m.stars]), [['Андрей', 7], ['Маша', 5]]);
  assert.equal(hasKids(pair), true);
  assert.equal(hasKids({ members: [circle.members[0], circle.members[1]] }), false, 'семья без детей — карточки нет');
});

test('тексты — на трёх языках, одни ключи, только положительные слова', () => {
  const keys = Object.keys(TT.ru).sort();
  const NO = /(^|[\s«(])(не|нет|ни|без|ні|not|no|never|without)(?=[\s,.!?»)…:]|$)/i;
  for (const lang of ['ru', 'ua', 'en']) {
    assert.deepEqual(Object.keys(TT[lang]).sort(), keys, lang);
    for (const [k, v] of Object.entries(TT[lang])) assert.ok(!NO.test(v), `${lang}.${k}: «${v}»`);
  }
});
