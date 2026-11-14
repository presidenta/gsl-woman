import { h } from '../core/dom.js';
import { toast } from '../ui/toast.js';
import { lt } from './texts.js';
import { MAX_SEALED, YEAR_CHOICES, MAX_YEARS, MAX_TEXT, isSealed, daysLeft, canWrite, compose } from './letters.js';

/* ПИСЬМО СЕБЕ В БУДУЩЕЕ — карточка (взрослый: «Цели» → «Мои»; ребёнок: «Мечты» → «Письма»).
   Конверты: запечатанный — дата и «откроется через N дней» (текст скрыт); пришедший — «Письмо из прошлого!» и
   «Открыть»; открытый — текст и день, когда написано. Ниже — новое письмо: с чего начать, текст, через сколько
   лет (1 · 5 · 10 · своё число), у ребёнка — «пишу вместе с мамой или папой». */

let open = false;

function fmt(iso) {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function envelope(box, l, { rerender, kid }) {
  const now = new Date();
  if (isSealed(l, now)) {
    return h('li', { class: 'letter is-sealed' },
      h('span', { class: 'letter__icon', 'aria-hidden': 'true' }, '✉️'),
      h('div', { class: 'letter__main' },
        h('span', { class: 'letter__title' }, lt('sealed', { date: fmt(l.openAt) })),
        h('span', { class: 'letter__meta' }, lt('left', { n: daysLeft(l, now) })),
        kid && l.together ? h('span', { class: 'letter__badge' }, lt('together')) : null));
  }
  if (!l.readAt) {
    return h('li', { class: 'letter is-arrived' },
      h('span', { class: 'letter__icon', 'aria-hidden': 'true' }, '📬'),
      h('div', { class: 'letter__main' },
        h('span', { class: 'letter__title' }, lt('arrived')),
        h('span', { class: 'letter__meta' }, lt('written', { date: fmt(l.writtenAt) })),
        h('button', { type: 'button', class: 'btn btn--gold', onclick: () => { box.save({ ...l, readAt: new Date().toISOString() }); rerender?.(); } }, lt('open'))));
  }
  return h('li', { class: 'letter is-open' },
    h('span', { class: 'letter__icon', 'aria-hidden': 'true' }, '💌'),
    h('div', { class: 'letter__main' },
      h('span', { class: 'letter__meta' }, lt('written', { date: fmt(l.writtenAt) })),
      h('p', { class: 'letter__text' }, l.text),
      h('button', { type: 'button', class: 'btn btn--ghost letter__keep', onclick: () => { if (confirm(lt('removeAsk'))) { box.remove(l.id); rerender?.(); } } }, lt('remove'))));
}

function composer(box, { rerender, kid, prompts }) {
  let years = YEAR_CHOICES[0];
  let together = false;
  const text = h('textarea', { class: 'textarea letter__input', rows: '6', maxlength: String(MAX_TEXT), placeholder: lt(kid ? 'phKid' : 'ph'), 'aria-label': lt('write') });
  const own = h('input', { class: 'input letter__years', type: 'number', min: '1', max: String(MAX_YEARS), placeholder: lt('own'), 'aria-label': lt('own') });
  const chips = h('div', { class: 'kid-chips', role: 'radiogroup', 'aria-label': lt('when') }, ...YEAR_CHOICES.map((y) => h('button', {
    type: 'button', class: `kid-chip${y === years ? ' is-on' : ''}`, role: 'radio', 'aria-checked': String(y === years),
    onclick: (e) => { years = y; own.value = ''; for (const b of chips.children) { b.classList.remove('is-on'); b.setAttribute('aria-checked', 'false'); } e.currentTarget.classList.add('is-on'); e.currentTarget.setAttribute('aria-checked', 'true'); },
  }, lt(`years.${y}`))));
  own.addEventListener('input', () => {
    if (!own.value) return;
    for (const b of chips.children) { b.classList.remove('is-on'); b.setAttribute('aria-checked', 'false'); }
  });
  const starts = h('div', { class: 'kid-chips' }, ...prompts.map((p) => h('button', {
    type: 'button', class: 'kid-chip',
    onclick: () => { text.value = (text.value ? `${text.value.trimEnd()}\n` : '') + p.replace(/…$/, ' '); text.focus(); },
  }, p)));
  const pair = kid ? h('button', {
    type: 'button', class: 'kid-chip', 'aria-pressed': 'false',
    onclick: (e) => { together = !together; e.currentTarget.classList.toggle('is-on', together); e.currentTarget.setAttribute('aria-pressed', String(together)); },
  }, lt('togetherBtn')) : null;
  const form = h('form', { class: 'letter__form' },
    h('p', { class: 'field__label' }, lt('start')), starts,
    text,
    h('p', { class: 'field__label' }, lt('when')), chips, own,
    pair,
    h('button', { type: 'submit', class: 'btn btn--gold btn--block' }, lt('seal')),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const y = own.value ? Number(own.value) : years;
    const letter = compose(box.list(), { text: text.value, years: y, together });
    if (!letter) { text.focus(); return; }
    box.save(letter);
    open = false;
    toast({ title: lt('sealedToast', { date: fmt(letter.openAt) }) });
    rerender?.();
  });
  return form;
}

/** Карточка писем. box — { list, save, remove }; kid — детский вид; prompts — с чего начать. */
export function lettersCard(box, { rerender, kid = false, prompts = [] } = {}) {
  const list = box.list().sort((a, b) => a.openAt.localeCompare(b.openAt));
  const can = canWrite(list);
  return h('section', { class: 'card letters' },
    h('h2', { class: 'card__title' }, `💌 ${lt('title')}`),
    h('p', { class: 'card__text faint' }, lt(kid ? 'leadKid' : 'lead', { n: MAX_SEALED })),
    list.length ? h('ul', { class: 'letters__list' }, ...list.map((l) => envelope(box, l, { rerender, kid }))) : null,
    can
      ? (open ? composer(box, { rerender, kid, prompts: prompts.length ? prompts : lt('prompts').split('|') })
        : h('button', { type: 'button', class: 'btn btn--gold btn--block', onclick: () => { open = true; rerender?.(); } }, lt('write')))
      : h('p', { class: 'faint' }, lt('full', { n: MAX_SEALED })),
  );
}
