import { h, svg, add } from '../../core/dom.js';
import { t, formatDate } from '../../core/i18n.js';
import { icons } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { field } from '../../ui/controls.js';
import * as meet from '../../meet/meet.js';

/* ЭКРАН «ЗНАКОМСТВО» (#/meet, владелец 14.11.2026) — технология знакомства по «темам-опознавателям»:
     1. Перед встречей — шпаргалка.
     2. Три темы: прошлое, будущее, настоящее — зачем, что спросить, зелёные и красные сигналы.
     3. Сколько времени тратить (встреча 1–3 часа, встреч 1–3 — решает человек).
     4. После встречи — запись «пока помнишь» и галочки сигналов → подсказка: строить / присмотрись / своей дорогой.
     5. Прежние записи; ниже — как держаться, комплименты или где встретить, первое свидание, вопросы глубже.
   Тексты — с сервера (meet/), у каждой части свои. Вход — «Цели», под «Письмом себе в будущее». */

function listCard(title, items, cls = '') {
  return h('section', { class: `card meet__card ${cls}` },
    h('h2', { class: 'caps meet__heading' }, title),
    h('ul', { class: 'meet__list' }, ...items.map((x) => h('li', {}, x))),
  );
}

function themeCard(th, n) {
  return h('section', { class: 'card meet__card meet__theme' },
    h('div', { class: 'card__eyebrow' }, h('span', { class: 'meet__num' }, String(n)), h('span', { class: 'caps' }, th.title)),
    h('p', { class: 'card__text' }, th.why),
    h('p', { class: 'caps meet__sub' }, t('meet.ask')),
    h('ul', { class: 'meet__list meet__list--ask' }, ...th.questions.map((q) => h('li', {}, q))),
    h('div', { class: 'meet__signals' },
      h('div', { class: 'meet__signal meet__signal--green' },
        h('p', { class: 'caps meet__sub' }, t('meet.green')),
        h('ul', { class: 'meet__list' }, ...th.green.map((x) => h('li', {}, x))),
      ),
      h('div', { class: 'meet__signal meet__signal--red' },
        h('p', { class: 'caps meet__sub' }, t('meet.red')),
        h('ul', { class: 'meet__list' }, ...th.red.map((x) => h('li', {}, x))),
      ),
    ),
  );
}

/** Галочки сигналов трёх тем; onChange — после каждого щелчка (живая подсказка). */
function signalPicker(data, onChange) {
  const checks = [];
  const group = (th, color) => h('div', { class: `meet__pick meet__pick--${color}` },
    ...th[color].map((text, i) => {
      const box = h('input', { type: 'checkbox', class: 'meet__check', value: `${th.key}.${i}` });
      box.dataset.color = color;
      box.addEventListener('change', onChange);
      checks.push(box);
      return h('label', { class: 'meet__check-row' }, box, h('span', {}, text));
    }));
  const node = h('div', { class: 'meet__picker' },
    ...data.themes.map((th) => h('div', { class: 'meet__pick-theme' },
      h('p', { class: 'caps meet__sub' }, th.title),
      group(th, 'green'),
      group(th, 'red'),
    )));
  const picked = (color) => checks.filter((c) => c.checked && c.dataset.color === color).map((c) => c.value);
  return { node, picked };
}

function verdictBox(data, verdict) {
  if (!verdict) return h('p', { class: 'faint meet__verdict-empty' }, t('meet.verdictEmpty'));
  return h('div', { class: `meet__verdict meet__verdict--${verdict}` },
    h('p', { class: 'caps meet__sub' }, t(`meet.verdict.${verdict}`)),
    h('p', { class: 'card__text' }, data.verdicts[verdict]),
    h('p', { class: 'faint' }, t('meet.verdictNote')),
  );
}

function notesCard(ctx, data) {
  const who = field({ label: t('meet.who'), placeholder: t('meet.whoPh'), maxlength: 60 });
  const date = field({ label: t('meet.date'), type: 'date', value: ctx.todayIso });
  const answers = data.notes.prompts.map((p) => field({ label: p, multiline: true, rows: 2, maxlength: meet.MAX_TEXT }));
  const verdict = h('div', { class: 'meet__verdict-slot' });
  const picker = signalPicker(data, () => verdict.replaceChildren(verdictBox(data, meet.verdictOf(picker.picked('green'), picker.picked('red')))));
  verdict.append(verdictBox(data, null));

  const form = h('form', { class: 'meet__form' },
    who.node, date.node, ...answers.map((a) => a.node),
    h('p', { class: 'caps meet__heading' }, t('meet.signalsTitle')),
    h('p', { class: 'faint' }, t('meet.signalsHint')),
    picker.node,
    verdict,
    h('button', { type: 'submit', class: 'btn btn--gold btn--block' }, svg(icons.check), t('meet.save')),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const note = meet.add({
      name: who.control.value,
      date: date.control.value,
      answers: answers.map((a) => a.control.value),
      green: picker.picked('green'),
      red: picker.picked('red'),
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
  add(view,
    h('h1', { class: 'screen-title' }, data.title),
    h('p', { class: 'meet__intro' }, data.intro),
    data.before ? listCard(data.before.title, data.before.items, 'card--hero') : null,
    ...(data.themes || []).map((th, i) => themeCard(th, i + 1)),
    data.time ? listCard(data.time.title, data.time.items) : null,
    data.themes ? notesCard(ctx, data) : null,
    pastNotes(ctx, data),
    ...data.sections.map((s) => listCard(s.title, s.items)),
    ...data.questions.map((q) => listCard(q.title, q.items, 'meet__card--questions')),
    listCard(data.signs.title, data.signs.items, 'meet__card--signs'),
  );
}
