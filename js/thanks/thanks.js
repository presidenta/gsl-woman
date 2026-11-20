import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { foldCard } from '../ui/fold.js';
import * as circles from '../circles/circles.js';

/* «БЛАГОДАРНОСТЬ НЕДЕЛИ» (владелец 19.11.2026; план — docs/PLAN.md, очередь, п. 2): в паре на 7-й день каждый пишет
   одно, что ему понравилось у партнёра за неделю, и видит запись партнёра.

   Только в связанной паре (оба в «Совместных квестах»): запись уходит в контур пары видом thanks, id «неделя.участник»
   (как «Разговор пары», circles/talk.js), видна обоим; править и убирать её может только автор (сервер: OWN_KINDS).
   Пары нет — карточки нет. Сохранил — +1 балл дня (score/). Пока пишешь, черновик держится в памяти: обмен с
   сервером раз в 30 с перерисовывает «Сегодня», и набранное пропадать не должно. */

export const KIND = 'thanks';
export const MAX = 600;
const drafts = new Map(); // неделя → набранный, ещё не сохранённый текст

const pairNow = () => {
  const p = circles.pair();
  return p && circles.isComplete(p) ? p : null;
};

/** Записи этой недели: { mine, partner } — { text, author } или null. */
export function ofWeek(week, p = pairNow()) {
  if (!p) return { mine: null, partner: null };
  const marks = circles.items(p.id, KIND).filter((x) => x.data?.week === week && x.data?.text);
  const pick = (fn) => {
    const x = marks.find(fn);
    return x ? { text: x.data.text, author: x.author } : null;
  };
  return { mine: pick((x) => x.author === p.me), partner: pick((x) => x.author !== p.me) };
}

const idOf = (p, week) => `${circles.compact(week)}.${circles.short(p.me)}`;

/** Сохранить свою запись (пустой текст — убрать). */
export function save(week, text) {
  const p = pairNow();
  if (!p) return;
  const clean = String(text || '').trim().slice(0, MAX);
  const id = idOf(p, week);
  if (clean) circles.put(p.id, KIND, id, { week, text: clean });
  else if (circles.item(p.id, KIND, id)) circles.drop(p.id, KIND, id);
  drafts.delete(week);
}

const showsOn = (plan) => plan.dayInWeek === 7;

/** Своя запись этой недели есть — для баллов дня (score/). */
export function thanksDone(ctx, plan) {
  if (!showsOn(plan)) return false;
  return !!ofWeek(circles.weekOf(ctx.todayIso)).mine;
}

/** Карточка на «Сегодня» в седьмой день, только в связанной паре. */
export function thanksCard(ctx, plan) {
  if (!showsOn(plan)) return null;
  const p = pairNow();
  if (!p) return null;
  const week = circles.weekOf(ctx.todayIso);
  const { mine, partner } = ofWeek(week, p);
  const name = circles.memberName(p, partner?.author || circles.partnerOf(p)?.id) || t('us.thanks.partner');

  const area = h('textarea', {
    class: 'textarea thanks__input', rows: '3', maxlength: String(MAX),
    placeholder: t('us.thanks.ph'), 'aria-label': t('us.thanks.write'),
  });
  area.value = drafts.has(week) ? drafts.get(week) : (mine?.text || '');
  area.addEventListener('input', () => drafts.set(week, area.value));
  const editing = !mine || drafts.has(week);

  const writeBox = h('div', { class: 'thanks__write', hidden: !editing },
    area,
    h('div', { class: 'card__actions' },
      h('button', { type: 'button', class: 'btn btn--gold btn--block', onclick: () => save(week, area.value) },
        svg(icons.check, 'water__drink-icon'), t('us.thanks.save'))));

  const mineBox = mine ? h('div', { class: 'thanks__entry is-mine', hidden: editing },
    h('p', { class: 'caps thanks__who' }, t('us.thanks.mine')),
    h('p', { class: 'thanks__text' }, mine.text),
    h('button', {
      type: 'button', class: 'btn btn--ghost btn--small thanks__edit',
      onclick: () => { drafts.set(week, mine.text); mineBox.hidden = true; writeBox.hidden = false; area.focus(); },
    }, t('us.thanks.edit'))) : null;

  const partnerBox = h('div', { class: `thanks__entry is-partner${partner ? '' : ' is-wait'}` },
    h('p', { class: 'caps thanks__who' }, t('us.thanks.from', { name })),
    h('p', { class: partner ? 'thanks__text' : 'thanks__text faint' }, partner ? partner.text : t('us.thanks.wait', { name })));

  return foldCard({
    id: 'thanks',
    cls: 'thanks',
    icon: icons.heart,
    title: t('us.thanks.title'),
    lead: mine && partner ? t('us.thanks.both') : partner ? t('us.thanks.partnerWrote', { name }) : t('us.thanks.lead'),
    points: mine ? 1 : 0,
    body: [
      h('p', { class: 'card__text faint' }, t('us.thanks.how')),
      writeBox,
      mineBox,
      partnerBox,
    ],
  }).node;
}
