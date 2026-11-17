import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_SECTIONS, GAMES } from '../js/kids/catalog.js';
import { GROUPS, POWER, fits, groupOf, setGroup } from '../js/kids/ages.js';
import { gamesFor } from '../js/kids/games-list.js';

/* ВОЗРАСТ РЕБЁНКА (js/kids/ages.js, владелец 17.11.2026): три ступени, каталог по возрасту, «суперсила» без отрицаний. */

const api = (me, store = new Map()) => ({
  me,
  items: (kind) => [...store.values()].filter((x) => x.kind === kind),
  put: (kind, id, data) => store.set(`${kind}/${id}`, { kind, id, author: me, data }),
  drop: () => {},
  newId: (p) => `${p}-${store.size + 1}`,
});

test('возраст: у каждой ступени свои навыки; «Цепи кованые» убраны; без ступени — всё', () => {
  assert.equal(GAMES.some((g) => g.id === 'chains'), false);
  for (const g of GROUPS) assert.ok(SKILL_SECTIONS.filter((s) => fits(s, g)).length >= 5, g);
  assert.ok(SKILL_SECTIONS.some((s) => s.id === 'feelings' && !s.ages.includes('small')), 'чувства и слова — с 10 лет');
  assert.ok(SKILL_SECTIONS.filter((s) => fits(s, 'teen') && !fits(s, 'small')).length >= 3, 'у подростков — свои разделы');
  assert.equal(SKILL_SECTIONS.filter((s) => fits(s, null)).length, SKILL_SECTIONS.length);
});

test('возраст: игры каталога по ступени, родитель ставит ступень', () => {
  const store = new Map();
  const mom = api('mom', store);
  const all = gamesFor(mom, 'ira').length;
  assert.equal(groupOf(mom, 'ira'), null);
  setGroup(mom, 'ira', 'teen');
  assert.equal(groupOf(api('ira', store), 'ira'), 'teen');
  const teen = gamesFor(mom, 'ira');
  assert.ok(teen.length < all && teen.length >= 8, 'подростку — меньше детских игр');
  assert.equal(teen.some((g) => g.id === 'sea'), false);
});

test('«Моя суперсила для семьи»: идеи на каждую ступень, только положительные слова', () => {
  for (const g of GROUPS) {
    assert.ok(POWER[g].length >= 5, g);
    for (const s of POWER[g]) assert.ok(!/(^|[\s«(])(не|нет|ни|без)(?=[\s,.!?»)]|$)/i.test(s), s);
  }
});
