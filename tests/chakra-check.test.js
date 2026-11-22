// Анкета «Чек-лист: 7 чакр в паре» (js/chakra-check/, владелец 22.11.2026): два опросника («У вас дома» / «У родителей»)
// считаются раздельно; перекос — с двух баллов; «Что повторяется» — сравнение строк; надписи — одни ключи на трёх языках.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { points, leanOf, compare } from '../js/chakra-check/score.js';
import { CT } from '../js/chakra-check/texts.js';

const ROLE = { M: 'ok', W: 'w', B: null };
const SIGN = { M: 'm', W: 'w', B: 'mw', N: 'ok' };
const chakra = {
  p1: [{ score: { home: true, place: { his: 'ok', hers: 'w', together: 'ok', rent: null }, ...ROLE } }, { score: ROLE }, { score: SIGN }],
  p2: { who: 'w' },
};

test('баллы: роль, признак, жильё в два шага, «Да» части 2', () => {
  assert.deepEqual(points(chakra, {}), { man: 0, woman: 0, pair: 0, answered: 0 });
  const p = points(chakra, { place: ['hers'], p1: ['W', 'M', 'B'], p2: [true, false] });
  assert.deepEqual(p, { man: 1, woman: 4, pair: 0, answered: 6 });
  assert.equal(points(chakra, { p1: [null, null, 'N'] }).answered, 1, '«Никто» — ответ, в балансе');
  assert.equal(points(chakra, { p1: [null, 'N'] }).answered, 0, 'варианта нет у вопроса — не считается');
});

test('перекос — с двух баллов; пусто — в балансе; ничего не отвечено — null', () => {
  assert.equal(leanOf({ man: 0, woman: 0, pair: 0, answered: 0 }), null);
  assert.deepEqual(leanOf({ man: 1, woman: 1, pair: 0, answered: 4 }), []);
  assert.deepEqual(leanOf({ man: 2, woman: 3, pair: 0, answered: 6 }), ['man', 'woman']);
  assert.deepEqual(leanOf({ man: 0, woman: 0, pair: 2, answered: 3 }), ['pair']);
});

test('«Что повторяется»: тот же перекос, роли поменялись, по-своему, оба в балансе', () => {
  assert.deepEqual(compare(['woman'], ['woman', 'man']), { kind: 'repeat', who: ['woman'] });
  assert.deepEqual(compare(['woman'], ['man']), { kind: 'swap', par: ['man'], now: ['woman'] });
  assert.deepEqual(compare([], ['man']), { kind: 'own' });
  assert.deepEqual(compare([], []), { kind: 'nothing' });
  assert.equal(compare(null, ['man']), null);
  assert.equal(compare(['man'], []), null);
});

test('надписи — одни ключи на ru, ua, en; без оценок', () => {
  const keys = (o) => Object.keys(o).sort().join();
  assert.equal(keys(CT.ua), keys(CT.ru));
  assert.equal(keys(CT.en), keys(CT.ru));
  assert.ok(!/молодец|умниц|молодець|well done|good (boy|girl)/i.test(JSON.stringify(CT)));
});
