// «Благодарность недели» (js/thanks/, владелец 19.11.2026): в паре на 7-й день каждый пишет одно, что ему понравилось
// у партнёра, и видит запись партнёра; своя запись — +1 балл дня.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { write, clearAll } from '../js/core/store.js';
import * as side from '../js/side/side.js';
import * as circles from '../js/circles/circles.js';
import * as thanks from '../js/thanks/thanks.js';
import { ITEMS } from '../js/sections/sections.js';
import { dayScore } from '../js/score/score.js';
import { setLang } from '../js/core/i18n.js';
import woman from '../js/texts/woman/ru.js';
import man from '../js/texts/man/ru.js';
import womanUa from '../js/texts/woman/ua.js';
import manUa from '../js/texts/man/ua.js';
import womanEn from '../js/texts/woman/en.js';
import manEn from '../js/texts/man/en.js';

const SHE = '11111111-1111-1111-1111-111111111111';
const HE = '22222222-2222-2222-2222-222222222222';
const TODAY = '2026-11-22';

function fakeServer(me, members = 2) {
  const state = { version: 0, items: [] };
  const all = [{ id: SHE, role: 'partner', name: 'Анна', side: 'woman', hasLogin: true }, { id: HE, role: 'partner', name: 'Андрей', side: 'man', hasLogin: true }];
  const handler = async (path, { body } = {}) => {
    if (path === '/api/gsl/circles') return [{ id: 'c1', kind: 'pair', me, role: 'partner', version: state.version, members: all.slice(0, members) }];
    if (path === '/api/gsl/circles/c1/sync') {
      for (const r of body.changes || []) {
        const had = state.items.find((x) => x.kind === r.kind && x.id === r.id);
        state.version += 1;
        if (had) Object.assign(had, r, { version: state.version });
        else state.items.push({ ...r, author: me, version: state.version });
      }
      return { cursor: state.version, changes: state.items.filter((x) => x.version > body.cursor).map(({ version, ...x }) => x), more: false, rejected: [] };
    }
    throw new Error(`неожиданный адрес ${path}`);
  };
  return { state, handler };
}

beforeEach(() => {
  clearAll();
  side._use('woman');
  setLang('ru');
  write('account', { token: 't', userId: SHE, gender: 'female' });
});

test('своя запись и запись партнёра видны обоим, правка — та же запись, пустой текст убирает', async () => {
  const srv = fakeServer(SHE);
  circles._useRequest(srv.handler);
  await circles.refresh();
  const week = circles.weekOf(TODAY);
  assert.deepEqual(thanks.ofWeek(week), { mine: null, partner: null });

  thanks.save(week, '  Мне понравилось, как ты встретил меня с работы  ');
  assert.equal(thanks.ofWeek(week).mine.text, 'Мне понравилось, как ты встретил меня с работы');
  // Он пишет — как пришло бы с сервера
  srv.state.items.push({ kind: 'thanks', id: `${circles.compact(week)}.${circles.short(HE)}`, author: HE, data: { week, text: 'Мне понравился твой смех за ужином' }, updatedAt: new Date().toISOString(), deletedAt: null, version: ++srv.state.version });
  await circles.refresh();
  const both = thanks.ofWeek(week);
  assert.equal(both.partner.text, 'Мне понравился твой смех за ужином');
  assert.equal(both.partner.author, HE);
  assert.equal(srv.state.items.filter((x) => x.kind === 'thanks').length, 2, 'обе записи на сервере');

  thanks.save(week, 'Мне понравилось, как ты починил полку');
  assert.equal(thanks.ofWeek(week).mine.text, 'Мне понравилось, как ты починил полку');
  assert.equal(circles.items('c1', 'thanks').length, 2, 'правка — та же запись');
  thanks.save(week, '   ');
  assert.equal(thanks.ofWeek(week).mine, null, 'пусто — записи нет');
  assert.equal(thanks.ofWeek(week).partner.text, 'Мне понравился твой смех за ужином', 'его запись осталась');
});

test('запись прошлой недели в эту не попадает', async () => {
  circles._useRequest(fakeServer(SHE).handler);
  await circles.refresh();
  thanks.save(circles.weekOf('2026-11-15'), 'Прошлое');
  assert.equal(thanks.ofWeek(circles.weekOf(TODAY)).mine, null);
});

test('баллы: только в 7-й день и только своя запись', async () => {
  circles._useRequest(fakeServer(SHE).handler);
  await circles.refresh();
  const ctx = { todayIso: TODAY };
  assert.equal(thanks.thanksDone(ctx, { dayInWeek: 7 }), false);
  thanks.save(circles.weekOf(TODAY), 'Мне понравилось, как ты держал меня за руку');
  assert.equal(thanks.thanksDone(ctx, { dayInWeek: 7 }), true);
  assert.equal(thanks.thanksDone(ctx, { dayInWeek: 6 }), false, 'в другие дни — нет');
  const a = dayScore(TODAY, 7, [], {}).total;
  const b = dayScore(TODAY, 7, [], { thanks: true }).total;
  assert.equal(b - a, 1, '+1 балл');
});

test('пара не связана (второго нет) — карточки нет, записывать некуда', async () => {
  circles._useRequest(fakeServer(SHE, 1).handler);
  await circles.refresh();
  assert.equal(thanks.thanksCard({ todayIso: TODAY }, { dayInWeek: 7 }), null);
  thanks.save(circles.weekOf(TODAY), 'текст');
  assert.equal(circles.items('c1', 'thanks').length, 0);
});

test('пункт в «Отношениях» сразу за «Разговором пары»; тексты на трёх языках у обеих частей, без «не»', () => {
  assert.equal(ITEMS.rel[ITEMS.rel.indexOf('talk') + 1], 'thanks');
  const KEYS = ['title', 'lead', 'how', 'ph', 'write', 'save', 'edit', 'mine', 'from', 'wait', 'partner', 'partnerWrote', 'both'];
  const NO = /(^|[\s«(])(не|нет|ни|без|ні|not|no|never|without)(?=[\s,.!?»)…]|$)/i;
  for (const [name, d] of Object.entries({ woman, man, womanUa, manUa, womanEn, manEn })) {
    for (const k of KEYS) {
      const v = d.us?.thanks?.[k];
      assert.ok(typeof v === 'string' && v.length, `${name}: us.thanks.${k}`);
      assert.ok(!NO.test(v), `${name}: us.thanks.${k} — «${v}»`);
    }
    assert.ok(d.sections.items.thanks, `${name}: sections.items.thanks`);
  }
  assert.match(woman.us.thanks.how, /у него/);
  assert.match(man.us.thanks.how, /у неё/);
});
