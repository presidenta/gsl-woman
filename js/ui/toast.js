import { h } from '../core/dom.js';

/* КОРОТКОЕ СООБЩЕНИЕ сверху экрана: «Сохранено», напоминание при открытом приложении.
   Исчезает само; нажатие закрывает сразу или выполняет действие (onClick). */

let host = null;

function ensureHost() {
  if (host && host.isConnected) return host;
  host = h('div', { class: 'toast-host', role: 'status', 'aria-live': 'polite' });
  document.body.append(host);
  return host;
}

export function toast({ title, text, onClick, ms = 3200 }) {
  const node = h('div', { class: 'toast' },
    title ? h('div', { class: 'toast__title' }, title) : null,
    text ? h('div', { class: 'toast__text' }, text) : null,
  );
  const hide = () => {
    node.classList.remove('is-shown');
    setTimeout(() => node.remove(), 320);
  };
  node.addEventListener('click', () => {
    onClick?.();
    hide();
  });
  ensureHost().append(node);
  requestAnimationFrame(() => node.classList.add('is-shown'));
  setTimeout(hide, ms);
}
