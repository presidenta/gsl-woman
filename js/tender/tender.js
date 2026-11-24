import { h, svg } from '../core/dom.js';
import { toast } from '../ui/toast.js';
import { foldCard } from '../ui/fold.js';
import { icons } from '../ui/icons.js';
import { WEEK_DAYS } from '../config.js';
import { weekOf, dayInWeek } from '../core/dates.js';
import { langData } from '../program/source.js';
import { current as currentProfile } from '../profile/profile.js';
import { KIND_ICON } from '../love/kind-icons.js';
import * as deeds from '../score/deeds.js';
import { tt } from './texts.js';

/* РИТУАЛ НЕЖНОСТИ (владелец 25.11.2026: «чаще поглаживание головы, нежности — массаж ног, головы, плечи… это святое,
   и мужчинам, и женщинам»; «гладить — это минимум»). Тексты — на сервере (gsl/tender/, поле tender программы).
   • Раз в неделю, в выходной (6-й или 7-й день — тот, что без созвона; в неделе без выходного — 7-й): карточка в
     разделе «Отношения», ритуал недели по кругу, три уровня, «Получилось» — +1 балл (score/deeds, вид tender).
   • Язык партнёра — «Прикосновения» (главный или второй): на 4-й день дело в «Пяти языках любви» — ритуал со
     сдвигом на три, другой, чем в выходной (love/love.js → ideaFor).
   Профили: «встречаемся» и «в поиске» — свой ритуал (касание на встрече; нежность близким). */

export const DEED = 'tender';
/** День «Пяти языков любви», когда у партнёра с языком «Прикосновения» дело дня — ритуал. */
export const TOUCH_DAY = 4;
const TOUCH_SHIFT = 3;

export const tenderOf = (lang) => langData(lang)?.tender || null;

/** День ритуала в неделе: выходной, а в неделе без выходного — седьмой. */
export const ritualDay = (shape) => shape?.rest || WEEK_DAYS;

/** Ритуал недели: у пары — по кругу, у «встречаемся» и «в поиске» — свой. */
export function ritualFor(pack, week, shift = 0, profile = currentProfile()) {
  if (!pack?.rituals?.length) return null;
  if (profile === 'dating' || profile === 'single') return pack[profile] || null;
  const n = pack.rituals.length;
  return pack.rituals[(((week - 1 + shift) % n) + n) % n];
}

/** Баллы дня: «Получилось» отмечено сегодня (отметить можно только в день ритуала). */
export const tenderDone = (ctx) => deeds.isDone(ctx.todayIso, DEED);

/** Дело дня для «Пяти языков любви» у партнёра с языком «Прикосновения» — на 4-й день недели, иначе null. */
export function touchDeed(day, lang) {
  if (dayInWeek(day) !== TOUCH_DAY) return null;
  const pack = tenderOf(lang);
  const r = ritualFor(pack, weekOf(day), TOUCH_SHIFT);
  return r ? { title: pack.touchTitle, text: r.deed } : null;
}

const sayItem = (s) => h('li', { class: 'say' }, h('span', { class: 'say__label' }, s.label), h('q', { class: 'say__text' }, s.text));

/** Карточка в выходной. shape — раскладка недели (program/index.js → shapeOfWeek). */
export function tenderCard(ctx, plan, shape) {
  if (plan?.dayInWeek !== ritualDay(shape)) return null;
  const pack = tenderOf(ctx.lang);
  const r = ritualFor(pack, plan.week);
  if (!r) return null;
  const done = deeds.isDone(ctx.todayIso, DEED);
  const levels = tt('levels');
  return foldCard({
    id: 'tender',
    cls: 'tender',
    icon: KIND_ICON.touch || icons.heart,
    title: pack.title,
    lead: r.title,
    points: done ? 1 : 0,
    body: [
      h('p', { class: 'faint' }, pack.lead),
      h('h2', { class: 'card__title' }, r.title),
      h('p', { class: 'card__text' }, r.text),
      h('p', { class: 'caps tender__caps' }, tt('how')),
      h('ol', { class: 'tender__how' }, ...r.how.map((s) => h('li', {}, s))),
      h('ul', { class: 'tender__levels' }, ...['min', 'full', 'max'].map((k, i) => h('li', {}, h('b', {}, `${levels[i]}: `), r.levels[k]))),
      r.say?.length ? h('p', { class: 'caps tender__caps' }, tt('say')) : null,
      r.say?.length ? h('ul', { class: 'task__say' }, ...r.say.map(sayItem)) : null,
      h('button', {
        type: 'button',
        class: done ? 'btn btn--block water__drink is-done' : 'btn btn--gold btn--block',
        'aria-pressed': String(done),
        onclick: () => { deeds.toggle(ctx.todayIso, DEED); if (!done) toast({ title: tt('doneToast') }); },
      }, svg(icons.check, 'water__drink-icon'), done ? tt('doneOk') : tt('done')),
    ],
  }).node;
}
