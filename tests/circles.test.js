// «Пара» и «Семья» (сборка 42, docs/TZ-para-semya.md): обмен с сервером по номеру правки, непрочитанное, желания с
// совпадениями, общие цели с процентами и счётчиком от привычек, Кегель и шаги.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { write, clearAll } from '../js/core/store.js';
import { isoDate } from '../js/core/dates.js';
import * as side from '../js/side/side.js';
import * as circles from '../js/circles/circles.js';
import * as wishes from '../js/circles/wishes.js';
import * as goals from '../js/circles/goals-model.js';
import * as waterLog from '../js/water/water-log.js';
import * as logs from '../js/habits/logs.js';
import { phases, PLAN } from '../js/habits/kegel-card.js';
import { setLang } from '../js/core/i18n.js';

const SHE = '11111111-1111-1111-1111-111111111111';
const HE = '22222222-2222-2222-2222-222222222222';

/** Сервер-заглушка: один контур пары, записи по номеру правки, автор — тот, кто прислал. */
function fakeServer(me) {
  const state = { version: 0, items: [] };
  const circle = () => ({
    id: 'c1', kind: 'pair', me, role: 'partner', version: state.version,
    members: [{ id: SHE, role: 'partner', name: 'Анна', side: 'woman', hasLogin: true }, { id: HE, role: 'partner', name: 'Андрей', side: 'man', hasLogin: true }],
  });
  const handler = async (path, { body } = {}) => {
    if (path === '/api/gsl/circles') return [circle()];
    if (path === '/api/gsl/circles/c1/sync') {
      for (const r of body.changes || []) {
        const had = state.items.find((x) => x.kind === r.kind && x.id === r.id);
        state.version += 1;
        if (had) Object.assign(had, r, { version: state.version });
        else state.items.push({ ...r, author: me, version: state.version });
      }
      const changes = state.items.filter((x) => x.version > body.cursor).map(({ version, ...x }) => x);
      return { cursor: state.version, changes, more: false, rejected: [] };
    }
    throw new Error(`неожиданный адрес ${path}`);
  };
  return { state, handler, circle };
}

beforeEach(() => {
  clearAll();
  side._use('woman');
  setLang('ru');
  write('account', { token: 't', userId: SHE, gender: 'female' });
});

test('обмен: правка уходит на сервер, чужое сообщение приходит, непрочитанное считается и гасится', async () => {
  const srv = fakeServer(SHE);
  circles._useRequest(srv.handler);
  await circles.refresh();
  const pair = circles.pair();
  assert.equal(pair.id, 'c1');
  assert.equal(circles.partnerOf(pair).name, 'Андрей');

  circles.put('c1', 'goal', 'g1', { title: 'Отпуск вдвоём', type: 'counter', target: 3 });
  await circles.refresh();
  assert.equal(srv.state.items.length, 1, 'цель на сервере');

  // Он пишет — запись появляется на сервере от его имени
  srv.state.version += 1;
  srv.state.items.push({ kind: 'msg', id: 'm1', author: HE, data: { text: 'Захвачу кофе', at: new Date().toISOString() }, updatedAt: new Date().toISOString(), deletedAt: null, version: srv.state.version });
  const heard = [];
  const off = circles.onMessage((x) => heard.push(x.msg.data.text));
  await circles.refresh();
  off();
  assert.deepEqual(heard, ['Захвачу кофе'], 'плашка о новом сообщении');
  assert.equal(circles.unread().length, 1);
  circles.markSeen('c1');
  assert.equal(circles.unread().length, 0, 'прочитано');
});

test('вышли из пары — общее с телефона уходит', async () => {
  const srv = fakeServer(SHE);
  circles._useRequest(srv.handler);
  await circles.refresh();
  circles.put('c1', 'msg', 'm9', { text: 'привет', at: new Date().toISOString() });
  circles._useRequest(async (path) => (path === '/api/gsl/circles' ? [] : { cursor: 0, changes: [], more: false }));
  await circles.refresh();
  assert.equal(circles.pair(), null);
  assert.deepEqual(circles.items('c1'), []);
});

test('желания: отметки обоих, совпадения — оба «да» и «да + может быть»; в «Близости» отказа нет', async () => {
  const srv = fakeServer(SHE);
  circles._useRequest(srv.handler);
  await circles.refresh();
  const pair = circles.pair();
  const week = circles.weekOf();
  wishes.setMark(pair, week, 'want.nature.park', 'yes');
  wishes.setMark(pair, week, 'want.together.dinner', 'maybe');
  // Его отметки — как пришли бы с сервера
  const s = JSON.parse(JSON.stringify(circles.items('c1')));
  const his = (wish, mark) => ({ kind: 'mark', id: `${circles.compact(week)}.${circles.short(HE)}.${wish}`, author: HE, data: { week, wish, mark }, updatedAt: new Date().toISOString(), deletedAt: null });
  srv.state.items.push({ ...his('want.nature.park', 'yes'), version: ++srv.state.version }, { ...his('want.together.dinner', 'yes'), version: ++srv.state.version });
  await circles.refresh();
  assert.ok(s.length >= 2);
  const found = wishes.matches(pair, week);
  assert.deepEqual(found.map((w) => [w.key, w.match]), [['want.nature.park', 'both'], ['want.together.dinner', 'soft']]);
  assert.deepEqual(wishes.marksOf('close'), ['resonates', 'think'], 'в «Близости» — только «откликается» и «подумаю»');
  wishes.setMark(pair, week, 'want.nature.park', 'yes');
  assert.equal(wishes.marks('c1', week)['want.nature.park'][SHE], undefined, 'то же ещё раз — отметка снята');
  assert.ok(wishes.addOwn(pair, 'want', 'nature', 'Пикник у озера'));
  assert.ok(wishes.list('c1', 'want', 'nature').some((w) => w.own && w.text === 'Пикник у озера'));
});

test('цели: веса шагов подравниваются до 100%, прогресс — по сделанным шагам с вкладом каждого', async () => {
  assert.deepEqual(goals.normalize([{ weight: 20 }, { weight: 15 }, { weight: 15 }]).steps.map((s) => s.weight), [40, 30, 30]);
  assert.equal(goals.normalize([{ weight: 0 }, { weight: 0 }, { weight: 0 }]).steps.reduce((a, s) => a + s.weight, 0), 100);
  const srv = fakeServer(SHE);
  circles._useRequest(srv.handler);
  await circles.refresh();
  const pair = circles.pair();
  const made = goals.create(pair, { title: 'Ремонт', type: 'steps', steps: [{ text: 'Купить краску', weight: 15 }, { text: 'Покрасить стены', weight: 20 }, { text: 'Убрать', weight: 65 }] });
  const g = circles.item('c1', 'goal', made.id);
  goals.toggleStep(pair, g, g.data.steps[0].id);
  const p = goals.progress('c1', circles.item('c1', 'goal', made.id));
  assert.equal(p.percent, 15);
  assert.deepEqual(p.parts, [{ member: SHE, percent: 15 }], 'вклад — её');
});

test('счётчик от привычки: выпила стакан — +1 от неё сама; сняла отметку — вклад ушёл', async () => {
  const srv = fakeServer(SHE);
  circles._useRequest(srv.handler);
  await circles.refresh();
  const pair = circles.pair();
  const made = goals.create(pair, { title: '14 стаканов на двоих', type: 'counter', target: 14, track: 'water', period: 'week' });
  const g = () => circles.item('c1', 'goal', made.id);
  waterLog.setDone(isoDate(), true);
  goals.reconcile();
  assert.equal(goals.progress('c1', g()).count, 1);
  goals.plusOne(pair, g());
  assert.equal(goals.progress('c1', g()).count, 2, '+1 вручную');
  waterLog.setDone(isoDate(), false);
  goals.reconcile();
  assert.equal(goals.progress('c1', g()).count, 1);
});

test('Кегель: уровни по Mayo Clinic, отметка — лучший уровень дня; шаги: 3000 / 6000 / 12 000', () => {
  assert.equal(phases('min').length, 20, '10 сжатий и 10 расслаблений');
  assert.equal(phases('full').filter((p) => p.kind === 'rest').length, 2, 'отдых между тремя подходами');
  assert.deepEqual(PLAN.max, { sets: 3, reps: 10, hold: 10 });
  const iso = isoDate();
  logs.markKegel(iso, 'full');
  logs.markKegel(iso, 'min');
  assert.equal(logs.kegelLevel(iso), 'full', 'остаётся лучший');
  assert.equal(logs.stepsLevel(2999), null);
  assert.equal(logs.stepsLevel(3000), 'min');
  assert.equal(logs.stepsLevel(6000), 'full');
  assert.equal(logs.stepsLevel(15000), 'max');
  logs.setSteps(iso, 8400);
  assert.equal(logs.stepsOf(iso), 8400);
  assert.equal(logs.stepsDone(iso), true);
  logs.setSteps(iso, 0);
  assert.equal(logs.stepsOf(iso), 0);
});
