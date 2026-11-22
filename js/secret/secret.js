import { h } from '../core/dom.js';
import { icons } from '../ui/icons.js';
import { platePanel } from '../ui/plate.js';
import { foldCard } from '../ui/fold.js';
import { langData } from '../program/source.js';
import { folderBody } from '../screens/help/help.js';
import { st } from './texts.js';
import { startOf, releaseDays, openedOn, daysTo, cardOn, COUNT } from './schedule.js';

/** Дни выхода глав для экрана (по дню на экране и настоящему дню человека). */
const daysOf = (ctx) => releaseDays(startOf(ctx.day, ctx.realDay ?? ctx.day), ctx.settings?.startDate);

/* «СЕКРЕТНЫЕ МАТЕРИАЛЫ» (владелец 22.11.2026, решение консилиума): досье «Секс, деньги и чакры» главами — 7 глав, по
   чакре: первая на 2-й день, остальные по выходным (schedule.js). На «Сегодня» — карточка главы под делом дня (secretCard); в «Артефактах» — плашка
   со всеми главами: открытые читаются, закрытые — «откроется через N дн.» (secretPlate). Тексты — с сервера (поле
   secret программы, planner/server/src/gsl/secret/). Стыковка — строка в screens/today/today.js и в
   screens/goals/goals.js. */

export const secretOf = (lang) => langData(lang)?.secret || null;

const stamp = (text) => h('span', { class: 'secret__stamp', 'aria-hidden': 'true' }, text);

/** Кусок книжечки: заголовок и текст тем же видом, что папки «Тайного архива». */
const piece = (b) => h('section', { class: 'secret__piece' }, h('h4', { class: 'help__section-title' }, b.title), ...folderBody(b));

function task(t) {
  return h('li', { class: 'secret__task' },
    h('p', { class: 'secret__task-title' }, t.title),
    h('p', { class: 'card__text' }, t.text),
    t.quote ? h('blockquote', { class: 'secret__quote' }, `${st('qo')}${t.quote.text}${st('qc')}`, h('span', { class: 'secret__src' }, `${st('quote')}: ${t.quote.src}`)) : null);
}

/** Содержимое главы: на виду, «Читать глубже», задания (ей / ему), паре — в последней. */
export function chapterBody(ch) {
  const deeper = h('details', { class: 'secret__deeper' }, h('summary', { class: 'secret__more' }, st('deeper')), ...ch.deeper.map(piece));
  return [
    ...ch.open.map(piece),
    deeper,
    ch.tasks.length ? h('div', { class: 'secret__tasks' }, h('p', { class: 'caps secret__caps' }, st('tasks')), h('ul', { class: 'secret__task-list' }, ...ch.tasks.map(task))) : null,
    ch.pair?.length ? h('div', { class: 'secret__tasks' }, h('p', { class: 'caps secret__caps' }, st('pair')), h('ul', { class: 'secret__task-list' }, ...ch.pair.map(task))) : null,
  ];
}

const nextLine = (n, day, days, sec) => {
  if (n >= COUNT) return st('last');
  const d = daysTo(n + 1, day, days);
  return `${d <= 1 ? st('tomorrow') : st('next', { d })}: ${sec.chapters[n].teaser}`;
};

/** Карточка главы на «Сегодня» — как остальные карточки дня (ui/fold.js, владелец 22.11.2026: «має бути похожа на
    інші»): свёрнута — гриф, «Секретные материалы · Глава первая», название досье, стрелка в кружке справа; раскрыта —
    чакра, текст главы, задания, следующая глава. Только в день главы и на следующий. */
export function secretCard(ctx) {
  const sec = secretOf(ctx.lang);
  if (!sec) return null;
  const days = daysOf(ctx);
  if (!cardOn(ctx.day, days)) return null;
  const n = openedOn(ctx.day, days);
  const ch = sec.chapters[n - 1];
  return foldCard({
    id: `secret-${n}`,
    cls: 'secret-card',
    icon: icons.journal,
    above: stamp(sec.stamp),
    title: `${sec.title} · ${st('chapter', { n })}`,
    lead: sec.book,
    keepLead: true,
    body: [
      h('h3', { class: 'secret__title' }, ch.chakra),
      ...chapterBody(ch),
      h('p', { class: 'secret__next' }, nextLine(n, ctx.day, days, sec)),
      h('a', { class: 'secret__all', href: '#/library' }, st('openAll')),
    ],
  }).node;
}

/** Плашка «Секретные материалы» в «Артефактах»: все главы, закрытые — с днями до выхода. */
export function secretPlate(ctx) {
  const sec = secretOf(ctx.lang);
  if (!sec) return null;
  const days = daysOf(ctx);
  const n = openedOn(ctx.day, days);
  const rows = sec.chapters.map((ch, i) => {
    if (i < n) {
      const node = h('details', { class: 'help__folder' },
        h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, `${st('chapter', { n: i + 1 })} · ${ch.chakra}`)),
        h('div', { class: 'help__folder-body' }, ...chapterBody(ch)));
      node.open = i === n - 1;
      return node;
    }
    const d = daysTo(i + 1, ctx.day, days);
    return h('p', { class: 'secret__locked' }, stamp(sec.stamp), h('span', {}, `${st('chapter', { n: i + 1 })} · ${ch.chakra} — ${d == null ? st('notYet') : d <= 1 ? st('closedTomorrow') : st('closed', { d })}`));
  });
  return platePanel({
    icon: icons.journal,
    stamp: sec.stamp,
    title: sec.title,
    lead: n ? st('of', { n }) : st('notYet'),
    body: [h('p', { class: 'card__text help__lead' }, st('lead', { book: sec.book })), ...rows],
  });
}
