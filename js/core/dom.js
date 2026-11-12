/* ПОМОЩНИК РАЗМЕТКИ: h('div', { class: 'card' }, 'текст', ребёнок…).

   Текст всегда вставляется как текст (textContent), никогда как HTML: в записи женщина пишет что угодно,
   и её слова не должны превращаться в разметку. Разметку как HTML принимает только svg() — для
   собственных значков приложения из js/ui/icons.js. */

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (key === 'value') el.value = value;
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Значок из своей SVG-строки (только из icons.js — не из пользовательского текста). */
export function svg(markup, className = '') {
  const wrap = document.createElement('span');
  wrap.className = className;
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = markup;
  return wrap;
}

/** Очистить контейнер и положить новое содержимое. */
/** Добавить в конец, пропуская пустое (null, undefined, false). Обычный el.append(null) печатает слово «null» —
    так 12.11.2026 на телефоне под карточкой аккаунта вылезло «null» вместо скрытой карточки «Значок на экран». */
export function add(el, ...children) {
  append(el, children);
}

export function mount(container, ...children) {
  container.replaceChildren();
  append(container, children);
}
