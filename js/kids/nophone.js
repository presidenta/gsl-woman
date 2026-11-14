import { h, mount } from '../core/dom.js';
import { read, write, remove } from '../core/store.js';
import { kt } from './texts.js';

/* «ИГРАЕМ ВЖИВУЮ» — ТЕЛЕФОН ОТДЫХАЕТ (владелец 14.11.2026: «открыть телефон, начать игру — и телефон закрыт, программа
   отслеживает, что пока играют, телефон никто не открывает; кроме звонков»; главная цель — снизить зависимость от
   телефона и дать ребёнку живое общение).

   Что умеет сайт: экран с таймером на весь телефон, экран горит сам (Wake Lock), а уход из приложения — в другое
   приложение, на главный экран, выключение экрана — приложение замечает и считает: «телефон брали». Вернулся — та
   же игра идёт дальше. Звонки работают как обычно. Совсем закрыть телефон на время игры (закрепление экрана Android)
   — следующий шаг в Android-приложении (native/), сайт этого может только честно посчитать.

   Игра на телефоне — ключ kid-play { game, title, icon, friends, startedAt, opens, awayMs, leftAt }: перезапуск
   страницы посреди игры возвращает таймер. Конец игры — дело ребёнка (deed type game) для подтверждения родителем. */

const KEY = 'kid-play';
const MIN_AWAY_MS = 1500;

let lock = null;
let tickTimer = null;
let listening = false;

export const current = () => read(KEY, null);

async function keepAwake() {
  try {
    lock = await navigator.wakeLock?.request('screen');
  } catch {
    lock = null; // экран погаснет сам — уход всё равно посчитается
  }
}

function onVisibility() {
  const p = current();
  if (!p) return;
  const now = Date.now();
  if (document.visibilityState === 'hidden') {
    if (!p.leftAt) write(KEY, { ...p, leftAt: now });
    return;
  }
  if (p.leftAt) {
    const away = now - p.leftAt;
    const counted = away >= MIN_AWAY_MS;
    write(KEY, { ...p, leftAt: null, awayMs: (p.awayMs || 0) + away, opens: (p.opens || 0) + (counted ? 1 : 0), backAt: counted ? now : p.backAt });
  }
  keepAwake();
}

function listen() {
  if (listening) return;
  listening = true;
  document.addEventListener('visibilitychange', onVisibility);
}

/** Начать игру: { game, title, icon, friends }. */
export function begin(game) {
  write(KEY, { ...game, startedAt: Date.now(), opens: 0, awayMs: 0, leftAt: null });
  listen();
  keepAwake();
}

/** Закончить: вернуть итог { minutes, opens, ... } и убрать игру с телефона. */
export function finish() {
  const p = current();
  if (!p) return null;
  remove(KEY);
  try { lock?.release(); } catch { /* уже отпущен */ }
  lock = null;
  const minutes = Math.max(1, Math.round((Date.now() - p.startedAt) / 60000));
  return { ...p, minutes, opens: p.opens || 0 };
}

const two = (n) => String(n).padStart(2, '0');
function clock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  return hh ? `${hh}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}` : `${two(Math.floor(s / 60))}:${two(s % 60)}`;
}

/** Экран игры на весь телефон. onFinish(итог) — после «Игра окончена». */
export function render(root, onFinish) {
  listen();
  keepAwake();
  const p = current();
  const time = h('p', { class: 'kid-play__clock' }, clock(Date.now() - p.startedAt));
  const opens = h('p', { class: 'kid-play__opens' });
  const back = h('p', { class: 'kid-play__back' }, kt('play.back'));
  const paint = () => {
    const now = current();
    if (!now) return;
    time.textContent = clock(Date.now() - now.startedAt);
    opens.textContent = now.opens ? kt('play.opens', { n: now.opens }) : kt('play.clean');
    opens.classList.toggle('is-clean', !now.opens);
    back.hidden = !(now.backAt && Date.now() - now.backAt < 8000);
  };
  clearInterval(tickTimer);
  tickTimer = setInterval(paint, 1000);
  paint();
  mount(root, h('main', { class: 'kid-play' },
    h('div', { class: 'kid-play__icon', 'aria-hidden': 'true' }, p.icon || '🎲'),
    h('h1', { class: 'kid-play__title' }, p.title),
    p.friends?.length ? h('p', { class: 'kid-play__friends' }, p.friends.join(' · ')) : null,
    time,
    opens,
    back,
    h('p', { class: 'kid-play__lead' }, kt('play.lead')),
    h('button', {
      type: 'button', class: 'btn btn--gold btn--block kid-play__finish',
      onclick: () => {
        if (!confirm(kt('play.finishAsk'))) return;
        clearInterval(tickTimer);
        onFinish(finish());
      },
    }, kt('play.finish')),
  ));
}
