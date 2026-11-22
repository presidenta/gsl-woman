// Фото (js/photos/): каждый номер — есть файлом; брак не стоит нигде; у него и у неё в одном месте — разные кадры;
// фото меняется по дням.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { POOLS, FIXED, CHAPTERS } from '../js/photos/catalog.js';
import { SIZES } from '../js/photos/sizes.js';
import { pick, fixed, useDay, chapter } from '../js/photos/photos.js';

// Красные на листах разбора (владелец 15.11.2026) и 22, 24 — номер Gemini на волосах
const RED = [4, 22, 24, 39, 56, 57, 58, 72, 74, 75, 78, 79, 80, 81, 128, 129, 148, 150];
const id = (n) => String(n).padStart(3, '0');
// Главы книжечки — { глава: кадр } (CHAPTERS); в общий список — их кадры
const rows = { ...Object.fromEntries(Object.entries(CHAPTERS).map(([k, v]) => [k, Object.values(v)])) };
const all = [...Object.values(POOLS), ...Object.values(FIXED), ...Object.values(rows)].flat();

test('каждое фото из каталога лежит в assets/photos и знает свой размер', () => {
  for (const n of all) {
    assert.ok(SIZES[id(n)], `размер ${id(n)}`);
    assert.ok(existsSync(new URL(`../assets/photos/${id(n)}.webp`, import.meta.url)), `файл ${id(n)}`);
  }
});

test('брак не стоит нигде и не лежит в assets', () => {
  for (const n of RED) {
    assert.ok(!all.includes(n), `брак ${n} в каталоге`);
    assert.ok(!SIZES[id(n)], `брак ${n} в assets`);
  }
});

// Владелец 15.11.2026: «мужчинам поставь одну фотографию, женщинам — другую… где логика?»
test('у мужской и женской части в одном месте — ни одного общего кадра', () => {
  for (const table of [POOLS, FIXED, rows]) {
    // Стакан — исключение владельца (16.11.2026): кадры, где пьют вдвоём, «можно ставить и мужчине, и женщине»
    for (const key of Object.keys(table).filter((k) => k.endsWith('.woman') && !k.startsWith('water.'))) {
      const man = table[key.replace(/\.woman$/, '.man')];
      assert.ok(man, `у «${key}» нет пары для него`);
      const common = table[key].filter((n) => man.includes(n));
      assert.deepEqual(common, [], `общие кадры в «${key.replace(/\.woman$/, '')}»`);
    }
  }
});

test('место берёт ряд своей части; пустой ряд — без фото, чужой не подставляется', () => {
  assert.ok(POOLS['redflag.no.man'].includes(pick('redflag.no', undefined, 'man')));
  assert.ok([153, 154].includes(pick('redflag.no', undefined, 'woman')), 'у неё — она оценивает его');
  assert.ok(POOLS['us.family'].includes(pick('us.family', undefined, 'man')), 'общий ряд — когда своего нет');
  assert.equal(fixed('questions', 0, 'woman'), 82, 'первая плашка вопросов у неё — карточки «JSL»');
  assert.equal(fixed('questions', 0, 'man'), 10, 'у него — «Game of Sage»');
  assert.equal(pick('нет-такого'), null);
});

test('набор меняется по дням, в течение дня — одно фото', () => {
  const days = Array.from({ length: 6 }, (_, i) => pick('love.gifts', new Date(2026, 10, 15 + i), 'man'));
  assert.ok(new Set(days).size > 1, 'за неделю — разные фото');
  assert.equal(pick('love.gifts', new Date(2026, 10, 15, 8), 'man'), pick('love.gifts', new Date(2026, 10, 15, 22), 'man'));
});

// Владелец 16.11.2026: у стакана каждый день новый кадр, где пьют воду (одна, он, вдвоём); весь ряд — потом по кругу
test('стакан воды: каждый день новый кадр, весь ряд по очереди, потом по кругу', () => {
  for (const part of ['woman', 'man']) {
    for (const key of ['water.morning', 'water.night']) {
      const list = POOLS[`${key}.${part}`];
      const days = Array.from({ length: list.length * 2 }, (_, i) => pick(key, new Date(2026, 10, 16 + i, 9), part));
      const first = days.slice(0, list.length);
      assert.deepEqual([...first].sort(), [...list].sort(), `${key} ${part}: за ${list.length} дней — каждый кадр ровно раз`);
      assert.deepEqual(days.slice(list.length), first, `${key} ${part}: потом тот же круг`);
    }
  }
  for (const part of ['woman', 'man']) assert.ok([87, 88, 105, 106, 107].every((n) => POOLS[`water.morning.${part}`].includes(n)), 'вдвоём — у обоих');
});

// 16.11.2026, причина «на всех днях одна картинка»: администратор листает дни стрелками — фото идут по дню на экране
test('фото идут по дню программы на экране: день 1, 2, 3… — кадры ряда по порядку, утром и вечером', () => {
  for (const part of ['woman', 'man']) {
    for (const key of ['water.morning', 'water.night']) {
      const list = POOLS[`${key}.${part}`];
      const shown = [];
      for (let day = 1; day <= list.length + 1; day++) {
        useDay(day);
        shown.push(pick(key, undefined, part));
      }
      assert.deepEqual(shown.slice(0, list.length), list, `${key} ${part}: день 1 — первый кадр, дальше по порядку`);
      assert.equal(shown[list.length], list[0], `${key} ${part}: потом снова с первого`);
    }
  }
  useDay(null);
});

// Книжечка «Энергия пары» (22.11.2026): у главы — своё фото по части; глава без фото и чужой пункт — без фото
test('главы книжечки: фото по номеру главы, у него и у неё — своё; без записи — нет фото', () => {
  assert.equal(chapter('energy', 2, 'woman'), 162, 'у неё восьмёрка — лист «Шесть этапов»');
  assert.equal(chapter('energy', 2, 'man'), 167);
  assert.equal(chapter('energy', 1, 'woman'), null, 'таблица — без фото');
  assert.equal(chapter('types', 0, 'woman'), null, 'у пунктов без глав в каталоге — без фото');
  assert.equal(fixed('library', 3, 'woman'), 166, 'плашка книжечки у неё');
  assert.equal(fixed('library', 4, 'woman'), 1, '«Кто перед тобой» — с прежним фото');
  assert.equal(fixed('library', 5, 'man'), 164, 'плашка книжечки у него');
  assert.equal(fixed('library', 6, 'man'), 7, '«Кто перед тобой» у него — с прежним фото');
});

// 22.11.2026, владелец: у «Чек-листа: 7 чакр в паре» (9-я плашка «Вопросов») — пара с чакрами, а не один человек
test('чек-лист чакр в «Вопросах» — фото пары с чакрами, у неё и у него разные', () => {
  assert.equal(fixed('questions', 8, 'woman'), 170);
  assert.equal(fixed('questions', 8, 'man'), 174);
});
