import { h } from '../core/dom.js';
import { icons } from '../ui/icons.js';
import { foldCard } from '../ui/fold.js';
import { deedMark } from '../love/cards.js';
import * as deeds from '../score/deeds.js';
import { langData } from '../program/source.js';
import { current as currentProfile } from '../profile/profile.js';

/* СТЕРЖЕНЬ НЕДЕЛИ — мужская сторона (владелец 15.11.2026): «Мудрость недели забираем — это перегруз для мужчины,
   а делаем стержень. Задание остаётся». Тексты — с сервера (men/stem/, поле stem программы мужской части):
   одно упражнение на неделю по Р. Гловеру «Хватит быть славным парнем!» (и немного — Ф. Богачёв).
     - у каждого профиля свои слова (married — основной text; together / dating / single — свои);
     - quote — слова автора дословно, под ними подпись «— автор, книга»;
     - дни 1–6, седьмой — отдых; «Сделал» — +1 балл (score/deeds, вид stem).
   У женской части поля stem нет — карточки нет. */

/** Упражнение недели: { title, text, quote?, by } или null (не мужская часть, седьмой день, тексты ещё не пришли). */
export function stemOf(plan, lang, profile = currentProfile()) {
  const s = langData(lang)?.stem;
  if (!s || !plan || plan.dayInWeek > 6) return null;
  const w = s.weeks[(plan.week - 1) % s.weeks.length];
  if (!w) return null;
  const text = (profile !== 'married' && w[profile]) || w.text;
  return { title: w.title, text, quote: w.quote || null, by: w.by };
}

/** Карточка на «Сегодня» — наверху, где была «Мудрость недели». */
export function stemCard(ctx, plan) {
  const w = stemOf(plan, ctx.lang);
  if (!w) return null;
  const s = langData(ctx.lang).stem;
  return foldCard({
    id: 'stem',
    cls: 'stem',
    icon: icons.crown,
    title: s.title,
    lead: w.title,
    points: deeds.isDone(ctx.todayIso, 'stem') ? 1 : 0,
    body: [
      h('p', { class: 'card__text faint' }, s.lead),
      h('h2', { class: 'card__title talk__theme' }, w.title),
      h('p', { class: 'card__text' }, w.text),
      w.quote ? h('blockquote', { class: 'stem__quote' }, w.quote) : null,
      h('p', { class: 'faint stem__by' }, `— ${w.by}`),
      deedMark(ctx, 'stem'),
    ],
  }).node;
}
