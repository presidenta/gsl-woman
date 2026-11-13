// Синхронизация GSL Woman+ между устройствами (владелец, 13.11.2026). Подставной сервер ведёт себя как настоящий
// (planner/server/src/woman/sync.js): побеждает более поздний updatedAt, удаление — пометкой, курсор по номерам.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { read, write, clearAll } from '../js/core/store.js';
import * as sync from '../js/sync/sync.js';

let server;
function fakeServer() {
  const rows = new Map(); // `${user}/${kind}/${id}` → { kind, id, data, updatedAt, deletedAt, version }
  let version = 0;
  let user = 'u1';
  return {
    setUser(u) { user = u; },
    rows,
    async handle(path, { body }) {
      assert.equal(path, '/api/woman/sync');
      for (const ch of body.changes || []) {
        const key = `${user}/${ch.kind}/${ch.id}`;
        const old = rows.get(key);
        if (old && !(old.updatedAt < ch.updatedAt)) continue;
        rows.set(key, { user, kind: ch.kind, id: ch.id, data: ch.deletedAt ? null : ch.data, updatedAt: ch.updatedAt, deletedAt: ch.deletedAt || null, version: ++version });
      }
      const page = [...rows.values()].filter((r) => r.user === user && r.version > body.cursor).sort((a, b) => a.version - b.version);
      const cursor = page.reduce((m, r) => Math.max(m, r.version), body.cursor);
      return { cursor, changes: page.map(({ user: _u, version: _v, ...r }) => r), more: false, rejected: [] };
    },
  };
}

// «Другое устройство того же человека»: всё локальное стирается, вход тот же
function newDevice(userId = 'u1') {
  clearAll();
  write('account', { token: 't', userId });
}

beforeEach(() => {
  server = fakeServer();
  sync._useRequest((path, opts) => server.handle(path, opts));
  newDevice('u1');
});

const entry = (id, text, at = '2026-01-10T10:00:00.000Z') => ({ id, day: 1, kind: 'task', level: 'full', worked: text, createdAt: at, updatedAt: at });

test('заполнено на компьютере — на новом телефоне после входа всё на месте', async () => {
  write('entries', [entry('e1', 'Открыл дверь')]);
  write('love', { him: 'time', me: 'touch', children: [{ name: 'Маша', kind: 'touch' }], family: [] });
  write('settings', { onboarded: true, startDate: '2026-11-01', name: 'Аня' });
  write('morning', { '2026-11-13': true });
  await sync.now();
  assert.ok(server.rows.size >= 4, 'компьютер отправил всё на сервер');

  newDevice('u1');
  await sync.now();
  assert.equal(read('entries')[0].worked, 'Открыл дверь');
  assert.equal(read('love').children[0].name, 'Маша');
  assert.equal(read('settings').startDate, '2026-11-01');
  assert.deepEqual(read('morning'), { '2026-11-13': true });
});

test('пустой телефон с первыми настройками не затирает полный кабинет на сервере', async () => {
  write('love', { him: 'gifts', children: [], family: [] });
  write('settings', { onboarded: true, startDate: '2026-10-01' });
  await sync.now();

  newDevice('u1');
  write('settings', { onboarded: true, startDate: '2026-11-13' }); // телефон прошёл первый вход сам, до синхронизации
  await sync.now();
  assert.equal(read('settings').startDate, '2026-10-01', 'взято с сервера — там то, что вводили раньше');
  assert.equal(read('love').him, 'gifts');
});

test('правка и удаление на одном устройстве доходят до другого', async () => {
  write('goals', [{ id: 'g1', text: 'Море', done: false, createdAt: '2026-11-01T00:00:00.000Z' }]);
  write('entries', [entry('e1', 'раз'), entry('e2', 'два')]);
  await sync.now();

  // Телефон: правит цель и удаляет запись
  newDevice('u1');
  await sync.now();
  write('goals', [{ ...read('goals')[0], done: true }]);
  write('entries', read('entries').filter((e) => e.id !== 'e2'));
  await sync.now();

  // Компьютер (снова с нуля — как третье устройство): видит правку и удаление
  newDevice('u1');
  await sync.now();
  assert.equal(read('goals')[0].done, true);
  assert.deepEqual(read('entries').map((e) => e.id), ['e1']);
});

test('без сети правки копятся и уходят, когда связь появилась', async () => {
  await sync.now();
  sync._useRequest(async () => { const e = new Error('network'); e.code = 'network'; throw e; });
  write('entries', [entry('e9', 'офлайн')]);
  await sync.now();
  assert.equal(sync.status().pending, 1);
  assert.equal(sync.status().status, 'offline');

  sync._useRequest((path, opts) => server.handle(path, opts));
  await sync.now();
  assert.equal(sync.status().pending, 0);
  assert.ok([...server.rows.values()].some((r) => r.id === 'e9'));
});

test('на устройство вошла другая женщина — данные прежней убираются и в её кабинет не уходят', async () => {
  write('entries', [entry('e1', 'личное первой')]);
  await sync.now();

  write('account', { token: 't2', userId: 'u2' });
  server.setUser('u2');
  await sync.now();
  assert.deepEqual(read('entries'), [], 'у второй — пусто');
  assert.equal([...server.rows.values()].filter((r) => r.user === 'u2').length, 0, 'в кабинет второй ничего не ушло');
});
