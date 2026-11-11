// СПИСОК ФАЙЛОВ ДЛЯ РАБОТНИКА: обходит приложение и пишет files.js — что класть в кэш, чтобы всё
// открывалось без интернета. Запуск: `npm run files` после добавления или удаления любого файла.
// Руками files.js не правят: забытый файл не открылся бы без сети, и заметили бы это только на телефоне.
// Тест tests/files.test.js падает, если список разошёлся с папкой.

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// Что в кэш не идёт: служебное, проверки, исходники значков и сам работник
const SKIP_DIRS = new Set(['.git', 'node_modules', 'tests', 'tools']);
const SKIP_FILES = new Set(['sw.js', 'package.json', 'package-lock.json', '.gitattributes', '.gitignore', '.nojekyll']);
const SKIP_EXT = ['.md', '.svg'];

function walk(dir, out) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
      continue;
    }
    if (SKIP_FILES.has(name) || SKIP_EXT.some((ext) => name.endsWith(ext))) continue;
    out.push('./' + relative(ROOT, full).split(sep).join('/'));
  }
  return out;
}

export function listFiles() {
  return ['./', ...walk(ROOT, [])];
}

export function render(files = listFiles()) {
  return [
    '/* СПИСОК ФАЙЛОВ ДЛЯ КЭША РАБОТНИКА. Пишется командой `npm run files` (tools/files.mjs) — руками не править. */',
    'self.GSL_FILES = [',
    ...files.map((f) => `  '${f}',`),
    '];',
    '',
  ].join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(join(ROOT, 'files.js'), render());
  console.log(`files.js: ${listFiles().length} файлов`);
}
