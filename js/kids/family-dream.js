import { h } from '../core/dom.js';
import { toast } from '../ui/toast.js';
import { kt } from './texts.js';
import { familyPot, activeDream } from './stars.js';
import { starPicker } from './tasks-view.js';
import { FAMILY_DREAM_IDEAS, FAMILY_DREAM_ICONS, POT_STOPS } from './dreams-catalog.js';

/* МЕЧТА НАШЕЙ СЕМЬИ — ОБЩИЙ КОТЁЛ ЗВЁЗД (владелец 14.11.2026: «мечта — поехать на отдых; каждый член семьи что-то
   делает, все вместе набирают звёздочки, чтобы побыстрее поехать; мама может оценить папу; брат и сестра — тоже
   в общий котёл; или купить домой телевизор — каждый делает свой вклад»).

   Как игра: дорога от дома к мечте, семья идёт по ней вместе; остановки на 25/50/75% — маленькие праздники; полоса
   вклада по цветам (видно, что делают и родители, и дети); «Сегодня в котёл: +N ⭐»; в конце — «Мечта собрана!»,
   родители отмечают «Исполнили», мечта уходит в «Сбывшиеся мечты семьи». Звёзды никто не тратит: котёл — сумма
   звёзд всей семьи с того дня, как мечту завели.

   Записи семьи: fdream { title, icon, target, startAt, by, status: active|done, doneAt } — заводят родители;
   award { to, stars, text, at, by } — «＋ Звезда» от родителя любому в семье (только родитель, сервер проверяет).

   api — кабинет родителя или телефон ребёнка (как у дел семьи). */

let formOpen = false;
let awardOpen = false;

const toneOf = (m) => (m.role === 'child' ? 'child' : m.side === 'man' ? 'man' : 'woman');

function dataOf(api) {
  return { deeds: api.items('deed'), oks: api.items('ok'), tasks: api.items('task'), awards: api.items('award') };
}

function newDreamForm(api, rerender) {
  let icon = FAMILY_DREAM_ICONS[0];
  const title = h('input', { class: 'input', maxlength: '80', placeholder: kt('pot.titlePh'), 'aria-label': kt('pot.titlePh') });
  const target = h('input', { class: 'input kid-pot__target', type: 'number', min: '10', max: '5000', step: '10', value: '200', 'aria-label': kt('pot.target') });
  const icons = h('div', { class: 'kid-chips', role: 'radiogroup', 'aria-label': kt('pot.icon') }, ...FAMILY_DREAM_ICONS.map((i) => h('button', {
    type: 'button', class: `kid-chip kid-chip--icon${i === icon ? ' is-on' : ''}`, role: 'radio', 'aria-checked': String(i === icon),
    onclick: (e) => { icon = i; for (const b of icons.children) { b.classList.remove('is-on'); b.setAttribute('aria-checked', 'false'); } e.currentTarget.classList.add('is-on'); e.currentTarget.setAttribute('aria-checked', 'true'); },
  }, i)));
  const ideas = h('div', { class: 'kid-chips' }, ...FAMILY_DREAM_IDEAS.map((idea) => h('button', {
    type: 'button', class: 'kid-chip',
    onclick: () => {
      title.value = idea.title;
      target.value = String(idea.target);
      icon = idea.icon;
      for (const b of icons.children) { const on = b.textContent === idea.icon; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', String(on)); }
    },
  }, `${idea.icon} ${idea.title} · ${idea.target} ⭐`)));
  const form = h('form', { class: 'kid-pot__form' },
    h('p', { class: 'field__label' }, kt('pot.ideas')), ideas,
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, kt('pot.titleLabel')), title),
    h('p', { class: 'field__label' }, kt('pot.icon')), icons,
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, kt('pot.target')), target),
    h('p', { class: 'field__hint' }, kt('pot.targetHint')),
    h('button', { type: 'submit', class: 'btn btn--gold btn--block' }, kt('pot.start')),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = title.value.trim().slice(0, 80);
    const n = Math.round(Number(target.value));
    if (!name || !(n >= 10)) return;
    api.put('fdream', api.newId('fd'), { title: name, icon, target: Math.min(5000, n), startAt: new Date().toISOString(), by: api.me, status: 'active' });
    formOpen = false;
    rerender?.();
  });
  return form;
}

function awardForm(api, rerender) {
  const members = (api.circle?.members || []);
  let to = members.find((m) => m.id !== api.me)?.id || api.me;
  const who = h('div', { class: 'kid-chips', role: 'radiogroup', 'aria-label': kt('pot.awardWho') }, ...members.map((m) => h('button', {
    type: 'button', class: `kid-chip${m.id === to ? ' is-on' : ''}`, role: 'radio', 'aria-checked': String(m.id === to),
    onclick: (e) => { to = m.id; for (const b of who.children) { b.classList.remove('is-on'); b.setAttribute('aria-checked', 'false'); } e.currentTarget.classList.add('is-on'); e.currentTarget.setAttribute('aria-checked', 'true'); },
  }, m.id === api.me ? kt('pot.me', { name: m.name }) : m.name)));
  const text = h('input', { class: 'input', maxlength: '120', placeholder: kt('pot.awardPh'), 'aria-label': kt('pot.awardPh') });
  const pick = starPicker(1);
  const form = h('form', { class: 'kid-pot__form' },
    h('p', { class: 'field__label' }, kt('pot.awardWho')), who,
    text, pick.node,
    h('button', { type: 'submit', class: 'btn btn--gold btn--block' }, kt('pot.awardGive')),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const what = text.value.trim().slice(0, 120);
    if (!what) { text.focus(); return; }
    api.put('award', api.newId('a'), { to, stars: pick.value(), text: what, at: new Date().toISOString(), by: api.me });
    awardOpen = false;
    toast({ title: kt('pot.awardDone', { name: api.name(to), n: pick.value() }) });
    rerender?.();
  });
  return form;
}

/** Дорога к мечте: дом → остановки → мечта, семья идёт по ней. */
function road(pot, dream) {
  const pct = Math.round(pot.progress * 100);
  return h('div', { class: 'kid-road', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': kt('pot.progress', { n: pot.total, t: pot.target }) },
    h('div', { class: 'kid-road__track' }, h('span', { class: 'kid-road__fill', style: { width: `${pct}%` } })),
    h('span', { class: 'kid-road__home', 'aria-hidden': 'true' }, '🏠'),
    ...POT_STOPS.slice(0, -1).map((st) => h('span', { class: `kid-road__stop${pot.progress >= st.at ? ' is-on' : ''}`, style: { left: `${st.at * 100}%` }, title: st.title, 'aria-hidden': 'true' }, st.icon)),
    h('span', { class: `kid-road__goal${pot.progress >= 1 ? ' is-on' : ''}`, 'aria-hidden': 'true' }, dream.data.icon || '🌟'),
    h('span', { class: 'kid-road__family', style: { left: `${Math.min(96, Math.max(4, pct))}%` }, 'aria-hidden': 'true' }, '👨‍👩‍👧'),
  );
}

/** Полоса вклада: каждый в семье — своим цветом. */
function shares(pot) {
  const sum = Math.max(1, pot.total);
  return h('div', {},
    h('div', { class: 'kid-shares', 'aria-hidden': 'true' }, ...pot.byMember.filter((m) => m.stars > 0).map((m) =>
      h('span', { class: `kid-shares__part is-${toneOf(m)}`, style: { width: `${(m.stars / sum) * 100}%` } }))),
    h('ul', { class: 'kid-shares__list' }, ...pot.byMember.map((m) => h('li', { class: `is-${toneOf(m)}` },
      h('span', { class: 'kid-shares__dot' }), `${m.name} · ${m.stars} ⭐`))),
  );
}

/** Карточка мечты семьи. mode: parent — заводит мечту и ставит звёзды; kid — смотрит и копит. */
export function familyDreamCard(api, { rerender, mode = api.role === 'child' ? 'kid' : 'parent' } = {}) {
  if (!api.circle) return null;
  const dreams = api.items('fdream');
  const dream = activeDream(dreams);
  const parent = mode === 'parent';
  const done = dreams.filter((d) => d.data.status === 'done').sort((a, b) => String(b.data.doneAt).localeCompare(String(a.data.doneAt)));
  const history = done.length ? h('details', { class: 'kid-pot__history' },
    h('summary', {}, kt('pot.history', { n: done.length })),
    h('ul', { class: 'kid-rows' }, ...done.map((d) => h('li', { class: 'kid-row' },
      h('span', { class: 'kid-row__icon', 'aria-hidden': 'true' }, d.data.icon || '🌟'),
      h('span', { class: 'kid-row__title' }, d.data.title),
      h('span', { class: 'kid-badge is-ok' }, new Date(d.data.doneAt).toLocaleDateString()))))) : null;

  if (!dream) {
    return h('section', { class: 'card card--hero kid-pot' },
      h('p', { class: 'caps' }, kt('pot.caps')),
      h('div', { class: 'kid-pot__icon', 'aria-hidden': 'true' }, '🌈'),
      h('h2', { class: 'card__title' }, kt('pot.emptyTitle')),
      h('p', { class: 'card__text' }, parent ? kt('pot.emptyParent') : kt('pot.emptyKid')),
      parent ? (formOpen ? newDreamForm(api, rerender) : h('button', { type: 'button', class: 'btn btn--gold btn--block', onclick: () => { formOpen = true; rerender?.(); } }, kt('pot.choose'))) : null,
      history,
    );
  }

  const pot = familyPot(api.circle, dataOf(api), dream);
  const reached = pot.progress >= 1;
  return h('section', { class: `card card--hero kid-pot${reached ? ' is-reached' : ''}` },
    h('p', { class: 'caps' }, kt('pot.caps')),
    h('h2', { class: 'card__title kid-pot__title' }, `${dream.data.icon || '🌟'} ${dream.data.title}`),
    h('p', { class: 'kid-pot__sum gold-text' }, kt('pot.progress', { n: pot.total, t: pot.target })),
    road(pot, dream),
    reached
      ? h('div', { class: 'kid-pot__party' },
        h('p', { class: 'kid-pot__party-title' }, kt('pot.reached')),
        h('p', {}, kt('pot.reachedText')),
        parent ? h('button', {
          type: 'button', class: 'btn btn--gold btn--block',
          onclick: () => { api.put('fdream', dream.id, { ...dream.data, status: 'done', doneAt: new Date().toISOString() }); toast({ title: kt('pot.doneToast') }); rerender?.(); },
        }, kt('pot.done')) : null)
      : h('p', { class: 'kid-pot__next' }, pot.next ? kt('pot.next', { icon: pot.next.icon, title: pot.next.title, n: Math.max(1, Math.ceil(pot.next.at * pot.target - pot.total)) }) : ''),
    pot.stop && !reached ? h('p', { class: 'kid-pot__stop' }, kt('pot.stopNow', { icon: pot.stop.icon, title: pot.stop.title })) : null,
    h('p', { class: 'kid-pot__today' }, pot.today ? kt('pot.today', { n: pot.today }) : kt('pot.todayZero')),
    shares(pot),
    h('p', { class: 'faint kid-pot__how' }, kt('pot.how')),
    parent ? h('div', { class: 'card__actions' },
      h('button', { type: 'button', class: 'btn btn--gold', 'aria-expanded': String(awardOpen), onclick: () => { awardOpen = !awardOpen; rerender?.(); } }, kt('pot.award'))) : null,
    parent && awardOpen ? awardForm(api, rerender) : null,
    history,
  );
}

/** Звезда от родителя в ленте семейного чата — видно всем, и детям тоже. */
export function awardCard(api, a) {
  const d = a.data || {};
  return h('li', { class: 'chat__msg kid-award' },
    h('span', { class: 'kid-award__line' }, kt('pot.awardLine', { from: api.name(d.by || a.author), to: api.name(d.to), n: d.stars })),
    d.text ? h('span', { class: 'kid-award__text' }, d.text) : null,
  );
}
