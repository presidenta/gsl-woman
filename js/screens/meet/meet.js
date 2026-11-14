import { h, svg, add } from '../../core/dom.js';
import { t, formatDate } from '../../core/i18n.js';
import { icons } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { field } from '../../ui/controls.js';
import * as meet from '../../meet/meet.js';

/* ЭКРАН «ЗНАКОМСТВО» (#/meet, владелец 14.11.2026). Сверху вниз: зачем раздел; «После свидания — запиши» (форма по
   подсказкам — пока помнишь) и прежние записи; как держаться, где встретить, первое свидание; о чём спросить;
   как понять, что это твой человек. Тексты — с сервера (meet/), у каждой части свои. */

function listCard(title, items, cls = '') {
  return h('section', { class: `card meet__card ${cls}` },
    h('h2', { class: 'caps meet__heading' }, title),
    h('ul', { class: 'meet__list' }, ...items.map((x) => h('li', {}, x))),
  );
}

function notesCard(view, ctx, data) {
  const who = field({ label: t('meet.who'), placeholder: t('meet.whoPh'), maxlength: 60 });
  const date = field({ label: t('meet.date'), type: 'date', value: ctx.todayIso });
  const answers = data.notes.prompts.map((p) => field({ label: p, multiline: true, rows: 2, maxlength: meet.MAX_TEXT }));
  const form = h('form', { class: 'meet__form' },
    who.node, date.node, ...answers.map((a) => a.node),
    h('button', { type: 'submit', class: 'btn btn--gold btn--block' }, svg(icons.check), t('meet.save')),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const note = meet.add({ name: who.control.value, date: date.control.value, answers: answers.map((a) => a.control.value) });
    if (!note) {
      toast({ title: t('meet.empty') });
      return;
    }
    toast({ title: t('meet.saved') });
    ctx.rerender();
  });

  const notes = meet.all();
  return h('section', { class: 'card card--hero meet__card' },
    h('div', { class: 'card__eyebrow' }, h('span', { class: 'card__icon' }, svg(icons.journal)), h('span', { class: 'caps' }, data.notes.title)),
    h('p', { class: 'card__text' }, data.notes.text),
    form,
    notes.length
      ? h('div', { class: 'meet__notes' },
        h('p', { class: 'caps meet__heading' }, t('meet.notesTitle')),
        ...notes.map((n) => h('details', { class: 'meet__note' },
          h('summary', {}, h('strong', {}, n.name || t('meet.noName')), h('span', { class: 'faint' }, ` · ${formatDate(n.date)}`)),
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
      )
      : null,
  );
}

export function render(view, ctx) {
  const data = meet.content(ctx.lang);
  if (!data) {
    add(view, h('h1', { class: 'screen-title' }, t('meet.title')), h('p', { class: 'card__text' }, t('meet.waiting')));
    return;
  }
  add(view,
    h('h1', { class: 'screen-title' }, data.title),
    h('p', { class: 'meet__intro' }, data.intro),
    notesCard(view, ctx, data),
    ...data.sections.map((s) => listCard(s.title, s.items)),
    ...data.questions.map((q) => listCard(q.title, q.items, 'meet__card--questions')),
    listCard(data.signs.title, data.signs.items, 'meet__card--signs'),
  );
}
