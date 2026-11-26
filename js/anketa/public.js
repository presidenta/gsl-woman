import { h } from '../core/dom.js';
import { API_BASE } from '../config.js';
import { formView } from './form.js';
import { resultView } from './result.js';
import { at } from './texts.js';

/* СТРАНИЦА ГОСТЯ «ЕДИНОЙ АНКЕТЫ ПАРТНЁРА» (anketa.html#<ссылка>). Владелец 26.11.2026: анкету отправляют ссылкой, «как
   реферальную»; кто открыл — заполняет без входа и сразу видит итог, может сразу оставить заявку на доступ к приложению.

   Черновик и «кто я» — на этом устройстве (ключ gsl-anketa-guest:<ссылка>): закрыл страницу — вернулся к тому же месту;
   после сохранения — id и secret, по ним итог открывается снова и ответы можно поправить. Сервер — planner
   gsl/anketa/routes.js (/api/anketa/…). Приложение и его хранилище здесь не грузятся. */

const page = document.getElementById('page');
const token = decodeURIComponent(location.hash.slice(1)).replace(/[^A-Za-z0-9_-]/g, '');
const KEY = `gsl-anketa-guest:${token}`;
const open = new Set(['life']);

let info = null; // { from, forms }
let state = load();
let result = null;
let mode = state.id ? 'result' : 'form';

function load() {
  try { return { answers: {}, intim: {}, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return { answers: {}, intim: {} }; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* приватное окно — живёт до закрытия */ }
}

async function api(path, body) {
  const res = await fetch(API_BASE + path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.error || 'other'), { status: res.status });
  return data;
}

const part = () => (state.gender === 'male' ? 'man' : 'woman');
function paintSide() {
  if (state.gender === 'male') document.documentElement.setAttribute('data-side', 'man');
  else document.documentElement.removeAttribute('data-side');
}

function header() {
  return [
    h('p', { class: 'caps anketa-page__brand' }, 'GSL Я⁺ • Любовь'),
    h('h1', { class: 'screen-title' }, at('guestFrom', { name: info.from.name, gender: info.from.gender })),
  ];
}

function joinBox() {
  const email = h('input', { class: 'input', type: 'email', value: state.email || '', maxlength: '120', placeholder: at('guestEmail') });
  const phone = h('input', { class: 'input', type: 'tel', value: state.phone || '', maxlength: '32', placeholder: at('guestPhone') });
  email.addEventListener('change', () => { state.email = email.value.trim(); save(); });
  phone.addEventListener('change', () => { state.phone = phone.value.trim(); save(); });
  const fields = h('div', { class: 'anketa-join__fields' }, email, phone);
  const box = h('input', { type: 'checkbox', checked: !!state.join });
  const sync = () => { fields.hidden = !box.checked; };
  box.addEventListener('change', () => { state.join = box.checked; save(); sync(); });
  sync();
  return h('div', { class: 'card anketa-join' }, h('label', { class: 'anketa-join__row' }, box, h('span', {}, at('guestJoin'))), fields);
}

async function submit(btn, err) {
  if (!state.name?.trim() || !state.gender) { err.textContent = at('guestNeedName'); return; }
  const core = Object.keys(state.answers).filter((k) => !k.startsWith('birth.')).length;
  if (core < 3) { err.textContent = at('guestNeedAny'); return; }
  if (state.join && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(state.email || '')) { err.textContent = at('guestNeedEmail'); return; }
  err.textContent = '';
  btn.disabled = true;
  btn.textContent = at('guestSaving');
  try {
    const body = { name: state.name.trim(), gender: state.gender, answers: state.answers, intim: state.intim };
    if (state.id) Object.assign(body, { id: state.id, secret: state.secret });
    if (state.join) Object.assign(body, { join: true, email: state.email, ...(state.phone ? { phone: state.phone } : {}) });
    const r = await api(`/api/anketa/${token}`, body);
    Object.assign(state, { id: r.id, secret: r.secret, joined: r.joined || state.joined });
    save();
    result = r.result;
    mode = 'result';
    draw();
    scrollTo(0, 0);
  } catch {
    err.textContent = at('guestError');
    btn.disabled = false;
    btn.textContent = at('guestSave');
  }
}

function drawForm() {
  const name = h('input', { class: 'input', value: state.name || '', maxlength: '40', autocomplete: 'given-name' });
  name.addEventListener('change', () => { state.name = name.value.trim(); save(); });
  const genders = [['female', at('woman')], ['male', at('man')]];
  const seg = h('div', { class: 'segmented', role: 'radiogroup' }, ...genders.map(([v, l]) => h('button', {
    type: 'button', class: 'segmented__option', role: 'radio', 'aria-checked': String(state.gender === v),
    onclick: () => { state.gender = v; save(); paintSide(); draw(); },
  }, l)));
  const form = info.forms[part()];
  const err = h('p', { class: 'anketa-error', role: 'alert' });
  const btn = h('button', { type: 'button', class: 'btn btn--gold btn--block' }, at('guestSave'));
  btn.addEventListener('click', () => submit(btn, err));
  page.replaceChildren(
    ...header(),
    h('p', { class: 'help__intro' }, at('guestLead', { name: info.from.name })),
    h('section', { class: 'card anketa-who' },
      h('label', { class: 'field__label' }, at('guestName')), name,
      h('p', { class: 'field__label anketa-who__label' }, at('guestGender')), seg),
    h('p', { class: 'faint' }, at('guestAdult')),
    state.gender ? formView(form, {
      get: (k) => state.answers[k],
      set: (k, v) => { if (v === undefined) delete state.answers[k]; else state.answers[k] = v; save(); },
      open,
      intim: {
        inline: true,
        marks: () => state.intim,
        setMark: (k, m) => { if (m) state.intim[k] = m; else delete state.intim[k]; save(); },
      },
      // «Сохранить» у данных рождения: в браузере гостя пишется и так, по вводу; кнопка — подтверждение
      save: () => { save(); alert(at('saved')); },
      // Подсказки города рождения — тот же адрес сервера, без входа
      geo: async (q) => (await api(`/api/geo/places?q=${encodeURIComponent(q)}&lang=ru`)).places || [],
      lang: 'ru',
      love: { auto: null, href: null },
    }) : null,
    state.gender && !state.joined ? joinBox() : null,
    state.gender ? btn : null,
    err,
  );
}

function drawResult() {
  const nodes = [...header()];
  if (state.joined) nodes.push(h('p', { class: 'card anketa-ok' }, at('guestJoined')));
  nodes.push(h('h2', { class: 'caps plates__heading' }, at('resultsTitle')));
  nodes.push(result ? resultView(result, info.from.name) : h('p', { class: 'faint' }, at('guestResultWait', { name: info.from.name })));
  nodes.push(h('button', { type: 'button', class: 'btn btn--ghost btn--block anketa-edit', onclick: () => { mode = 'form'; draw(); scrollTo(0, 0); } }, at('guestEdit')));
  if (!state.joined) {
    nodes.push(h('section', { class: 'card anketa-cta' },
      h('p', { class: 'card__text' }, at('guestCta')),
      h('button', { type: 'button', class: 'btn btn--gold', onclick: () => { state.join = true; save(); mode = 'form'; draw(); requestAnimationFrame(() => page.querySelector('.anketa-join')?.scrollIntoView({ block: 'center' })); } }, at('guestJoin'))));
  }
  page.replaceChildren(...nodes);
}

function draw() {
  paintSide();
  if (mode === 'result') drawResult();
  else drawForm();
}

async function start() {
  page.replaceChildren(h('p', { class: 'faint' }, '…'));
  if (!token) { page.replaceChildren(h('p', { class: 'card__text' }, at('guestNotFound'))); return; }
  try {
    info = await api(`/api/anketa/${token}`);
  } catch (e) {
    page.replaceChildren(h('p', { class: 'card__text' }, e.status === 404 ? at('guestNotFound') : at('guestError')));
    return;
  }
  // Пол по умолчанию — противоположный тому, кто прислал (поменять можно)
  if (!state.gender && info.from.gender) state.gender = info.from.gender === 'female' ? 'male' : 'female';
  if (state.id) {
    try {
      const r = await api(`/api/anketa/${token}/${state.id}`, { secret: state.secret });
      result = r.result;
      state.joined = r.joined;
    } catch {
      Object.assign(state, { id: null, secret: null });
      mode = 'form';
    }
  }
  draw();
}

start();
