import { h, svg, add } from '../../core/dom.js';
import { t, formatDate } from '../../core/i18n.js';
import * as goals from '../../goals/goals.js';
import { field } from '../../ui/controls.js';
import { icons } from '../../ui/icons.js';
import { openSheet, closeSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';

/* ЭКРАН «ЦЕЛИ»: сверху — строка «Новая цель» и золотой «+», ниже — цели в работе, внизу — «Сбылось»
   с датами. Кружок слева отмечает «сбылось», нажатие на текст открывает правку. Данные — js/goals/. */

function goalRow(g) {
  const mark = h('button', {
    type: 'button',
    class: `goal__mark${g.done ? ' is-done' : ''}`,
    'aria-label': g.done ? t('goals.undo') : t('goals.done'),
    'aria-pressed': g.done ? 'true' : 'false',
    onclick: () => {
      goals.toggle(g.id);
      if (!g.done) toast({ title: t('goals.congrats') });
    },
  }, svg(icons.check));

  const body = h('button', { type: 'button', class: 'goal__body', onclick: () => editGoal(g) },
    h('span', { class: 'goal__text' }, g.text),
    g.done && g.doneAt ? h('span', { class: 'goal__date' }, t('goals.doneOn', { date: formatDate(g.doneAt.slice(0, 10)) })) : null,
  );

  return h('li', { class: `card goal${g.done ? ' goal--done' : ''}` }, mark, body);
}

function editGoal(g) {
  const f = field({ label: t('goals.text'), multiline: true, rows: 3, maxlength: goals.MAX_TEXT, value: g.text });
  const save = h('button', { type: 'button', class: 'btn btn--gold btn--block' }, t('common.save'));
  save.addEventListener('click', () => {
    goals.rename(g.id, f.control.value);
    closeSheet();
  });
  const del = h('button', { type: 'button', class: 'btn btn--danger btn--block' }, svg(icons.trash), t('common.delete'));
  del.addEventListener('click', () => {
    if (!confirm(t('goals.deleteConfirm'))) return;
    goals.remove(g.id);
    closeSheet();
  });
  openSheet({ title: t('goals.edit'), content: h('div', { class: 'stack' }, f.node, save, del) });
  setTimeout(() => f.control.focus(), 300);
}

export function render(view) {
  const list = goals.all();
  const open = list.filter((g) => !g.done);
  const done = list.filter((g) => g.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));

  const input = h('input', {
    class: 'input goals__input',
    placeholder: t('goals.placeholder'),
    maxlength: goals.MAX_TEXT,
    'aria-label': t('goals.placeholder'),
    enterkeyhint: 'done',
  });
  const addBtn = h('button', { type: 'submit', class: 'goals__add', 'aria-label': t('goals.add') }, svg(icons.plus));
  const form = h('form', { class: 'card goals__new' }, input, addBtn);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (goals.add(input.value)) input.value = '';
    else input.focus();
  });

  add(view,
    h('h1', { class: 'screen-title' }, t('goals.title')),
    h('p', { class: 'screen-lead' }, t('goals.lead')),
    form,
  );

  if (!list.length) {
    add(view, h('div', { class: 'card empty goals__empty' },
      h('div', { class: 'goals__emblem' }, svg(icons.goals)),
      h('div', { class: 'empty__title' }, t('goals.emptyTitle')),
      h('p', {}, t('goals.emptyText')),
    ));
    return;
  }

  if (open.length) add(view, h('ul', { class: 'goals__list' }, ...open.map(goalRow)));
  if (done.length) {
    add(view,
      h('h2', { class: 'caps goals__heading' }, t('goals.doneTitle'), h('span', { class: 'goals__count' }, String(done.length))),
      h('ul', { class: 'goals__list' }, ...done.map(goalRow)),
    );
  }
}
