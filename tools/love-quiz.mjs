/* АНКЕТЫ «ПЯТЬ ЯЗЫКОВ ЛЮБВИ» — копия текстов с сайта анкет (владелец 22.11.2026: «эти две новые вставляй»).
   Источник один — репозиторий otkrytie-puti (https://presidenta.github.io/otkrytie-puti/):
     love/content-{ru,ua}.js          — анкета о себе, 22 вопроса;
     love-observe/content-{ru,ua}.js  — анкета по наблюдению: ребёнок, подросток, взрослый.
   Там тексты лежат в window.LOVE / window.LOVE_OBS; здесь они становятся модулями js/love-quiz/{self,observe}-{ru,ua}.js.
   Правка текстов — только на сайте, потом: npm run love-quiz (путь к сайту — первый аргумент или OTKRYTIE_PUTI). */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = process.argv[2] || process.env.OTKRYTIE_PUTI || 'D:/genesis/otkrut put test';

const SOURCES = [
  { from: 'love', global: 'LOVE', to: 'self' },
  { from: 'love-observe', global: 'LOVE_OBS', to: 'observe' },
];

for (const { from, global, to } of SOURCES) {
  for (const lang of ['ru', 'ua']) {
    const src = readFileSync(join(site, from, `content-${lang}.js`), 'utf8').replace(/\r\n/g, '\n');
    const open = `window.${global}.${lang} = {`;
    if (!src.includes(open)) throw new Error(`${from}/content-${lang}.js: нет строки «${open}»`);
    const body = src
      .replace(`window.${global} = window.${global} || {};\n`, '')
      .replace(open, 'export default {');
    const head = `/* СОЗДАНО tools/love-quiz.mjs из otkrytie-puti/${from}/content-${lang}.js — здесь не править:
   правка на сайте анкет, потом npm run love-quiz. */\n\n`;
    const out = join(root, 'js', 'love-quiz', `${to}-${lang}.js`);
    writeFileSync(out, head + body);
    console.log(`${from}/content-${lang}.js → js/love-quiz/${to}-${lang}.js`);
  }
}
