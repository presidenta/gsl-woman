// Тест «Чек-лист: 7 чакр в паре» (js/chakra-check/, владелец 22.11.2026): итог — у кого больше перекосов и чей
// перекос в каждой чакре; надписи на трёх языках с одним набором ключей.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summary } from '../js/chakra-check/check.js';
import { CT } from '../js/chakra-check/texts.js';

test('итог: больше у мужчины / у женщины / поровну; по чакре — чей перекос', () => {
  const r = summary([{ man: 2, woman: 1, pair: 1 }, { woman: 2 }, {}]);
  assert.deepEqual(r.sum, { man: 2, woman: 3, pair: 1, both: 0 });
  assert.equal(r.top, 'woman');
  assert.deepEqual(r.leans, ['man', 'woman', null]);
  assert.equal(summary([{ man: 1, woman: 1 }]).top, 'equal');
  assert.equal(summary([{ man: 1, woman: 1 }]).leans[0], 'equal');
  assert.equal(summary([{ pair: 2 }]).top, null, 'только «в паре» — без мужчины и женщины');
});

test('надписи — одни ключи на ru, ua, en; без оценок', () => {
  const keys = (o) => Object.keys(o).sort().join();
  assert.equal(keys(CT.ua), keys(CT.ru));
  assert.equal(keys(CT.en), keys(CT.ru));
  const all = JSON.stringify(CT);
  assert.ok(!/молодец|умниц|молодець|well done|good (boy|girl)/i.test(all));
});
