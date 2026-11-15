import { h, svg, add } from '../../core/dom.js';
import { t, formatDate } from '../../core/i18n.js';
import { icons } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { field } from '../../ui/controls.js';
import * as meet from '../../meet/meet.js';
import { flagRow, flagTotal, picked } from '../../ui/flags.js';

/* ЭКРАН «ЗНАКОМСТВО» (#/meet, владелец 14.11.2026) — технология знакомства по «темам-опознавателям»:
     1. Перед встречей — шпаргалка.
     2. Три темы: прошлое, будущее, настоящее — зачем, что спросить, зелёные и красные сигналы.
     3. Сколько времени тратить (встреча 1–3 часа, встреч 1–3 — решает человек).
     4. Галочки — прямо у сигналов каждой темы, под тремя темами — один итог: строить / присмотрись / своей дорогой
        (ui/flags.js — тот же вид, что в «Помощи»; владелец 15.11.2026: «не надо по два раза дублировать»).
        Отмеченное сохраняется вместе с записью «пока помнишь».
     5. Прежние записи; ниже — как держаться, комплименты или где встретить, первое свидание, вопросы глубже.
   Тексты — с сервера (meet/), у каждой части свои. Вход — «Цели», под «Письмом себе в будущее». */

function listCard(title, items, cls = '') {
  return h('section', { class: `card meet__card ${cls}` },
    h('h2', { class: 'caps meet__heading' }, title),
    h('ul', { class: 'meet__list' }, ...items.map((x) => h('li', {}, x))),
  );
}

function themeCard(th, n, onChange) {
  // value — «тема.номер»: так сигнал сохраняется в записи (meet.add проверяет вид)
  const signals = (color) => h('div', { class: 'flags meet__flags' },
    h('p', { class: 'caps meet__sub' }, t(`meet.${color}`)),
    ...th[color].map((text, i) => flagRow(color, text, { value: `${th.key}.${i}`, onChange })));
  return h('section', { class: 'card meet__card meet__theme' },
    h('div', { class: 'card__eyebrow' }, h('span', { class: 'meet__num' }, String(n)), h('span', { class: 'caps' }, th.title)),
    h('p', { class: 'card__text' }, th.why),
    h('p', { class: 'caps meet__sub' }, t('meet.ask')),
    h('ul', { class: 'meet__list meet__list--ask' }, ...th.questions.map((q) => h('li', {}, q))),
    signals('green'),
    signals('red'),
  );
}

/** Три темы с галочками и итог под ними; signals() — что отмечено (для записи). */
function themesBlock(data) {
  const total = flagTotal(data.verdicts);
  const recount = () => { const p = picked(node); total.paint(p.green.length, p.red.length); };
  const node = h('div', { class: 'meet__themes' },
    ...data.themes.map((th, i) => themeCard(th, i + 1, recount)),
    h('section', { class: 'card meet__card meet__total' },
      h('p', { class: 'faint' }, t('meet.signalsHint')),
      total.node));
  return { node, signals: () => picked(node) };
}

function notesCard(ctx, data, signals) {
  const who = field({ label: t('meet.who'), placeholder: t('meet.whoPh'), maxlength: 60 });
  const date = field({ label: t('meet.date'), type: 'date', value: ctx.todayIso });
  const answers = data.notes.prompts.map((p) => field({ label: p, multiline: true, rows: 2, maxlength: meet.MAX_TEXT }));

  const form = h('form', { class: 'meet__form' },
    who.node, date.node, ...answers.map((a) => a.node),
    h('button', { type: 'submit', class: 'btn btn--gold btn--block' }, svg(icons.check), t('meet.save')),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const note = meet.add({
      name: who.control.value,
      date: date.control.value,
      answers: answers.map((a) => a.control.value),
      ...signals(), // галочки трёх тем выше
    });
    if (!note) {
      toast({ title: t('meet.empty') });
      return;
    }
    toast({ title: t('meet.saved') });
    ctx.rerender();
  });

  return h('section', { class: 'card card--hero meet__card' },
    h('div', { class: 'card__eyebrow' }, h('span', { class: 'card__icon' }, svg(icons.journal)), h('span', { class: 'caps' }, data.notes.title)),
    h('p', { class: 'card__text' }, data.notes.text),
    form,
  );
}

function pastNotes(ctx, data) {
  const notes = meet.all();
  if (!notes.length) return null;
  return h('section', { class: 'card meet__card meet__notes' },
    h('h2', { class: 'caps meet__heading' }, t('meet.notesTitle')),
    ...notes.map((n) => h('details', { class: 'meet__note' },
      h('summary', {},
        h('strong', {}, n.name || t('meet.noName')),
        h('span', { class: 'faint' }, ` · ${formatDate(n.date)}`),
        n.verdict ? h('span', { class: `chip meet__chip meet__chip--${n.verdict}` }, t(`meet.verdict.${n.verdict}`)) : null,
      ),
      h('dl', { class: 'meet__answers' },
        ...n.answers.flatMap((a, i) => (a ? [h('dt', {}, data.notes.prompts[i] || ''), h('dd', {}, a)] : [])),
      ),
      h('button', {
        type: 'button',
        class: 'link-btn meet__remove',
        onclick: () => {
          if (!confirm(t('meet.removeConfirm'))) return;
          meet.remove(n.id);
          ctx.rerender();
        },
      }, t('meet.remove')),
    )),
  );
}

export function render(view, ctx) {
  const data = meet.content(ctx.lang);
  if (!data) {
    add(view, h('h1', { class: 'screen-title' }, t('meet.title')), h('p', { class: 'card__text' }, t('meet.waiting')));
    return;
  }
  const themes = data.themes?.length ? themesBlock(data) : null;
  add(view,
    h('h1', { class: 'screen-title' }, data.title),
    h('p', { class: 'meet__intro' }, data.intro),
    data.before ? listCard(data.before.title, data.before.items, 'card--hero') : null,
    themes?.node,
    data.time ? listCard(data.time.title, data.time.items) : null,
    themes ? notesCard(ctx, data, themes.signals) : null,
    pastNotes(ctx, data),
    ...data.sections.map((s) => listCard(s.title, s.items)),
    ...data.questions.map((q) => listCard(q.title, q.items, 'meet__card--questions')),
    listCard(data.signs.title, data.signs.items, 'meet__card--signs'),
  );
}
