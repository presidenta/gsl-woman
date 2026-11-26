import { h, add } from '../../core/dom.js';
import * as people from '../../charts/people.js';
import * as anketa from '../../anketa/data.js';
import { pythagorasCard } from '../../charts/pythagoras/view.js';
import { matrixCard, pairCard } from '../../charts/matrix/view.js';
import { hdCard } from '../../charts/hd/view.js';

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
    h('h1', { class: 'screen-title' }, 'Карты рождения'),
    h('p', { class: 'help__intro' }, 'Квадрат Пифагора, Матрица судьбы (Ладини), Human Design. «Я» — данные из анкеты; добавь партнёра, партнёров по бизнесу, детей — расчёты сохраняются.'),
    h('section', { class: 'card charts__people' },
      h('div', { class: 'anketa-chips' }, ...all.map((p) => h('button', {
        type: 'button', class: 'anketa-chip', 'aria-pressed': String(p.id === cur.id),
        onclick: () => { selected = p.id; ctx.rerender(); },
      }, p.id === 'me' ? 'Я' : `${p.name} · ${people.ROLES[p.role]}`))),
      cur.id === 'me' && !cur.date ? h('p', { class: 'faint' }, h('a', { href: '#/anketa' }, 'Внеси свои данные рождения в анкете'), ' (блок «Данные для расчёта карт»).') : null,
      cur.id !== 'me' ? h('button', { type: 'button', class: 'link-btn', onclick: () => { if (confirm(`Убрать «${cur.name}»?`)) { people.remove(cur.id); selected = 'me'; ctx.rerender(); } } }, 'Убрать этого человека') : null,
      addForm(ctx)),
    ...(cur.date ? [
      pythagorasCard(cur.date, cap),
      matrixCard(cur.date, cap),
      hdCard({ date: cur.date, time: cur.time, city: cur.city, caption: cap }),
      // совместимость «я + выбранный» — только по датам, считается на телефоне
      cur.id !== 'me' && me().date ? pairCard(me().date, cur.date, `${people.caption(me())} + ${people.caption(cur).replace('Считаем по данным: ', '')}`) : null,
    ] : []),
  );
}
