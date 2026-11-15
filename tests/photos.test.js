// Фото (js/photos/): каждый номер — есть файлом; брак не стоит нигде; у него и у неё в одном месте — разные кадры;
// фото меняется по дням.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { POOLS, FIXED } from '../js/photos/catalog.js';
import { SIZES } from '../js/photos/sizes.js';
import { pick, fixed } from '../js/photos/photos.js';

// Красные на листах разбора (владелец 15.11.2026) и 22, 24 — номер Gemini на волосах
const RED = [4, 22, 24, 39, 56, 57, 58, 72, 74, 75, 78, 79, 80, 81, 128, 129, 148, 150];
const id = (n) => String(n).padStart(3, '0');
const all = [...Object.values(POOLS), ...Object.values(FIXED)].flat();

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
  for (const table of [POOLS, FIXED]) {
    for (const key of Object.keys(table).filter((k) => k.endsWith('.woman'))) {
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
  assert.ok(POOLS['water.morning.woman'].some((n) => [87, 105, 107].includes(n)), 'есть кадры, где пьют вдвоём');
});
