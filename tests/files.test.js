// Список файлов работника совпадает с папкой: иначе что-то не откроется без интернета.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { render, listFiles } from '../tools/files.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('files.js свежий — после добавления файла запусти `npm run files`', () => {
  assert.equal(readFileSync(ROOT + 'files.js', 'utf8'), render());
});

test('всё, что подключает index.html, есть в кэше', () => {
  const html = readFileSync(ROOT + 'index.html', 'utf8');
  const files = new Set(listFiles());
  const refs = [...html.matchAll(/(?:href|src)="([^"#:]+)"/g)].map((m) => './' + m[1]);
  assert.ok(refs.length > 10);
  for (const ref of refs) {
    assert.ok(existsSync(ROOT + ref.slice(2)), `нет файла ${ref}`);
    assert.ok(files.has(ref), `${ref} не попадёт в кэш`);
  }
});

test('модули ссылаются только на существующие файлы', () => {
  for (const f of listFiles().filter((x) => x.endsWith('.js'))) {
    const src = readFileSync(ROOT + f.slice(2), 'utf8');
    for (const m of src.matchAll(/^import .* from '(\.[^']+)';$/gm)) {
      const target = new URL(m[1], 'file:///' + ROOT.replace(/\\/g, '/') + f.slice(2));
      assert.ok(existsSync(fileURLToPath(target)), `${f}: нет ${m[1]}`);
    }
  }
});
