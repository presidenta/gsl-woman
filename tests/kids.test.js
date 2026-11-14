// Детский кабинет GSL (владелец 14.11.2026, ТЗ — docs/TZ-deti.md): содержание, тексты положительными словами,
// звёзды (1 за дело, больше — решает родитель), ступени, навыки, дела семьи, обмен телефона ребёнка.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_SECTIONS, SKILLS, GAMES, TASK_IDEAS, LEVELS, STAR_CHOICES, DEFAULT_STARS, DREAM_CATEGORIES } from '../js/kids/catalog.js';
import { KT, kt } from '../js/kids/texts.js';
import { starsOf, levelOf, waiting, skillCount, skillStep, familyScore, gamesOf } from '../js/kids/stars.js';
import * as kid from '../js/kids/kid-store.js';
import { familyPot, activeDream } from '../js/kids/stars.js';
import { PROFESSIONS, routeOf, FAMILY_DREAM_IDEAS, KID_LETTER_PROMPTS, POT_STOPS } from '../js/kids/dreams-catalog.js';

const strings = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
const NEGATIVE = /(^|[^а-яёА-ЯЁ])(не|нет|ни|без)(?=[^а-яёА-ЯЁ]|$)/i;

test('тексты и содержание — положительными словами (как вся программа)', () => {
  const all = [...strings(KT), ...strings(SKILL_SECTIONS), ...strings(GAMES), ...TASK_IDEAS, ...strings(LEVELS), ...strings(DREAM_CATEGORIES),
    ...strings(PROFESSIONS), ...strings(FAMILY_DREAM_IDEAS), ...KID_LETTER_PROMPTS, ...strings(POT_STOPS)];
  assert.ok(all.length > 300);
  for (const s of all) assert.doesNotMatch(s, NEGATIVE, s);
});

test('содержание: id навыков и игр уникальны, у каждой игры правила, игроки, место, что развивает', () => {
  const ids = SKILL_SECTIONS.flatMap((s) => s.skills.map(([id]) => id));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 50, 'большой список навыков');
  assert.equal(Object.keys(SKILLS).length, ids.length);
  assert.equal(new Set(GAMES.map((g) => g.id)).size, GAMES.length);
  assert.ok(GAMES.length >= 20, 'классика двора');
  for (const g of GAMES) assert.ok(g.title && g.rules && g.players && g.place && g.need && g.grows.length, g.id);
  assert.equal(DEFAULT_STARS, 1, 'любое дело — 1 звезда (владелец 14.11.2026)');
  assert.ok(STAR_CHOICES.includes(1) && STAR_CHOICES.length > 1, 'родитель ставит больше за большое дело');
});

test('kt: подстановки и путь вместо пропущенной строки', () => {
  assert.equal(kt('task.takenBy', { name: 'Ира' }), 'Взял(а): Ира');
  assert.equal(kt('нет.такого'), 'нет.такого');
});

const rec = (kind, id, author, data, updatedAt = '2026-11-14T10:00:00.000Z') => ({ kind, id, author, data, updatedAt, deletedAt: null });

test('звёзды: ребёнку — после подтверждения родителя (1 по умолчанию, «потренируемся ещё» — 0), взрослому — за сделанное дело семьи', () => {
  const deeds = [
    rec('deed', 'd1', 'ira', { type: 'skill', ref: 'kettle', at: '2026-11-14T09:00:00Z' }),
    rec('deed', 'd2', 'ira', { type: 'skill', ref: 'kettle', at: '2026-11-14T09:10:00Z' }),
    rec('deed', 'd3', 'ira', { type: 'help', ref: 'help', text: 'Уборка', at: '2026-11-14T09:20:00Z' }),
    rec('deed', 'd4', 'ira', { type: 'game', ref: 'tag', minutes: 30, opens: 0, at: '2026-11-14T09:30:00Z' }),
  ];
  const oks = [
    rec('ok', 'd1', 'mom', { stars: 1, at: '2026-11-14T10:00:00Z' }),
    rec('ok', 'd2', 'mom', { stars: 0, again: true, at: '2026-11-14T10:00:00Z' }),
    rec('ok', 'd3', 'mom', { stars: 5, at: '2026-11-14T10:00:00Z' }),
  ];
  const tasks = [
    rec('task', 't1', 'mom', { text: 'Дрова', stars: 3, takenBy: 'dad', doneAt: '2026-11-14T11:00:00Z' }),
    rec('task', 't2', 'mom', { text: 'Посуда', stars: null, takenBy: 'mom', doneAt: '2026-11-14T11:00:00Z' }),
    rec('task', 't3', 'mom', { text: 'Ужин', stars: 2, takenBy: 'ira', doneAt: '2026-11-14T11:00:00Z', deed: 'd9' }),
  ];
  const data = { deeds, oks, tasks };
  assert.equal(starsOf('ira', data), 6, '1 + 0 + 5; дело семьи ребёнка — только через подтверждение');
  assert.equal(starsOf('dad', data), 3);
  assert.equal(starsOf('mom', data), 1, 'дело без звёзд — 1');
  assert.deepEqual(waiting(deeds, oks).map((d) => d.id), ['d4'], 'ждёт подтверждения');
  assert.equal(skillCount('ira', 'kettle', deeds, oks), 1, '«потренируемся ещё» — навык пока не засчитан');
  assert.equal(gamesOf('ira', deeds).length, 1);
  const circle = { members: [{ id: 'mom', name: 'Мама', role: 'parent' }, { id: 'dad', name: 'Папа', role: 'parent' }, { id: 'ira', name: 'Ира', role: 'child' }] };
  assert.deepEqual(familyScore(circle, data).map((r) => [r.name, r.stars]), [['Мама', 1], ['Папа', 3], ['Ира', 6]], 'порядок семьи, без мест');
  assert.equal(familyScore({ members: [{ id: 'dad', name: 'Папа', role: 'parent', side: 'man' }] }, data)[0].side, 'man', 'цвет вклада — по части');
  assert.equal(starsOf('ira', data, '2026-11-15T00:00:00Z'), 0, 'с даты');
});

test('ступени: росток растёт, навык — «Получилось → Умею → Мастер»', () => {
  assert.equal(levelOf(0).level.title, 'Росток');
  assert.equal(levelOf(9).toNext, 1);
  assert.equal(levelOf(10).level.title, 'Побег');
  assert.equal(levelOf(10000).next, null);
  assert.equal(skillStep(0).step, null);
  assert.equal(skillStep(1).step.title, 'Получилось');
  assert.equal(skillStep(3).step.title, 'Умею');
  assert.equal(skillStep(7).step.title, 'Мастер');
});

test('телефон ребёнка: вход ждёт родителя, после подтверждения — записи семьи туда и обратно', async () => {
  const calls = [];
  let approved = false;
  const server = { cursor: 0, items: [] };
  kid._useFetch(async (url, opts) => {
    const path = url.replace(/^https?:\/\/[^/]+(\/genesisystem)?/, '');
    const body = opts.body ? JSON.parse(opts.body) : undefined;
    calls.push(path);
    const json = (status, data) => ({ status, ok: status < 400, json: async () => data });
    if (path === '/api/kids/login') return json(200, { token: 'T', status: 'pending', name: 'Ира' });
    if (path === '/api/kids/me') {
      return json(200, approved
        ? { status: 'active', name: 'Ира', family: { id: 'F', kind: 'family', me: 'ira', role: 'child', version: server.cursor, members: [{ id: 'ira', name: 'Ира', role: 'child' }, { id: 'mom', name: 'Мама', role: 'parent' }] } }
        : { status: 'pending', name: 'Ира' });
    }
    if (path === '/api/kids/sync') {
      const rejected = [];
      for (const c of body.changes || []) {
        if (c.kind === 'ok') { rejected.push({ kind: c.kind, id: c.id, reason: 'parent_only' }); continue; }
        server.cursor++;
        server.items.push({ ...c, author: 'ira', version: server.cursor });
      }
      return json(200, { cursor: server.cursor, changes: server.items.filter((x) => x.version > body.cursor), more: false, rejected });
    }
    return json(404, { error: 'not_found' });
  });

  await kid.login('ABCD2345', 'пароль');
  assert.equal(kid.session().status, 'pending');
  await kid.refresh();
  assert.equal(kid.family(), null, 'до подтверждения — семьи нет');

  approved = true;
  server.cursor = 1;
  server.items.push({ kind: 'task', id: 't1', author: 'mom', data: { text: 'Посуда', stars: 1 }, updatedAt: '2026-11-14T10:00:00.000Z', deletedAt: null, version: 1 });
  await kid.refresh();
  assert.equal(kid.session().status, 'active');
  assert.equal(kid.items('task')[0].data.text, 'Посуда', 'дело от мамы пришло');

  const api = kid.adapter();
  assert.equal(api.name('mom'), 'Мама');
  api.put('deed', 'd1', { type: 'skill', ref: 'kettle', at: '2026-11-14T10:05:00Z' });
  api.put('ok', 'd1', { stars: 10 });
  await new Promise((r) => setTimeout(r, 700));
  await kid.refresh();
  assert.ok(server.items.some((x) => x.kind === 'deed' && x.id === 'd1'), 'дело ушло на сервер');
  assert.equal(kid.item('ok', 'd1'), null, 'сам себе звёзды ребёнок не поставит');

  await kid.logout();
  assert.equal(kid.session(), null);
  assert.ok(calls.includes('/api/kids/logout'));
  kid._useFetch(null);
});

test('кем я хочу стать: у каждой профессии путь, шаги-навыки берут название из каталога', () => {
  assert.ok(PROFESSIONS.length >= 15);
  assert.equal(new Set(PROFESSIONS.map((p) => p.id)).size, PROFESSIONS.length);
  for (const p of PROFESSIONS) {
    const route = routeOf(p.id);
    assert.ok(route.length >= 5, p.id);
    assert.equal(new Set(route.map((s) => s.id)).size, route.length, `${p.id}: шаги без повторов`);
    for (const s of route) assert.ok(s.title && !s.title.startsWith('skill:'), `${p.id}: ${s.id} — навык есть в каталоге`);
  }
  assert.ok(routeOf('mechanic').some((s) => /ключ/i.test(s.title)), 'автомеханику — ключи (владелец)');
  assert.ok(routeOf('business').some((s) => /Монопол/.test(s.title)), 'бизнесмену — бизнес-игры (владелец)');
});

test('мечта семьи: общий котёл — звёзды всех с того дня, как мечту завели; звёзды от родителя — тоже', () => {
  const circle = { members: [{ id: 'mom', name: 'Мама', role: 'parent', side: 'woman' }, { id: 'dad', name: 'Папа', role: 'parent', side: 'man' }, { id: 'ira', name: 'Ира', role: 'child' }] };
  const dream = rec('fdream', 'fd1', 'mom', { title: 'Море', icon: '🏖️', target: 20, startAt: '2026-11-14T00:00:00Z', status: 'active' });
  const data = {
    deeds: [rec('deed', 'd1', 'ira', { type: 'help', at: '2026-11-14T09:00:00Z' }), rec('deed', 'd0', 'ira', { type: 'help', at: '2026-11-10T09:00:00Z' })],
    oks: [rec('ok', 'd1', 'mom', { stars: 3, at: '2026-11-14T10:00:00Z' }), rec('ok', 'd0', 'mom', { stars: 9, at: '2026-11-10T10:00:00Z' })],
    tasks: [rec('task', 't1', 'mom', { text: 'Дрова', stars: 3, takenBy: 'dad', doneAt: '2026-11-14T11:00:00Z' })],
    awards: [rec('award', 'a1', 'mom', { to: 'dad', stars: 2, text: 'Купил продукты', at: '2026-11-14T12:00:00Z', by: 'mom' })],
  };
  const pot = familyPot(circle, data, dream, new Date('2026-11-14T15:00:00Z'));
  assert.equal(pot.total, 8, 'до мечты (9 звёзд 10 ноября) — в котёл не идёт');
  assert.deepEqual(pot.byMember.map((m) => [m.name, m.stars]), [['Мама', 0], ['Папа', 5], ['Ира', 3]], 'вклад каждого; мама оценила папу');
  assert.equal(pot.left, 12);
  assert.equal(pot.stop.title, 'Собрали рюкзаки', '8 из 20 — первая остановка позади');
  assert.equal(pot.next.title, 'Полпути!');
  assert.equal(activeDream([dream]).id, 'fd1');
  assert.equal(activeDream([{ ...dream, data: { ...dream.data, status: 'done' } }]), null);
  assert.equal(starsOf('dad', data), 5);
});
