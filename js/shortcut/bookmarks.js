import { h, svg } from '../core/dom.js';
import { icons } from '../ui/icons.js';
import { openSheet, closeSheet } from '../ui/sheet.js';
import { read, writeQuiet } from '../core/store.js';
import { ST } from './texts.js';

/* ЗАКЛАДКИ (владелец 28.11.2026: «в разделах, где книжки и анкеты, кнопка постоянно на экране: надо прерваться —
   нажал, закрыл, потом открываешь на этом же месте»; «у каждой книги и анкеты своя закладка — практично и понятно»).
   - В разделах для чтения и анкетах справа внизу — золотая ленточка. Нажал, затем коснулся места в тексте — место
     сохранено: раздел, книга, открытые в ней главы и сам абзац. У каждой книги — своя закладка: новая закладка в той
     же книге заменяет прежнюю.
   - Открыл раздел снова — сверху «Продолжить с закладки»: нажал — там же, где остановился.
   - «Моя кнопка» → «Мои закладки»: список всех сохранённых мест.
   - Снять закладку: золотой крестик на самой ленте, крестик у строки «Продолжить с закладки» или в «Моих закладках».
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
/** Текст узла без ленточек на нём: подпись «Место отмечено» не должна попасть в «где закладка». */
function text(node) {
  if (!node) return '';
  let n = node;
  if (node.querySelector('.bm-ribbon')) {
    n = node.cloneNode(true);
    n.querySelectorAll('.bm-ribbon').forEach((r) => r.remove());
  }
  return (n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70);
}

/* КНИГА = плашка раздела (details.plate). Имя книги — data-plate, где экран его дал («Помощь», «Тайный архив»); у
   остальных («Первое свидание», «Разбор», «Интим»…) — её название. Так у каждой книги своя закладка в любом разделе и
   в одном разделе их может быть сколько угодно (владелец 28.11.2026: «поставил в „Комплименты“, потом в „Как держаться
   с женщиной“ — в „Комплиментах“ исчезла; должна быть в каждом разделе, где её отметили»). */
const plates = (v) => [...(v?.querySelectorAll('details.plate') || [])];
const plateId = (d) => d.dataset.plate || `t:${text(d.querySelector('.plate__title'))}`;
const plateOf = (v, id) => plates(v).find((d) => plateId(d) === id) || null;

/* МЕСТО В ТЕКСТЕ (владелец 28.11.2026: «ленточка появляется в заголовке, а в книжке текст очень длинный — надо
   в середине текста; подумай, как на телефоне, где пальцем тыкаешь»). Нажал ленточку справа внизу → «Коснись места
   в тексте» → коснулся абзаца, вопроса, галочки или заголовка главы — лента опускается на него. Перетаскивать пальцем
   на телефоне неудобно: спорит с листанием, — поэтому касание. Место = номер блока в книге и его первые слова: текст
   поменялся и номер сдвинулся — блок ищется по словам. */
const BLOCKS = 'p, li, h2, h3, h4, h5, blockquote, summary, label, dt, dd';
const blocksOf = (scope) => [...scope.querySelectorAll(BLOCKS)].filter((b) => !b.closest('.bm-here'));
function spotOf(bm, scope) {
  if (!(bm.spot >= 0) || !scope) return null;
  const blocks = blocksOf(scope);
  const el = blocks[bm.spot];
  if (el && text(el) === bm.spotText) return el;
  return blocks.find((b) => text(b) === bm.spotText) || null;
}

/** Коснулись места spot: закладка книги, в которой оно лежит (без книги — раздела). */
function save(spot) {
  const v = view();
  const plate = spot.closest('details.plate');
  const scope = plate || v;
  const inner = [...scope.querySelectorAll('details')];
  const open = inner.flatMap((d, i) => (d.open ? [i] : []));
  const around = spot.closest('details'); // глава вокруг места (у заголовка главы — сама глава)
  const chapter = around && around !== plate && scope.contains(around) ? around : null;
  const top = plate ? plate.getBoundingClientRect().top + scrollY : 0;
  const id = plate ? plateId(plate) : null;
  const hash = place();
  const key = id ? `${hash}#${id}` : hash;
  const bm = {
    key, hash, plate: id, open,
    // Запас, если место не найдётся: экран — туда же (место в верхней трети, как при возврате)
    offset: Math.round(spot.getBoundingClientRect().top + scrollY - innerHeight * 0.3 - top),
    title: text(plate ? plate.querySelector('.plate__title') : v.querySelector('.screen-title')),
    chapter: chapter ? text(chapter.querySelector(':scope > summary')) : '', at: new Date().toISOString(),
    mark: chapter ? inner.indexOf(chapter) : -1, spot: blocksOf(scope).indexOf(spot), spotText: text(spot),
  };
  const list = { ...all(), [key]: bm };
  const keys = Object.keys(list).sort((a, b) => list[b].at.localeCompare(list[a].at)).slice(0, MAX);
  writeQuiet(KEY, Object.fromEntries(keys.map((k) => [k, list[k]])));
  hang(bm, true); // золотая ленточка опускается на это место и остаётся на нём
  navigator.vibrate?.(12);
}

/* ЛЕНТОЧКА НА ТЕКСТЕ (владелец 28.11.2026: «при нажатии — золотая ленточка поверх того, что читаешь, и фиксируется;
   как закладка в книге; лакшери, лаконично»). Висит на месте в тексте; глава свёрнута — на заголовке главы; книга
   свёрнута — на заголовке книги (заголовок виден всегда). Новая — опускается сверху с покачиванием и бликом, рядом
   на миг — «Место отмечено». */
const shown = (el) => !!el && el.getClientRects().length > 0;
function anchorOf(bm, v) {
  const plate = bm.plate ? plateOf(v, bm.plate) : null;
  if (bm.plate && !plate) return null;
  const scope = plate || v;
  const spot = spotOf(bm, scope);
  if (shown(spot)) return spot;
  const head = (d) => d?.querySelector(':scope > summary');
  const chapter = bm.mark >= 0 ? head(scope.querySelectorAll('details')[bm.mark]) : null;
  if (shown(chapter)) return chapter;
  return plate ? head(plate) : null;
}

function hang(bm, fresh = false) {
  const v = view();
  if (!v) return;
  document.querySelectorAll(`.bm-ribbon[data-key="${CSS.escape(bm.key)}"]`).forEach((r) => r.remove());
  const at = anchorOf(bm, v);
  if (!at) return;
  const T = ST().bm;
  const note = fresh ? h('span', { class: 'bm-ribbon__note', 'aria-hidden': 'true' }, T.marked) : null;
  // Золотой крестик на самой ленте — снять закладку (владелец 28.11.2026: «как их забирать? крестик прямо на полосочке»).
  // Лента лежит на заголовке книги: нажатие крестика не должно раскрывать и сворачивать книгу.
  const x = h('button', { type: 'button', class: 'bm-ribbon__x', 'aria-label': T.drop, title: T.drop,
    onclick: (e) => { e.preventDefault(); e.stopPropagation(); remove(bm.key); } }, svg(icons.close));
  at.classList.add('bm-anchor');
  at.append(h('span', { class: `bm-ribbon${fresh ? ' is-new' : ''}`, dataset: { key: bm.key } }, x, note));
  if (note) setTimeout(() => note.remove(), 3200);
}

const hangAll = () => Object.values(all()).filter((bm) => bm.hash === place()).forEach((bm) => hang(bm));

/** Лента уходит вверх, как вынутая из книги (без анимации в телефоне — сразу). */
function lift(r) {
  if (r.classList.contains('is-gone')) return;
  r.classList.add('is-gone');
  r.addEventListener('animationend', () => r.remove(), { once: true });
  setTimeout(() => r.remove(), 600);
}

/** Снять закладку: из памяти, ленту с книги и строку «Продолжить с закладки» сверху раздела. */
export function remove(key) {
  const list = all();
  delete list[key];
  writeQuiet(KEY, list);
  const k = CSS.escape(key);
  document.querySelectorAll(`.bm-ribbon[data-key="${k}"]`).forEach(lift);
  document.querySelectorAll(`.bm-here .bm-row[data-key="${k}"]`).forEach((r) => {
    const box = r.parentElement;
    r.remove();
    if (!box.children.length) box.remove();
  });
}

const label = (bm) => [bm.title, bm.chapter].filter(Boolean).join(' · ');

/* Переход к закладке: тот же экран — вернуть место сразу; другой — после отрисовки (entered). */
let pending = null;
function apply(bm) {
  const plate = bm.plate ? plateOf(view(), bm.plate) : null;
  if (bm.plate && !plate) return; // книги больше нет (программа сменилась) — просто раздел
  if (plate) plate.open = true;
  const scope = plate || view();
  // По порядку: раскрытая глава может принести свои вложенные — их номера идут следом
  for (const i of bm.open || []) { const d = scope?.querySelectorAll('details')[i]; if (d) d.open = true; }
  // И все главы вокруг места — даже если их свернули уже после закладки
  for (let d = spotOf(bm, scope)?.closest('details'); d && scope.contains(d); d = d.parentElement?.closest('details')) d.open = true;
  hangAll(); // главы раскрылись — ленточки переезжают на свои места
  // Место — в верхней трети экрана, где начинают читать; не нашлось — по запасу
  const back = () => {
    const spot = spotOf(bm, scope);
    scrollTo({ top: shown(spot) ? spot.getBoundingClientRect().top + scrollY - innerHeight * 0.3
      : (plate ? plate.getBoundingClientRect().top + scrollY : 0) + (bm.offset || 0) });
  };
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
  return h('div', { class: 'bm-row', dataset: { key: bm.key } },
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

/* ВЫБОР МЕСТА: внизу подсказка, ленточка становится крестиком «отмена». Касание в тексте не нажимает галочки и не
   сворачивает главы — только ставит закладку (перехват на окне раньше всех кнопок). Касание вне текста (панель,
   шапка) — выход из выбора, а само касание срабатывает как обычно. Листать в это время можно. */
let picking = null;
function stopPick() {
  picking?.();
  picking = null;
}
function startPick(fab) {
  if (picking) { stopPick(); return; }
  const T = ST().bm;
  const hint = h('div', { class: 'bm-hint', role: 'status' }, T.pick);
  const onClick = (e) => {
    if (e.target.closest('.bm-fab')) return; // сама ленточка — отмена, своим нажатием
    const v = view();
    if (!v?.contains(e.target) || e.target.closest('.bm-here')) { stopPick(); return; }
    e.preventDefault();
    e.stopPropagation();
    const spot = e.target.closest(BLOCKS);
    if (!spot || !v.contains(spot)) return; // мимо текста (фото, поле) — ждём касания в тексте
    stopPick();
    save(spot);
  };
  const onKey = (e) => { if (e.key === 'Escape') stopPick(); };
  const look = (icon, label) => { fab.replaceChildren(svg(icon)); fab.setAttribute('aria-label', label); fab.title = label; };
  addEventListener('click', onClick, true);
  addEventListener('keydown', onKey);
  document.body.classList.add('bm-picking');
  document.body.append(hint);
  fab.classList.add('is-picking');
  look(icons.close, T.cancel);
  picking = () => {
    removeEventListener('click', onClick, true);
    removeEventListener('keydown', onKey);
    document.body.classList.remove('bm-picking');
    hint.remove();
    fab.classList.remove('is-picking');
    look(icons.bookmark, T.save);
  };
}

/** Каждая отрисовка раздела для чтения: ленточка справа внизу и сверху — закладки этого раздела. */
export function decorate(name, v) {
  stopPick(); // экран перерисован или сменился — выбор места дальше не тянется
  if (!READING.has(name) || !v) return;
  const T = ST().bm;
  if (Object.values(all()).some((bm) => bm.hash === place())) {
    const list = Object.values(all()).filter((bm) => bm.hash === place()).sort((a, b) => b.at.localeCompare(a.at));
    // Крестик у строки снимает и ленту с книги — remove() убирает строку сам
    v.prepend(h('div', { class: 'bm-here' }, ...list.map((bm) => row(bm, () => go(bm), () => remove(bm.key)))));
  }
  hangAll();
  v.append(h('button', { type: 'button', class: 'bm-fab', 'aria-label': T.save, title: T.save, onclick: (e) => startPick(e.currentTarget) }, svg(icons.bookmark)));
}

