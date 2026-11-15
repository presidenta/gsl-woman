import { h } from '../core/dom.js';
import { icons } from '../ui/icons.js';
import { foldCard } from '../ui/fold.js';
import { deedMark } from '../love/cards.js';
import * as deeds from '../score/deeds.js';
import { langData } from '../program/source.js';
import { current as currentProfile } from '../profile/profile.js';

/* ВОПРОС НА ВЕЧЕР — ВДВОЁМ (владелец 15.11.2026: «вопросы Готтманов — в дни, где мужчина и женщина отвечают вместе;
   я-сообщения — чаще»). Тексты — с сервера (gsl/evening/, поле evening программы), общие для мужа и жены.
     - дни 1–3 — вопрос по теме недели (weeks[неделя - 1][день - 1]);
     - дни 4–6 — я-сообщение вслух (imsg, по кругу от номера недели);
     - день 7 — здесь пусто: там «Итоги недели» и «Разговор пары» (circles/talk.js).
   Вопрос — строка (наш) или { text, by } — авторский вопрос Готтманов дословно, под ним подпись автора
   (владелец 15.11.2026: «авторское выставляем дословно»).
   Только у пары — профили «женат/замужем», «живём вместе», «встречаемся». «Мы поговорили» — +1 балл (score/deeds). */

const PAIR = ['married', 'together', 'dating'];
const norm = (x) => (typeof x === 'string' ? { text: x } : x);

/** Вопрос этого дня: { imsg, text, by? } или null (нет пары, седьмой день, тексты ещё не пришли). */
export function eveningOf(plan, lang, profile = currentProfile()) {
  const e = langData(lang)?.evening;
  if (!e || !plan || !PAIR.includes(profile)) return null;
  const n = plan.dayInWeek;
  if (n <= 3) {
    const text = e.weeks[(plan.week - 1) % e.weeks.length]?.[n - 1];
    return text ? { imsg: false, ...norm(text) } : null;
  }
  if (n <= 6) return { imsg: true, ...norm(e.imsg[((plan.week - 1) * 3 + (n - 4)) % e.imsg.length]) };
  return null;
}

/** Карточка на «Сегодня». */
export function eveningCard(ctx, plan) {
  const q = eveningOf(plan, ctx.lang);
  if (!q) return null;
  const e = langData(ctx.lang).evening;
  return foldCard({
    id: 'evening',
    cls: 'evening',
    icon: icons.chat,
    title: q.imsg ? e.imsgLabel : e.title,
    lead: q.text,
    points: deeds.isDone(ctx.todayIso, 'evening') ? 1 : 0,
    body: [
      h('p', { class: 'card__text faint' }, q.imsg ? e.imsgLead : e.lead),
      h('h2', { class: 'card__title talk__theme' }, q.text),
      q.by ? h('p', { class: 'faint evening__by' }, `— ${q.by}`) : null,
      deedMark(ctx, 'evening'),
    ],
  }).node;
}
