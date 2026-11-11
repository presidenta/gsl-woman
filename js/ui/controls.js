import { h } from '../core/dom.js';

/* РЕГУЛИРОВКИ — готовые элементы с доступностью (роли, aria-checked, управление стрелками).
   Вид — в styles/components/controls.css. Экран передаёт значение и обработчик, элемент сам ведёт
   своё состояние и сообщает о выборе. */

/** Выбор одного варианта: [{ value, label }]. hints — подпись под выбранным (необязательно). */
export function segmented({ options, value, onChange, label, hints = null }) {
  let current = value;
  const hint = hints ? h('p', { class: 'segmented-hint' }) : null;
  const group = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': label });

  const buttons = options.map((opt) =>
    h('button', {
      type: 'button',
      class: 'segmented__option',
      role: 'radio',
      onclick: () => select(opt.value),
    }, opt.label),
  );

  function paint() {
    buttons.forEach((b, i) => {
      const on = options[i].value === current;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    if (hint) hint.textContent = hints[current] || '';
  }

  function select(next) {
    current = next;
    paint();
    onChange?.(next);
  }

  group.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === current);
    const step = e.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (i + step + options.length) % options.length;
    select(options[nextIndex].value);
    buttons[nextIndex].focus();
  });

  group.append(...buttons);
  paint();
  return hint ? h('div', {}, group, hint) : group;
}

/** Переключатель вкл/выкл со строкой текста. */
export function switchRow({ title, hint, checked, onChange }) {
  let on = !!checked;
  const id = 'sw-' + Math.random().toString(36).slice(2, 8);
  const sw = h('button', {
    type: 'button',
    class: 'switch',
    role: 'switch',
    'aria-checked': String(on),
    'aria-labelledby': id,
    onclick: () => {
      on = !on;
      sw.setAttribute('aria-checked', String(on));
      onChange?.(on);
    },
  });
  return h('div', { class: 'switch-row' },
    h('div', { class: 'switch-row__text' },
      h('div', { id, class: 'field__label' }, title),
      hint ? h('div', { class: 'field__hint' }, hint) : null,
    ),
    sw,
  );
}

/** Поле с подписью: input или textarea. */
export function field({ label, hint, multiline = false, ...attrs }) {
  const id = 'f-' + Math.random().toString(36).slice(2, 8);
  const control = h(multiline ? 'textarea' : 'input', {
    id,
    class: multiline ? 'textarea' : 'input',
    ...attrs,
  });
  const node = h('div', { class: 'field' },
    h('label', { class: 'field__label', for: id }, label),
    control,
    hint ? h('p', { class: 'field__hint' }, hint) : null,
  );
  return { node, control };
}

/** Список вариантов-карточек с одним выбором: [{ value, label }]. */
export function choiceList({ options, value, onChange, label }) {
  let current = value;
  const root = h('div', { class: 'choice-list', role: 'radiogroup', 'aria-label': label });
  const items = options.map((opt) =>
    h('button', { type: 'button', class: 'choice', role: 'radio', onclick: () => { current = opt.value; paint(); onChange?.(current); } },
      h('span', { class: 'choice__mark' }),
      h('span', { class: 'choice__text' }, opt.label),
    ),
  );
  function paint() {
    items.forEach((b, i) => b.setAttribute('aria-checked', String(options[i].value === current)));
  }
  root.append(...items);
  paint();
  return root;
}
