// Фото (js/photos/): каждый номер из наборов и постоянных — есть файлом; брак не стоит нигде; фото меняется по дням.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { POOLS, FIXED } from '../js/photos/catalog.js';
import { SIZES } from '../js/photos/sizes.js';
import { pick, fixed } from '../js/photos/photos.js';

// Красные на листах разбора (владелец 15.11.2026) и 22, 24 — номер Gemini на волосах
const RED = [4, 22, 24, 39, 56, 57, 58, 72, 74, 75, 78, 79, 80, 81];
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

test('набор меняется по дням, постоянные — всегда одни и те же', () => {
  const days = Array.from({ length: 6 }, (_, i) => pick('search.rhythm', new Date(2026, 10, 15 + i)));
  assert.ok(new Set(days).size > 1, 'за неделю — разные фото');
  assert.equal(pick('search.rhythm', new Date(2026, 10, 15, 8)), pick('search.rhythm', new Date(2026, 10, 15, 22)), 'в течение дня — одно');
  assert.equal(fixed('questions', 0), 82, 'первая плашка вопросов — карточки «JSL»');
  assert.equal(pick('нет-такого'), null);
});
