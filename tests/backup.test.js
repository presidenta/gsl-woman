// Копия на почту (js/backup/): возврат из файла дополняет телефон и ничего не стирает; чужой файл — отказ;
// черновик новой цели отдаёт свой номер цели (сборка 68).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, write } from '../js/core/store.js';
import * as goals from '../js/goals/goals.js';
import { draft, setDraft, resetDraft, draftPhotoIds } from '../js/goals/draft.js';
import { parseArchive, restoreArchive, FORMAT } from '../js/backup/archive.js';
import { _TEXTS } from '../js/backup/texts.js';

test('возврат из файла: недостающее добавляется, своё остаётся как есть', async () => {
  write('goals', [{ id: 'g1', text: 'Моя цель', done: false }]);
  write('waterlog', { '2026-11-10': true });
  write('love', null);
  const archive = parseArchive(JSON.stringify({
    format: FORMAT, version: 1,
    data: {
      goals: [{ id: 'g1', text: 'Старая версия', done: true }, { id: 'g2', text: 'Из файла', done: false }],
      waterlog: { '2026-11-10': false, '2026-11-11': true },
      love: { mine: 'words' },
    },
    photos: [], voices: [],
  }));
  const n = await restoreArchive(archive);
  assert.equal(n, 3, 'цель g2, день 11.11 и «языки любви»');
  const list = read('goals', []);
  assert.equal(list.find((g) => g.id === 'g1').text, 'Моя цель', 'своя цель не заменяется');
  assert.ok(list.some((g) => g.id === 'g2'));
  assert.deepEqual(read('waterlog', {}), { '2026-11-10': true, '2026-11-11': true });
  assert.deepEqual(read('love', null), { mine: 'words' });
  assert.equal(await restoreArchive(archive), 0, 'второй раз — всё уже на месте');
});

test('чужой файл — отказ', () => {
  assert.throws(() => parseArchive('{"hello":1}'), (e) => e.code === 'format');
  assert.throws(() => parseArchive('не json'), (e) => e.code === 'format');
});

test('черновик цели: номер и фото переходят в цель, потом — новый черновик', () => {
  resetDraft();
  const d = draft();
  setDraft({ text: 'Дом', photos: ['p1'] });
  assert.deepEqual(draftPhotoIds(), ['p1']);
  const g = goals.add('Дом', new Date(), { id: d.id, photos: draft().photos });
  assert.equal(g.id, d.id);
  assert.deepEqual(goals.all().find((x) => x.id === d.id).photos, ['p1']);
  resetDraft();
  assert.notEqual(draft().id, d.id);
  // Номер уже занят — цель получает новый
  const again = goals.add('Ещё', new Date(), { id: d.id });
  assert.notEqual(again.id, d.id);
});

test('тексты копии — одни ключи на трёх языках', () => {
  const keys = Object.keys(_TEXTS.ru).sort();
  for (const lang of ['ua', 'en']) assert.deepEqual(Object.keys(_TEXTS[lang]).sort(), keys, lang);
});
