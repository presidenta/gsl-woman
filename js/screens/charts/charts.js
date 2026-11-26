import { h, add } from '../../core/dom.js';
import * as people from '../../charts/people.js';
import * as anketa from '../../anketa/data.js';
import { pythagorasCard } from '../../charts/pythagoras/view.js';
import { matrixCard, pairCard } from '../../charts/matrix/view.js';
import { hdCard, pairHdCard } from '../../charts/hd/view.js';
import { pairPythCard } from '../../charts/pythagoras/view.js';
import { platePanel } from '../../ui/plate.js';
import { icons } from '../../ui/icons.js';

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

function me() {
  return { id: 'me', name: 'Я', date: anketa.get('birth.date') || '', time: anketa.get('birth.time') || '', city: anketa.get('birth.city') || null };
}

function addForm(ctx) {
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Europe/Kyiv'];
  const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const name = h('input', { class: 'input', placeholder: 'Имя', maxlength: '40' });
  const role = h('select', { class: 'input' }, ...Object.entries(people.ROLES).map(([k, v]) => h('option', { value: k }, v)));
  const date = h('input', { class: 'input', type: 'date' });
  const time = h('input', { class: 'input', type: 'time' });
  const city = h('input', { class: 'input', placeholder: 'Город рождения', maxlength: '80' });
  const tz = h('select', { class: 'input' }, ...zones.map((z) => h('option', { value: z, selected: z === here }, z)));
  const save = h('button', { type: 'button', class: 'btn btn--gold' }, 'Добавить и рассчитать');
  save.addEventListener('click', () => {
    if (!date.value) { date.focus(); return; }
    const p = people.add({ name: name.value, role: role.value, date: date.value, time: time.value, city: { text: city.value.trim(), tz: tz.value } });
    selected = p.id;
    ctx.rerender();
  });
  return h('details', { class: 'help__folder' },
    h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, '＋ Добавить человека')),
    h('div', { class: 'help__folder-body charts__form' }, name, role,
      h('label', { class: 'field__label' }, 'Дата рождения'), date,
      h('label', { class: 'field__label' }, 'Время рождения (для Human Design)'), time,
      city, h('label', { class: 'field__label' }, 'Часовой пояс города'), tz, save));
}

export function render(view, ctx) {
  const all = [me(), ...people.list()];
  const cur = all.find((p) => p.id === selected) || all[0];
  const cap = people.caption(cur);
  add(view,
    h('h1', { class: 'screen-title' }, 'Разбор по дате рождения'),
    h('p', { class: 'caps charts__sub' }, 'Твоя роль в паре и в жизни'),
    h('p', { class: 'help__intro' }, 'Квадрат Пифагора, Матрица судьбы (Ладини), Human Design. «Я» — данные из анкеты; добавь партнёра, партнёров по бизнесу, детей — расчёты сохраняются.'),
    h('section', { class: 'card charts__people' },
      // «Я» и разделы: Пара, Друзья, Бизнес, Родные, Дети, Другие — у каждого раздела свои люди
      ...[['me', null], ...Object.entries(people.GROUPS)].map(([g, label]) => {
        const list = g === 'me' ? [all[0]] : all.filter((p) => p.id !== 'me' && (p.role || 'other') === g);
        if (!list.length) return null;
        return h('div', { class: 'charts__group' },
          label ? h('p', { class: 'caps charts__group-title' }, label) : null,
          h('div', { class: 'anketa-chips' }, ...list.map((p) => h('button', {
            type: 'button', class: 'anketa-chip', 'aria-pressed': String(p.id === cur.id),
            onclick: () => { selected = p.id; ctx.rerender(); },
          }, p.id === 'me' ? 'Я' : p.name))));
      }),
      cur.id === 'me' && !cur.date ? h('p', { class: 'faint' }, h('a', { href: '#/settings' }, 'Внеси свои данные рождения в настройках'), ' («Про меня»).') : null,
      cur.id !== 'me' ? h('button', { type: 'button', class: 'link-btn', onclick: () => { if (confirm(`Убрать «${cur.name}»?`)) { people.remove(cur.id); selected = 'me'; ctx.rerender(); } } }, 'Убрать этого человека') : null,
      addForm(ctx)),
    ...(cur.date ? [
      fold('pyth', icons.check, pythagorasCard(cur.date, cap)),
      fold('matrix', icons.sparkle, matrixCard(cur.date, cap)),
      fold('hd', icons.crown, hdCard({ date: cur.date, time: cur.time, city: cur.city, caption: cap })),
      // совместимость «я + выбранный» — только по датам, считается на телефоне
      // Пара — три карты (владелец 27.11.2026): Пифагор, Матрица, Human Design
      cur.id !== 'me' && me().date ? fold('pairPyth', icons.heart, pairPythCard(me().date, cur.date, `${people.caption(me())} + ${people.caption(cur).replace('Считаем по данным: ', '')}`), `Квадрат Пифагора ${people.WITH[cur.role] || 'вместе'}`) : null,
      cur.id !== 'me' && me().date ? fold('pairHd', icons.heart, pairHdCard(me(), cur, `${people.caption(me())} + ${people.caption(cur).replace('Считаем по данным: ', '')}`), `Human Design ${people.WITH[cur.role] || 'вместе'}`) : null,
      cur.id !== 'me' && me().date ? fold('pair', icons.heart, pairCard(me().date, cur.date, `${people.caption(me())} + ${people.caption(cur).replace('Считаем по данным: ', '')}`), `Матрица судьбы ${people.WITH[cur.role] || 'вместе'}`) : null,
    ] : []),
  );
}
