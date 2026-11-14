import { h } from '../core/dom.js';
import { STAR_CHOICES, DEFAULT_STARS, TASK_IDEAS } from './catalog.js';
import { okMap } from './stars.js';
import { kt } from './texts.js';

/* ДЕЛА СЕМЬИ — В СЕМЕЙНОМ ЧАТЕ (владелец 14.11.2026: «мама или папа пишет задачи по дому или для семьи, каждый
   может выбрать себе задачу — нажимает кнопочку, и высвечивается, кто взял: папа, мама или ребёнок; задача имеет
   баллы — чтобы дети видели, что родители тоже что-то делают»).

   Дело — запись task { text, stars, by, at, takenBy, takenAt, doneAt, deed }. Звёзды: по умолчанию 1, родитель
   ставит больше за большое дело. Ребёнок может сам предложить дело — звёзды тогда решит родитель при подтверждении.
   Сделал взрослый — звёзды сразу; сделал ребёнок — кладёт дело (deed), родитель подтверждает (ok).

   api — общий для кабинета родителя и телефона ребёнка: { circle, me, role, items, put, newId, name }. */

export const TASK_ICON = '🧹';

const roleOf = (api, id) => api.circle?.members?.find((m) => m.id === id)?.role || null;

/** Строка «сколько звёзд»: выбор из ряда, по умолчанию 1. */
export function starPicker(value, onPick) {
  let current = value ?? DEFAULT_STARS;
  const row = h('div', { class: 'kid-stars-pick', role: 'radiogroup', 'aria-label': kt('stars.pick') });
  const paint = () => {
    for (const b of row.children) b.setAttribute('aria-checked', String(Number(b.dataset.n) === current));
  };
  for (const n of STAR_CHOICES) {
    row.append(h('button', {
      type: 'button', class: 'kid-stars-pick__n', role: 'radio', dataset: { n: String(n) },
      onclick: () => { current = n; paint(); onPick?.(n); },
    }, `⭐ ${n}`));
  }
  paint();
  return { node: row, value: () => current };
}

/** Подтверждение родителя под делом ребёнка: звёзды и «Получилось» или «Потренируемся ещё». */
export function confirmBox(api, deedId, stars = DEFAULT_STARS) {
  const pick = starPicker(stars);
  const ok = (again) => api.put('ok', deedId, { stars: again ? 0 : pick.value(), again: !!again, at: new Date().toISOString(), by: api.me });
  return h('div', { class: 'kid-confirm' },
    pick.node,
    h('div', { class: 'kid-confirm__actions' },
      h('button', { type: 'button', class: 'btn btn--gold', onclick: () => ok(false) }, kt('confirm.yes')),
      h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => ok(true) }, kt('confirm.again')),
    ),
  );
}

/** Карточка дела в ленте чата. */
export function taskCard(api, task) {
  const d = task.data || {};
  const oks = okMap(api.items('ok'));
  const taker = d.takenBy ? api.name(d.takenBy) : '';
  const mine = d.takenBy === api.me;
  const childDone = d.doneAt && d.deed;
  const confirmed = childDone ? oks.get(d.deed) : null;
  const update = (patch) => api.put('task', task.id, { ...d, ...patch });

  let state;
  if (!d.takenBy) {
    state = h('button', { type: 'button', class: 'btn btn--gold kid-task__take', onclick: () => update({ takenBy: api.me, takenAt: new Date().toISOString() }) }, kt('task.take'));
  } else if (!d.doneAt) {
    state = h('div', { class: 'kid-task__row' },
      h('span', { class: 'kid-task__who' }, kt('task.takenBy', { name: taker })),
      mine ? h('button', {
        type: 'button', class: 'btn btn--gold',
        onclick: () => {
          const at = new Date().toISOString();
          if (api.role === 'child') {
            const deed = api.newId('d');
            api.put('deed', deed, { type: 'task', ref: task.id, text: d.text, at, stars: d.stars ?? null });
            update({ doneAt: at, deed });
          } else update({ doneAt: at });
        },
      }, kt('task.done')) : null,
      mine ? h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => update({ takenBy: null, takenAt: null }) }, kt('task.giveBack')) : null,
    );
  } else if (childDone && !confirmed) {
    state = h('div', {},
      h('p', { class: 'kid-task__who' }, kt('task.waiting', { name: taker })),
      api.role === 'parent' ? confirmBox(api, d.deed, d.stars ?? DEFAULT_STARS) : null,
    );
  } else {
    const got = childDone ? (confirmed.data.again ? 0 : confirmed.data.stars) : Math.max(1, Number(d.stars) || DEFAULT_STARS);
    state = h('p', { class: 'kid-task__done' }, childDone && confirmed.data.again
      ? kt('task.again', { name: taker })
      : kt('task.doneBy', { name: taker, stars: got }));
  }

  return h('li', { class: `chat__msg kid-task${d.doneAt ? ' is-done' : ''}${roleOf(api, d.takenBy) === 'child' ? ' is-child' : ''}` },
    h('span', { class: 'chat__who' }, kt('task.from', { name: api.name(d.by || task.author) })),
    h('p', { class: 'kid-task__text' }, `${TASK_ICON} ${d.text}`),
    h('span', { class: 'kid-task__stars' }, d.stars ? `⭐ ${d.stars}` : kt('task.starsByParent')),
    state,
  );
}

/** Форма нового дела над полем чата: текст, готовые идеи, звёзды (у ребёнка — «предложить», звёзды решит родитель). */
export function taskComposer(api, onDone) {
  const child = api.role === 'child';
  const input = h('input', { class: 'input', maxlength: '120', placeholder: kt('task.ph'), 'aria-label': kt('task.ph') });
  const pick = child ? null : starPicker(DEFAULT_STARS);
  const ideas = h('div', { class: 'kid-chips' }, ...TASK_IDEAS.map((idea) =>
    h('button', { type: 'button', class: 'kid-chip', onclick: () => { input.value = idea; input.focus(); } }, idea)));
  const form = h('form', { class: 'kid-task-new' },
    h('p', { class: 'field__label' }, child ? kt('task.propose') : kt('task.new')),
    ideas,
    input,
    pick ? h('p', { class: 'field__hint' }, kt('task.starsHint')) : h('p', { class: 'field__hint' }, kt('task.proposeHint')),
    pick?.node,
    h('button', { type: 'submit', class: 'btn btn--gold btn--block' }, child ? kt('task.proposeBtn') : kt('task.add')),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim().slice(0, 120);
    if (!text) return;
    api.put('task', api.newId('t'), { text, stars: pick ? pick.value() : null, by: api.me, at: new Date().toISOString(), takenBy: null, doneAt: null });
    onDone?.();
  });
  return form;
}
