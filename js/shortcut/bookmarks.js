import { h, svg } from '../core/dom.js';
import { icons } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import { openSheet, closeSheet } from '../ui/sheet.js';
import { read, writeQuiet } from '../core/store.js';
import { ST } from './texts.js';

/* ЗАКЛАДКИ (владелец 28.11.2026: «в разделах, где книжки и анкеты, кнопка постоянно на экране: надо прерваться —
   нажал, закрыл, потом открываешь на этом же месте»; «у каждой книги и анкеты своя закладка — практично и понятно»).
   - В разделах для чтения и анкетах справа внизу — золотая ленточка. Нажал — место сохранено: раздел, книга (плашка,
     которая сейчас на экране), открытые в ней главы и докуда пролистано. У каждой книги — своя закладка: новая
     закладка в той же книге заменяет прежнюю.
   - Открыл раздел снова — сверху «Продолжить с закладки»: нажал — там же, где остановился.
   - «Моя кнопка» → «Мои закладки»: список всех сохранённых мест.
   Хранится на этом телефоне, тихо (writeQuiet) — без перерисовки экрана. */
const KEY = 'bookmarks';
const MAX = 30;
// Разделы, где можно читать или заполнять анкеты: ленточка и «Продолжить с закладки»
export const READING = new Set(['archive', 'help', 'goals', 'love', 'anketa', 'intim', 'charts', 'meet', 'redflag']);

const all = () => read(KEY, {}) || {};
const view = () => document.getElementById('view');
/** Адрес без «открой плашку» (?open=…): закладка сама знает, что открыть. */
export function place(hash = location.hash) {
  const [base, query = ''] = hash.split('?');
  const keep = query.split('&').filter((p) => p && !p.startsWith('open='));
  return keep.length ? `${base}?${keep.join('&')}` : base;
}
const text = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70);

/** Книга на экране: раскрытая плашка, которая занимает середину экрана (или последняя выше середины). */
function plateInView() {
  const mid = innerHeight / 2;
  let found = null;
  for (const d of view()?.querySelectorAll('details[data-plate][open]') || []) {
    const r = d.getBoundingClientRect();
    if (r.top < mid && r.bottom > 80) found = d;
  }
  return found;
}

/** Нажали ленточку: сохранить это место. */
export function save() {
  const plate = plateInView();
  const scope = plate || view();
  if (!scope) return;
  const inner = [...scope.querySelectorAll('details')];
  const open = inner.flatMap((d, i) => (d.open ? [i] : []));
  // Глава — последняя раскрытая, чьё начало выше середины экрана
  const chapter = inner.filter((d) => d.open && d.getBoundingClientRect().top < innerHeight / 2).pop();
  const top = plate ? plate.getBoundingClientRect().top + scrollY : 0;
  const hash = place();
  const key = plate ? `${hash}#${plate.dataset.plate}` : hash;
  const bm = {
    key, hash, plate: plate?.dataset.plate || null, open, offset: Math.round(scrollY - top), // может быть и меньше нуля: стоял чуть выше начала книги
    title: text(plate ? plate.querySelector('.plate__title') : view()?.querySelector('.screen-title')),
    chapter: chapter ? text(chapter.querySelector('summary')) : '', at: new Date().toISOString(),
  };
  const list = { ...all(), [key]: bm };
  const keys = Object.keys(list).sort((a, b) => list[b].at.localeCompare(list[a].at)).slice(0, MAX);
  writeQuiet(KEY, Object.fromEntries(keys.map((k) => [k, list[k]])));
  toast({ title: ST().bm.saved, text: label(bm) });
}

export function remove(key) {
  const list = all();
  delete list[key];
  writeQuiet(KEY, list);
}

const label = (bm) => [bm.title, bm.chapter].filter(Boolean).join(' · ');

/* Переход к закладке: тот же экран — вернуть место сразу; другой — после отрисовки (entered). */
let pending = null;
function apply(bm) {
  const plate = bm.plate ? view()?.querySelector(`[data-plate="${CSS.escape(bm.plate)}"]`) : null;
  if (bm.plate && !plate) return; // книги больше нет (программа сменилась) — просто раздел
  if (plate) plate.open = true;
  const scope = plate || view();
  // По порядку: раскрытая глава может принести свои вложенные — их номера идут следом
  for (const i of bm.open || []) { const d = scope?.querySelectorAll('details')[i]; if (d) d.open = true; }
  const back = () => scrollTo({ top: (plate ? plate.getBoundingClientRect().top + scrollY : 0) + (bm.offset || 0) });
  setTimeout(back, 60); // после прокрутки экрана к началу и к открытой плашке
  setTimeout(back, 450); // картинки догрузились и сдвинули страницу — ещё раз на то же место
}

export function go(bm) {
  pending = bm;
  if (place() === bm.hash) { pending = null; apply(bm); } else location.hash = bm.hash;
}

/** После перехода на экран (main.js → shortcut.entered): ждали закладку — вернуть место. */
export function entered() {
  if (pending && place() === pending.hash) { const bm = pending; pending = null; apply(bm); }
}

/** Лист закрывается шагом «назад» в истории — переходить только после него, иначе «назад» уведёт с нового экрана. */
function afterSheet(fn) {
  if (!history.state?.sheet) { closeSheet(); fn(); return; }
  let done = false;
  const run = () => { if (!done) { done = true; fn(); } };
  addEventListener('popstate', run, { once: true });
  setTimeout(run, 400);
  closeSheet();
}

function row(bm, onPick, onDrop) {
  const T = ST().bm;
  return h('div', { class: 'bm-row' },
    h('button', { type: 'button', class: 'bm-row__open', onclick: onPick },
      svg(icons.bookmark, 'bm-row__icon'),
      h('span', { class: 'bm-row__text' }, h('span', { class: 'caps bm-row__cap' }, T.continue), h('span', { class: 'bm-row__title' }, label(bm)))),
    h('button', { type: 'button', class: 'bm-row__drop', 'aria-label': T.drop, onclick: onDrop }, svg(icons.close)));
}

/** «Моя кнопка» → «Мои закладки»: список всех мест, новые сверху. */
export function openList() {
  const T = ST().bm;
  const body = h('div', { class: 'bm-list' });
  const fill = () => {
    const list = Object.values(all()).sort((a, b) => b.at.localeCompare(a.at));
    body.replaceChildren(...(list.length ? list.map((bm) => row(bm, () => afterSheet(() => go(bm)), () => { remove(bm.key); fill(); }))
      : [h('p', { class: 'card__text bm-list__empty' }, T.empty)]));
  };
  fill();
  openSheet({ title: T.listTitle, content: body });
}

/** Каждая отрисовка раздела для чтения: ленточка справа внизу и сверху — закладки этого раздела. */
export function decorate(name, v) {
  if (!READING.has(name) || !v) return;
  const T = ST().bm;
  if (Object.values(all()).some((bm) => bm.hash === place())) {
    const box = h('div', { class: 'bm-here' });
    const fill = () => {
      const list = Object.values(all()).filter((bm) => bm.hash === place()).sort((a, b) => b.at.localeCompare(a.at));
      box.replaceChildren(...list.map((bm) => row(bm, () => go(bm), () => { remove(bm.key); fill(); })));
      if (!list.length) box.remove();
    };
    fill();
    v.prepend(box);
  }
  v.append(h('button', { type: 'button', class: 'bm-fab', 'aria-label': T.save, title: T.save, onclick: save }, svg(icons.bookmark)));
}

