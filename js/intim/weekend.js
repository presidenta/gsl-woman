import { h, svg } from '../core/dom.js';
import { icons } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import { foldCard } from '../ui/fold.js';
import { addDays } from '../core/dates.js';
import * as deeds from '../score/deeds.js';
import { intimOf, weekendTask, withPlus } from './content.js';
import { pairNow } from './map.js';
import { it } from './texts.js';

/* ИНТИМ-КВЕСТ ВЫХОДНОГО (владелец 21.11.2026: «хотя бы раз в неделю — в субботу или воскресенье, когда дни
   разгружены»): карточка на «Сегодня» в 6-й и 7-й день недели программы, в разделе «Отношения». Одно задание на
   неделю (24, дальше по кругу), три уровня, «Сделали» — +1 балл в тот день, когда нажали (score/deeds, вид intim);
   отмечено в субботу — в воскресенье карточка показывает, что сделано. Без пары — строка solo. */

export const DEED = 'intim';
const showsOn = (plan) => plan?.dayInWeek === 6 || plan?.dayInWeek === 7;

/** Второй день выходных этой недели (для «сделали в другой день»). */
const otherDay = (iso, n) => addDays(iso, n === 6 ? 1 : -1);

/** Баллы дня: отмечено «Сделали» сегодня. */
export const intimDone = (ctx, plan) => showsOn(plan) && deeds.isDone(ctx.todayIso, DEED);

export function weekendCard(ctx, plan) {
  if (!showsOn(plan)) return null;
  const intim = intimOf(ctx.lang);
  const task = weekendTask(intim, plan.week);
  if (!task) return null;
  const today = deeds.isDone(ctx.todayIso, DEED);
  const other = !today && deeds.isDone(otherDay(ctx.todayIso, plan.dayInWeek), DEED);
  const levels = it('levels');
  return foldCard({
    id: 'intim',
    cls: 'intim-weekend',
    icon: icons.heart,
    title: intim.weekend.title,
    lead: task.title,
    points: today ? 1 : 0,
    body: [
      h('p', { class: 'faint' }, intim.weekend.lead),
      h('h2', { class: 'card__title' }, task.title),
      h('p', { class: 'card__text' }, task.text),
      h('p', { class: 'caps intim-weekend__caps' }, it('how')),
      h('ol', { class: 'intim-weekend__how' }, ...task.how.map((s) => h('li', {}, s))),
      h('ul', { class: 'intim-weekend__levels' }, ...task.levels.map((s, i) => h('li', {}, h('b', {}, `${levels[i]}: `), s))),
      pairNow() ? null : h('p', { class: 'faint intim-weekend__solo' }, intim.weekend.solo),
      other ? h('p', { class: 'intim-weekend__other' }, it('doneOther')) : null,
      h('button', {
        type: 'button',
        class: today ? 'btn btn--block water__drink is-done' : 'btn btn--gold btn--block',
        'aria-pressed': String(today),
        onclick: () => { deeds.toggle(ctx.todayIso, DEED); if (!today) toast({ title: it('doneToast') }); },
      }, svg(icons.check, 'water__drink-icon'), today ? it('doneOk') : it('done')),
      h('a', { class: 'btn btn--ghost btn--block intim-weekend__link', href: '#/intim' }, h('span', {}, `${it('weekendOpen')} «`, withPlus(intim.title), '»')),
    ],
  }).node;
}
