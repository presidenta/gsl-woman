import { h, add } from '../../core/dom.js';
import * as people from '../../charts/people.js';
import * as anketa from '../../anketa/data.js';
import { pythagorasCard, pairPythCard } from '../../charts/pythagoras/view.js';
import { matrixCard, pairCard } from '../../charts/matrix/view.js';
import { hdCard, pairHdCard } from '../../charts/hd/view.js';
import { platePanel } from '../../ui/plate.js';
import { icons } from '../../ui/icons.js';
import { STX } from './texts.js'; // надписи на трёх языках (218)

/* Каждая карта — плашкой со стрелкой (владелец 27.11.2026: «три раздела, каждый открыть по потребности»): заголовок карточки
   становится названием плашки, остальное — внутри. Раскрытые помнятся между перерисовками. */
const opened = new Set();
function fold(id, icon, card, rename = null) {
  if (!card) return null;
  const title = card.querySelector('.card__title');
  const name = rename || title?.textContent || '';
  title?.remove();
  const node = platePanel({ icon, title: name, body: [...card.childNodes], open: opened.has(id) });
  node.addEventListener('toggle', () => (node.open ? opened.add(id) : opened.delete(id)));
  return node;
}

/* ЭКРАН «РАЗБОР ПО ДАТЕ РОЖДЕНИЯ» (#/charts) — отдельный раздел, не анкета (владелец 26.11.2026).
   Микроархитектура (владелец 27.11.2026): папки-разделы — Пара, Друзья, Бизнес, Родные, Дети, Другие; в папке — люди
   (имя и дата рождения) и «＋ Добавить»; нажали на человека — открывается полный разбор: три его карты и три карты
   союза с рисунком (квадрат, матрица, бодиграф двоих). У каждого человека — крестик с подтверждением удаления.
   selected: null — список разделов; 'me' или id — разбор человека. */
let selected = null;
const GROUP_ICONS = { partner: icons.heart, friend: icons.chats, business: icons.goals, family: icons.home, child: icons.sun, other: icons.sparkle };

function me(S) {
  return { id: 'me', name: S.me, date: anketa.get('birth.date') || '', time: anketa.get('birth.time') || '', city: anketa.get('birth.city') || null };
}

const go = (ctx, id) => { selected = id; ctx.rerender(); window.scrollTo?.(0, 0); };

function askRemove(ctx, S, p) {
  if (!confirm(S.removeAsk.replace('{name}', p.name))) return;
  people.remove(p.id);
  go(ctx, null);
}

const delBtn = (ctx, S, p) => h('button', { type: 'button', class: 'charts__del', 'aria-label': S.remove, title: S.remove, onclick: () => askRemove(ctx, S, p) }, '✕');

/** Строка человека: имя и дата — открыть разбор; крестик — удалить (с подтверждением). */
function personRow(ctx, S, p) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.date || '');
  return h('div', { class: 'charts__person' },
    h('button', { type: 'button', class: 'charts__open', onclick: () => go(ctx, p.id) },
      h('b', {}, p.id === 'me' ? S.me : p.name), h('span', { class: 'faint' }, d ? `${d[3]}.${d[2]}.${d[1]}` : S.noDate)),
    p.id === 'me' ? null : delBtn(ctx, S, p));
}

/** Добавление в раздел: роль человека = раздел, где нажали «＋ Добавить». */
function addForm(ctx, S, role) {
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Europe/Kyiv'];
  const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const name = h('input', { class: 'input', placeholder: S.name, maxlength: '40' });
  const date = h('input', { class: 'input', type: 'date' });
  const time = h('input', { class: 'input', type: 'time' });
  const city = h('input', { class: 'input', placeholder: S.city, maxlength: '80' });
  const tz = h('select', { class: 'input' }, ...zones.map((z) => h('option', { value: z, selected: z === here }, z)));
  const save = h('button', { type: 'button', class: 'btn btn--gold' }, S.addBtn);
  save.addEventListener('click', () => {
    if (!date.value) { date.focus(); return; }
    const p = people.add({ name: name.value, noName: S.noName, role, date: date.value, time: time.value, city: { text: city.value.trim(), tz: tz.value } });
    go(ctx, p.id);
  });
  return h('details', { class: 'help__folder' },
    h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, S.add)),
    h('div', { class: 'help__folder-body charts__form' }, name,
      h('label', { class: 'field__label' }, S.date), date,
      h('label', { class: 'field__label' }, S.time), time,
      city, h('label', { class: 'field__label' }, S.tz), tz, save));
}

/** Список: «Я» и шесть папок-разделов с людьми. */
function listView(view, ctx, S, mine) {
  const all = people.list();
  add(view,
    h('h1', { class: 'screen-title' }, S.title),
    h('p', { class: 'caps charts__sub' }, S.sub),
    h('p', { class: 'help__intro' }, S.intro),
    h('section', { class: 'card charts__people' }, personRow(ctx, S, mine)),
    ...people.ROLES.map((g) => {
      const list = all.filter((p) => (p.role || 'other') === g);
      const node = platePanel({
        icon: GROUP_ICONS[g], title: S.groups[g], chip: list.length ? String(list.length) : null, open: opened.has(`g-${g}`),
        body: [...(list.length ? list.map((p) => personRow(ctx, S, p)) : [h('p', { class: 'faint' }, S.empty)]), addForm(ctx, S, g)],
      });
      node.addEventListener('toggle', () => (node.open ? opened.add(`g-${g}`) : opened.delete(`g-${g}`)));
      return node;
    }));
}

/** Разбор одного человека: его три карты и, если это не «я», три карты союза. */
function personView(view, ctx, S, mine, cur) {
  const cap = S.calcBy + people.dataLine(cur, S.noDate);
  const pairCap = `${S.calcBy}${people.dataLine(mine, S.noDate)} + ${people.dataLine(cur, S.noDate)}`;
  const withWho = S.with[cur.role] || S.with.other;
  const isMe = cur.id === 'me';
  const pair = !isMe && mine.date;
  add(view,
    h('button', { type: 'button', class: 'link-btn charts__back', onclick: () => go(ctx, null) }, S.back),
    h('div', { class: 'charts__head' }, h('h1', { class: 'screen-title' }, isMe ? S.me : cur.name), isMe ? null : delBtn(ctx, S, cur)),
    h('p', { class: 'caps charts__sub' }, isMe ? S.sub : S.groups[cur.role] || S.groups.other),
    // своих данных нет — ни своих карт, ни карт союза: ссылка в настройки
    !mine.date ? h('p', { class: 'faint' }, h('a', { href: '#/settings' }, S.enterData), S.enterDataTail) : null,
    ...(cur.date ? [
      fold('pyth', icons.check, pythagorasCard(cur.date, cap)),
      fold('matrix', icons.sparkle, matrixCard(cur.date, cap)),
      fold('hd', icons.crown, hdCard({ date: cur.date, time: cur.time, city: cur.city, caption: cap })),
      // Союз двоих — три карты, у каждой рисунок того, что получилось вместе (владелец 27.11.2026)
      pair ? fold('pairPyth', icons.heart, pairPythCard(mine.date, cur.date, pairCap, [S.me, cur.name]), `${S.pairPyth} ${withWho}`) : null,
      pair ? fold('pair', icons.heart, pairCard(mine.date, cur.date, pairCap), `${S.pairMatrix} ${withWho}`) : null,
      pair ? fold('pairHd', icons.heart, pairHdCard(mine, cur, pairCap), `${S.pairHd} ${withWho}`) : null,
    ] : []));
}

export function render(view, ctx) {
  const S = STX();
  const mine = me(S);
  const cur = selected === 'me' ? mine : people.list().find((p) => p.id === selected);
  if (!cur) { selected = null; listView(view, ctx, S, mine); return; }
  personView(view, ctx, S, mine, cur);
}
