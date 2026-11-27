import { h, add } from '../../core/dom.js';
import * as people from '../../charts/people.js';
import * as anketa from '../../anketa/data.js';
import { pythagorasCard } from '../../charts/pythagoras/view.js';
import { matrixCard, pairCard } from '../../charts/matrix/view.js';
import { hdCard, pairHdCard } from '../../charts/hd/view.js';
import { pairPythCard } from '../../charts/pythagoras/view.js';
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

/* ЭКРАН «КАРТЫ РОЖДЕНИЯ» (#/charts) — отдельный раздел, не анкета (владелец 26.11.2026). Наверху — люди: «Я» (данные
   рождения из анкеты), партнёр, партнёры по бизнесу, дети, родные — сколько нужно; ниже — расчёты выбранного: над каждым
   — по каким данным считали. Часовой пояс у добавленных — список поясов браузера (по умолчанию свой). */
let selected = 'me';

function me(S) {
  return { id: 'me', name: S.me, date: anketa.get('birth.date') || '', time: anketa.get('birth.time') || '', city: anketa.get('birth.city') || null };
}

function addForm(ctx, S) {
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Europe/Kyiv'];
  const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const name = h('input', { class: 'input', placeholder: S.name, maxlength: '40' });
  const role = h('select', { class: 'input' }, ...people.ROLES.map((k) => h('option', { value: k }, S.roles[k])));
  const date = h('input', { class: 'input', type: 'date' });
  const time = h('input', { class: 'input', type: 'time' });
  const city = h('input', { class: 'input', placeholder: S.city, maxlength: '80' });
  const tz = h('select', { class: 'input' }, ...zones.map((z) => h('option', { value: z, selected: z === here }, z)));
  const save = h('button', { type: 'button', class: 'btn btn--gold' }, S.addBtn);
  save.addEventListener('click', () => {
    if (!date.value) { date.focus(); return; }
    const p = people.add({ name: name.value, noName: S.noName, role: role.value, date: date.value, time: time.value, city: { text: city.value.trim(), tz: tz.value } });
    selected = p.id;
    ctx.rerender();
  });
  return h('details', { class: 'help__folder' },
    h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, S.add)),
    h('div', { class: 'help__folder-body charts__form' }, name, role,
      h('label', { class: 'field__label' }, S.date), date,
      h('label', { class: 'field__label' }, S.time), time,
      city, h('label', { class: 'field__label' }, S.tz), tz, save));
}

export function render(view, ctx) {
  const S = STX();
  const mine = me(S);
  const all = [mine, ...people.list()];
  const cur = all.find((p) => p.id === selected) || all[0];
  const cap = S.calcBy + people.dataLine(cur, S.noDate);
  const pairCap = `${S.calcBy}${people.dataLine(mine, S.noDate)} + ${people.dataLine(cur, S.noDate)}`;
  const withWho = S.with[cur.role] || S.with.other;
  add(view,
    h('h1', { class: 'screen-title' }, S.title),
    h('p', { class: 'caps charts__sub' }, S.sub),
    h('p', { class: 'help__intro' }, S.intro),
    h('section', { class: 'card charts__people' },
      // «Я» и разделы: Пара, Друзья, Бизнес, Родные, Дети, Другие — у каждого раздела свои люди
      ...['me', ...people.ROLES].map((g) => {
        const list = g === 'me' ? [all[0]] : all.filter((p) => p.id !== 'me' && (p.role || 'other') === g);
        if (!list.length) return null;
        return h('div', { class: 'charts__group' },
          g === 'me' ? null : h('p', { class: 'caps charts__group-title' }, S.groups[g]),
          h('div', { class: 'anketa-chips' }, ...list.map((p) => h('button', {
            type: 'button', class: 'anketa-chip', 'aria-pressed': String(p.id === cur.id),
            onclick: () => { selected = p.id; ctx.rerender(); },
          }, p.id === 'me' ? S.me : p.name))));
      }),
      cur.id === 'me' && !cur.date ? h('p', { class: 'faint' }, h('a', { href: '#/settings' }, S.enterData), S.enterDataTail) : null,
      cur.id !== 'me' ? h('button', { type: 'button', class: 'link-btn', onclick: () => { if (confirm(S.removeAsk.replace('{name}', cur.name))) { people.remove(cur.id); selected = 'me'; ctx.rerender(); } } }, S.remove) : null,
      addForm(ctx, S)),
    ...(cur.date ? [
      fold('pyth', icons.check, pythagorasCard(cur.date, cap)),
      fold('matrix', icons.sparkle, matrixCard(cur.date, cap)),
      fold('hd', icons.crown, hdCard({ date: cur.date, time: cur.time, city: cur.city, caption: cap })),
      // совместимость «я + выбранный» — только по датам, считается на телефоне
      // Пара — три карты (владелец 27.11.2026): Пифагор, Матрица, Human Design
      cur.id !== 'me' && mine.date ? fold('pairPyth', icons.heart, pairPythCard(mine.date, cur.date, pairCap), `${S.pairPyth} ${withWho}`) : null,
      cur.id !== 'me' && mine.date ? fold('pairHd', icons.heart, pairHdCard(mine, cur, pairCap), `${S.pairHd} ${withWho}`) : null,
      cur.id !== 'me' && mine.date ? fold('pair', icons.heart, pairCard(mine.date, cur.date, pairCap), `${S.pairMatrix} ${withWho}`) : null,
    ] : []),
  );
}
