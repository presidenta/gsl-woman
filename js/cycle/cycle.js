import { h } from '../core/dom.js';
import { t, locale } from '../core/i18n.js';
import { read, write } from '../core/store.js';
import { isoDate, addDays, daysBetween, isValidIso } from '../core/dates.js';
import * as circles from '../circles/circles.js';
import * as side from '../side/side.js';
import { openSheet } from '../ui/sheet.js';

/* КАЛЕНДАРЬ ЦИКЛА — кружок с датой в шапке (владелец 17.11.2026).

   Кружок показывает сегодняшнее число и день недели. Нажал — открывается календарь на три месяца: прошлый, текущий
   и следующий.
   - Женщина отмечает дни месячных нажатием на число (ещё раз — снять). Программа сама считает средний цикл и
     длину месячных и красит ожидаемые дни следующих месячных розовым: «чтобы женщина помнила».
   - Мужчина в паре видит её календарь: отмеченные дни — красным, ожидаемые — розовым. Для чего: «чтобы понимать,
     что она может быть раздражённой или нервной в эти дни — женщина же не будет рассказывать».
   - Без пары женщина видит календарь только сама; мужчина без пары — подсказку.

   Хранение: у женщины — на телефоне (ключ cycle: { days: [iso…] }); в паре она кладёт копию в пару записью
   cycle/days, мужчина читает её оттуда. Держим последние 400 дней. */

const KEY = 'cycle';
const KEEP = 400;
const DEFAULT_CYCLE = 28;
const DEFAULT_LEN = 5;

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

function ownDays() {
  const v = read(KEY, {});
  return Array.isArray(v?.days) ? v.days.filter(isValidIso) : [];
}

function saveOwn(days) {
  const list = [...new Set(days)].sort().slice(-KEEP);
  write(KEY, { days: list });
  share(list);
}

/** У женщины в паре — копия её дней в паре (мужчина видит). Ничего не изменилось — ничего не шлём. */
export function share(days = ownDays()) {
  if (side.get() === 'man') return;
  const pair = circles.pair();
  if (!pair || !circles.isComplete(pair)) return;
  const now = circles.item(pair.id, 'cycle', 'days')?.data?.days || [];
  if (JSON.stringify(now) !== JSON.stringify(days)) circles.put(pair.id, 'cycle', 'days', { days });
}

/** Дни для календаря: свои у женщины, её — у мужчины в паре. null — мужчина без пары. */
function shownDays() {
  if (side.get() !== 'man') return ownDays();
  const pair = circles.pair();
  if (!pair || !circles.isComplete(pair)) return null;
  const d = circles.item(pair.id, 'cycle', 'days')?.data?.days;
  return Array.isArray(d) ? d.filter(isValidIso) : [];
}

/** Отрезки подряд идущих дней: [{ start, len }]. */
function episodes(days) {
  const list = [...new Set(days)].sort();
  const out = [];
  for (const d of list) {
    const last = out[out.length - 1];
    if (last && daysBetween(addDays(last.start, last.len - 1), d) <= 2) last.len = daysBetween(last.start, d) + 1;
    else out.push({ start: d, len: 1 });
  }
  return out;
}

/** Средний цикл и длина месячных по последним шести, в разумных пределах. */
export function stats(days) {
  const eps = episodes(days).slice(-7);
  const gaps = eps.slice(1).map((e, i) => daysBetween(eps[i].start, e.start)).filter((g) => g >= 18 && g <= 45);
  const cycle = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : DEFAULT_CYCLE;
  const lens = eps.map((e) => e.len);
  const len = lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : DEFAULT_LEN;
  return { cycle: clamp(cycle, 21, 40), len: clamp(len, 2, 8), last: eps[eps.length - 1] || null, count: eps.length };
}

/** Ожидаемые дни: от последнего начала — ещё три цикла вперёд. */
export function predicted(days) {
  const s = stats(days);
  if (!s.last) return new Set();
  const out = new Set();
  for (let k = 1; k <= 3; k++) {
    const start = addDays(s.last.start, s.cycle * k);
    for (let i = 0; i < s.len; i++) out.add(addDays(start, i));
  }
  return out;
}

/* ---------- Кружок в шапке ---------- */

let button = null;

/** Кружок с числом и днём недели. Шапка строится один раз, число освежает paint() при каждой перерисовке. */
export function headerButton() {
  button = h('button', { type: 'button', class: 'icon-btn cycle-btn', 'aria-label': t('cycle.open'), onclick: openCalendar },
    h('span', { class: 'cycle-btn__day' }), h('span', { class: 'cycle-btn__week' }));
  paint();
  return button;
}

export function paint() {
  if (!button) return;
  const now = new Date();
  button.querySelector('.cycle-btn__day').textContent = String(now.getDate());
  button.querySelector('.cycle-btn__week').textContent = new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(now).replace('.', '');
  const days = shownDays() || [];
  const today = isoDate();
  button.classList.toggle('is-period', days.includes(today));
  button.classList.toggle('is-soon', !days.includes(today) && predicted(days).has(today));
}

/* ---------- Календарь ---------- */

function monthGrid(year, month, ctx) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // понедельник — первый
  const count = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(h('span', { class: 'cycle-day is-empty' }));
  for (let d = 1; d <= count; d++) {
    const iso = isoDate(new Date(year, month, d));
    const marked = ctx.days.includes(iso);
    const soon = !marked && ctx.soon.has(iso);
    const cls = `cycle-day${marked ? ' is-period' : ''}${soon ? ' is-soon' : ''}${iso === ctx.today ? ' is-today' : ''}`;
    cells.push(ctx.editable
      ? h('button', { type: 'button', class: cls, 'aria-pressed': String(marked), onclick: () => ctx.toggle(iso) }, String(d))
      : h('span', { class: cls }, String(d)));
  }
  const title = new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(first);
  const names = [...Array(7)].map((_, i) => new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(new Date(2024, 0, 1 + i)).replace('.', ''));
  return h('section', { class: 'cycle-month' },
    h('p', { class: 'cycle-month__title caps' }, title),
    h('div', { class: 'cycle-grid' }, ...names.map((n) => h('span', { class: 'cycle-grid__head' }, n)), ...cells),
  );
}

function content() {
  const man = side.get() === 'man';
  const days = shownDays();
  const box = h('div', { class: 'cycle' });
  if (days === null) {
    box.append(h('p', { class: 'card__text' }, t('cycle.manAlone')));
    return box;
  }
  const today = isoDate();
  const now = new Date();
  const ctx = {
    days,
    soon: predicted(days),
    today,
    editable: !man,
    toggle: (iso) => {
      const own = ownDays();
      saveOwn(own.includes(iso) ? own.filter((d) => d !== iso) : [...own, iso]);
      box.replaceWith(content());
      paint();
    },
  };
  const s = stats(days);
  const next = s.last ? addDays(s.last.start, s.cycle * Math.max(1, Math.ceil((daysBetween(s.last.start, today) + 1) / s.cycle))) : null;
  box.append(
    h('p', { class: 'card__text cycle__lead' }, t(man ? 'cycle.manLead' : 'cycle.lead')),
    ...[-1, 0, 1].map((k) => monthGrid(now.getFullYear(), now.getMonth() + k, ctx)),
    h('ul', { class: 'cycle__legend' },
      h('li', {}, h('span', { class: 'cycle-dot is-period' }), t('cycle.period')),
      h('li', {}, h('span', { class: 'cycle-dot is-soon' }), t('cycle.soon'))),
    s.count >= 1
      ? h('p', { class: 'faint cycle__stats' }, t('cycle.stats', { cycle: s.cycle, len: s.len, next: next ? new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long' }).format(new Date(`${next}T12:00:00`)) : '—' }))
      : h('p', { class: 'faint cycle__stats' }, t(man ? 'cycle.manEmpty' : 'cycle.empty')),
  );
  return box;
}

export function openCalendar() {
  share();
  openSheet({ title: t('cycle.title'), content: content() });
}
