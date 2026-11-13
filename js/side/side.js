import { read, write } from '../core/store.js';
import { setSide } from '../core/i18n.js';

/* ЧАСТЬ ПРИЛОЖЕНИЯ — женская или мужская (владелец 13.11.2026: «одно приложение, в котором сразу два — женское и
   мужское; в зависимости от пола при входе открывается либо одна часть, либо другая»).

   Пол хранится на сервере в учётной записи (миграция 024 в planner) и приходит в сессию (account/session.js →
   gender). Отсюда остальное приложение узнаёт только одно — какая часть сейчас открыта, и берёт её свойства:
   адрес на сервере, оформление (styles/side-man.css) и тексты (js/texts/woman, js/texts/man).

   Последняя часть запоминается на телефоне (ключ side): экран входа и первая отрисовка (early.js) сразу в своём
   цвете, ещё до связи с сервером. */

export const SIDES = {
  woman: { key: 'woman', gender: 'female', api: '/api/woman', theme: '#150c11' },
  man: { key: 'man', gender: 'male', api: '/api/men', theme: '#0a0a0d' },
};

const KEY = 'side';

let current = SIDES[read(KEY, null)] ? read(KEY, null) : null;

/** female → woman, male → man, иначе null. */
export const sideOfGender = (gender) => Object.values(SIDES).find((s) => s.gender === gender)?.key || null;

/* Часть по сессии. Сессия старше этой сборки (поля gender нет совсем) — женская: до GSL (W+M)⁺ приложение было
   только женским; сервер при следующей сверке пришлёт настоящий пол. gender: null — пол ещё не выбран. */
export function ofSession(session) {
  if (!session) return null;
  if (!('gender' in session)) return 'woman';
  return sideOfGender(session.gender);
}

/** Пол ещё не выбран — до приложения нужен экран «Кто ты?» (screens/gender/). */
export const needsChoice = (session) => !!session && ofSession(session) === null;

/** Открытая часть: woman | man; неизвестна — null. */
export const get = () => current;

/** Адрес своей части на сервере: /api/woman или /api/men. Неизвестна — женская (так было всегда). */
export const api = () => SIDES[current || 'woman'].api;

/** Ключ для «чьи данные на этом телефоне» (sync/): у женской — как раньше, просто кабинет. */
export const ownerKey = (userId) => (current === 'man' ? `${userId}:man` : userId);

/** Оформление и тексты своей части. Без страницы (проверки) — только тексты. */
export function apply(side = current) {
  const s = SIDES[side] || SIDES.woman;
  setSide(s.key);
  const root = globalThis.document?.documentElement;
  if (!root) return;
  if (s.key === 'man') root.dataset.side = 'man';
  else delete root.dataset.side;
  root.ownerDocument.querySelector('meta[name="theme-color"]')?.setAttribute('content', s.theme);
}

/** Сверить часть с сессией (каждая отрисовка). Вернёт true, если часть сменилась. Пол неизвестен — оформление
    последней части на телефоне. */
export function follow(session) {
  const next = ofSession(session);
  const changed = !!next && next !== current;
  if (changed) {
    current = next;
    write(KEY, next);
  }
  apply(next || current);
  return changed;
}

/** Для проверок: поставить часть без сессии. */
export function _use(side) {
  current = side;
  apply(side);
}
