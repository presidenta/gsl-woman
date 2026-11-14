import { h } from '../core/dom.js';
import { GAMES, GAME_BY_ID } from './catalog.js';
import { kt } from './texts.js';

/* СПИСОК ЖИВЫХ ИГР РЕБЁНКА — ПРАВИТСЯ В САМОМ ПРИЛОЖЕНИИ (владелец 14.11.2026: «плюсик и минус: игра не нравится —
   нажал минус, и она удалилась; можно записать любую игру, какая нравится; и родитель может вписывать игры, которые
   ребёнок может выбирать, играть и зарабатывать звёздочки»).

   Список ребёнка = свои игры (добавил ребёнок или родитель) + общий каталог (catalog.js) без убранных.
   Записи семьи:
     kgame — своя игра: { member, title, icon, rules, players, place, by, at } — «−» убирает её совсем;
     khide — игра каталога убрана из списка ребёнка: id «ребёнок.игра», { member, game, by, at } — «Вернуть» снимает.
   Править может и ребёнок (свой список), и родитель (список любого ребёнка семьи). api — как у дел семьи. */

const short = (id) => String(id || '').replace(/-/g, '').slice(0, 8);
const hideId = (member, game) => `${short(member)}.${game}`;

export function customGames(api, member) {
  return api.items('kgame').filter((x) => x.data.member === member).map((x) => ({
    id: x.id, title: x.data.title, icon: x.data.icon || '🎲', rules: x.data.rules || '', players: x.data.players || '',
    place: x.data.place || '', need: '', grows: [], custom: true, by: x.data.by || x.author,
  }));
}

export function hiddenIds(api, member) {
  return new Set(api.items('khide').filter((x) => x.data.member === member).map((x) => x.data.game));
}

/** Игры в списке ребёнка: сначала свои, потом каталог без убранных. */
export function gamesFor(api, member) {
  const hidden = hiddenIds(api, member);
  return [...customGames(api, member), ...GAMES.filter((g) => !hidden.has(g.id))];
}

/** Убранные игры каталога (их можно вернуть). */
export function hiddenGames(api, member) {
  const hidden = hiddenIds(api, member);
  return GAMES.filter((g) => hidden.has(g.id));
}

export function gameById(api, id) {
  return GAME_BY_ID[id] || api.items('kgame').filter((x) => x.id === id).map((x) => ({ id: x.id, title: x.data.title, icon: x.data.icon || '🎲' }))[0] || null;
}

/** «−»: своя игра — убрать совсем; игра каталога — убрать из списка ребёнка. */
export function removeGame(api, member, game) {
  if (game.custom) api.drop('kgame', game.id);
  else api.put('khide', hideId(member, game.id), { member, game: game.id, by: api.me, at: new Date().toISOString() });
}

export function restoreGame(api, member, gameId) {
  api.drop('khide', hideId(member, gameId));
}

export const GAME_ICONS = ['🎲', '⚽', '🏃', '🧩', '🎯', '🪁', '🏐', '🎨', '🃏', '🤸', '🧠', '🎵'];

/** Форма «＋ Добавить игру» — у ребёнка и у родителя одна и та же. */
export function gameForm(api, member, onDone) {
  let icon = GAME_ICONS[0];
  const title = h('input', { class: 'input', maxlength: '60', placeholder: kt('games.titlePh'), 'aria-label': kt('games.titlePh') });
  const rules = h('textarea', { class: 'textarea', rows: '3', maxlength: '600', placeholder: kt('games.rulesPh'), 'aria-label': kt('games.rulesPh') });
  const players = h('input', { class: 'input', maxlength: '20', placeholder: kt('games.playersPh'), 'aria-label': kt('games.playersPh') });
  const place = h('input', { class: 'input', maxlength: '30', placeholder: kt('games.placePh'), 'aria-label': kt('games.placePh') });
  const icons = h('div', { class: 'kid-chips', role: 'radiogroup', 'aria-label': kt('pot.icon') }, ...GAME_ICONS.map((i) => h('button', {
    type: 'button', class: `kid-chip kid-chip--icon${i === icon ? ' is-on' : ''}`, role: 'radio', 'aria-checked': String(i === icon),
    onclick: (e) => { icon = i; for (const b of icons.children) { b.classList.remove('is-on'); b.setAttribute('aria-checked', 'false'); } e.currentTarget.classList.add('is-on'); e.currentTarget.setAttribute('aria-checked', 'true'); },
  }, i)));
  const form = h('form', { class: 'kid-game-new' },
    h('p', { class: 'field__label' }, kt('games.addTitle')),
    title, icons, rules,
    h('div', { class: 'kid-game-new__row' }, players, place),
    h('button', { type: 'submit', class: 'btn btn--gold btn--block' }, kt('games.save')),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = title.value.trim().slice(0, 60);
    if (!name) { title.focus(); return; }
    api.put('kgame', api.newId('kg'), {
      member, title: name, icon, rules: rules.value.trim().slice(0, 600), players: players.value.trim().slice(0, 20),
      place: place.value.trim().slice(0, 30), by: api.me, at: new Date().toISOString(),
    });
    onDone?.();
  });
  return form;
}

/** Кнопка «−» в углу карточки игры. */
export function minusButton(api, member, game, after) {
  return h('button', {
    type: 'button', class: 'kid-minus', 'aria-label': kt('games.removeLabel', { title: game.title }), title: kt('games.removeLabel', { title: game.title }),
    onclick: () => {
      if (!confirm(game.custom ? kt('games.removeCustomAsk', { title: game.title }) : kt('games.removeAsk', { title: game.title }))) return;
      removeGame(api, member, game);
      after?.();
    },
  }, '−');
}

/** Убранные игры — внизу списка, с «Вернуть». */
export function hiddenBlock(api, member, after) {
  const list = hiddenGames(api, member);
  if (!list.length) return null;
  return h('details', { class: 'card kid-hidden' },
    h('summary', {}, kt('games.hidden', { n: list.length })),
    h('ul', { class: 'kid-rows' }, ...list.map((g) => h('li', { class: 'kid-row' },
      h('span', { class: 'kid-row__icon', 'aria-hidden': 'true' }, g.icon),
      h('span', { class: 'kid-row__title' }, g.title),
      h('button', { type: 'button', class: 'btn btn--ghost kid-row__btn', onclick: () => { restoreGame(api, member, g.id); after?.(); } }, kt('games.restore'))))),
  );
}
