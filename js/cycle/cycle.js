import { h, add } from '../core/dom.js';
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
   - Мужчина отмечает её дни и сам — в паре и без пары (владелец 17.11.2026: «даже если они встречаются и не пара,
     он может узнать, когда у неё были, и себе приблизительно знать»). Его отметки — только на его телефоне; в паре
     к ним добавляются её. Есть дни в календаре — расчёт и пульсация работают.
   - Календарь открывается у всех (владелец: «у мужчины тоже — просто без отметок»): выходные, государственные
     праздники и свои праздники пары — золотом.

   Хранение: у женщины — на телефоне (ключ cycle: { days: [iso…], cycle: своя длина | null }); в паре — копия записью
   cycle/days, мужчина читает её оттуда. Отметки мужчины — на его телефоне, ключ cycle-her (тот же вид); в пару они
   не уходят. Держим последние 400 дней. */

const KEY = 'cycle';
const KEY_MAN = 'cycle-her';
const key = () => (side.get() === 'man' ? KEY_MAN : KEY);
const KEEP = 400;
const DEFAULT_CYCLE = 28;
const DEFAULT_LEN = 5;
/* Длина цикла — своя (владелец 17.11.2026: «у кого-то больше, у кого-то меньше; стандартно пускай как сейчас, но с
   возможностью изменить»). Пока не трогала — считается по отметкам; стрелками ‹ › — своё число. Пределы — как у
   врачей с запасом: от 18 до 45 дней (норма — 21–35). */
export const CYCLE_MIN = 18;
export const CYCLE_MAX = 45;

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

function own() {
  const v = read(key(), {});
  return {
    days: Array.isArray(v?.days) ? v.days.filter(isValidIso) : [],
    cycle: Number.isInteger(v?.cycle) && v.cycle >= CYCLE_MIN && v.cycle <= CYCLE_MAX ? v.cycle : null,
  };
}

const ownDays = () => own().days;

function saveOwn(days, cycle = own().cycle) {
  const list = [...new Set(days)].sort().slice(-KEEP);
  write(key(), { days: list, cycle });
  share();
}

/** Своя длина цикла (null — считать по отметкам). */
function setCycle(n) {
  saveOwn(ownDays(), n === null ? null : clamp(n, CYCLE_MIN, CYCLE_MAX));
}

/** У женщины в паре — копия её дней и длины цикла в паре (мужчина видит). Ничего не изменилось — ничего не шлём. */
export function share() {
  if (side.get() === 'man') return;
  const pair = circles.pair();
  if (!pair || !circles.isComplete(pair)) return;
  const mine = own();
  const now = circles.item(pair.id, 'cycle', 'days')?.data || {};
  if (JSON.stringify(now.days || []) !== JSON.stringify(mine.days) || (now.cycle ?? null) !== mine.cycle) {
    circles.put(pair.id, 'cycle', 'days', { days: mine.days, cycle: mine.cycle });
  }
}

/** Что показывать: у женщины — свои дни; у мужчины — его отметки её дней и, в паре, её отметки. Длина цикла у
    мужчины — его своя, а без неё — её. */
function shown() {
  const mine = own();
  if (side.get() !== 'man') return mine;
  const her = herShared();
  return { days: [...new Set([...mine.days, ...her.days])].sort(), cycle: mine.cycle ?? her.cycle };
}

/** Для проверок: что сейчас показывает календарь. */
export const _shown = () => shown();

/** Её дни из пары (у мужчины). Пары нет — пусто. */
function herShared() {
  const pair = pairOk();
  const d = pair ? circles.item(pair.id, 'cycle', 'days')?.data || {} : {};
  return { days: Array.isArray(d.days) ? d.days.filter(isValidIso) : [], cycle: Number.isInteger(d.cycle) ? d.cycle : null };
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
export function stats(days, own = null) {
  const eps = episodes(days).slice(-7);
  const gaps = eps.slice(1).map((e, i) => daysBetween(eps[i].start, e.start)).filter((g) => g >= 18 && g <= 45);
  const cycle = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : DEFAULT_CYCLE;
  const lens = eps.map((e) => e.len);
  const len = lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : DEFAULT_LEN;
  return { cycle: own || clamp(cycle, 21, 40), auto: clamp(cycle, 21, 40), len: clamp(len, 2, 8), last: eps[eps.length - 1] || null, count: eps.length };
}

/** Ожидаемые дни: от последнего начала — ещё три цикла вперёд. */
export function predicted(days, own = null) {
  const s = stats(days, own);
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
  const sh = shown();
  const today = isoDate();
  const care = careToday(sh.days, sh.cycle, today);
  button.classList.toggle('is-period', care === 'period');
  button.classList.toggle('is-soon', care === 'soon' || care === 'near');
  // У мужчины кружок пульсирует в её дни и за два дня до ожидаемых (владелец 17.11.2026: «чтобы мужчина не мог просто
  // не обратить внимания»)
  const pulse = side.get() === 'man' && care !== null;
  button.classList.toggle('is-pulse', pulse);
  button.setAttribute('aria-label', pulse ? `${t('cycle.open')}. ${t('cycle.manAlert')}` : t('cycle.open'));
  button.title = pulse ? t('cycle.manAlert') : '';
}

/** Что сегодня: 'period' — отмеченный день, 'soon' — ожидаемый, 'near' — ожидаемые через день-два, null — обычный. */
export function careToday(days, ownCycle, today = isoDate()) {
  if (days.includes(today)) return 'period';
  const soon = predicted(days, ownCycle);
  if (soon.has(today)) return 'soon';
  return [1, 2].some((k) => soon.has(addDays(today, k))) ? 'near' : null;
}

/* ---------- Праздники ---------- */

/* Государственные праздники Украины — постоянные даты (владелец 17.11.2026: «праздники государственные тоже
   выделены»). Пасха и Троица меняют дату каждый год — их отмечают сами, своими праздниками. */
const STATE = {
  '01-01': 'cycle.holidays.newYear', '03-08': 'cycle.holidays.women', '05-01': 'cycle.holidays.labour', '05-08': 'cycle.holidays.memory',
  '06-28': 'cycle.holidays.constitution', '07-15': 'cycle.holidays.statehood', '08-24': 'cycle.holidays.independence',
  '10-01': 'cycle.holidays.defenders', '12-25': 'cycle.holidays.christmas',
};

/* СВОИ ПРАЗДНИКИ — каждый год в этот день (день знакомства, свадьбы, дни рождения): { md: 'ММ-ДД', title }.
   В паре — общие: запись пары events/list, править может каждый из двоих. Без пары — на телефоне (ключ events).
   Вошли в пару — свои праздники переносятся в общий список. */
const EV_KEY = 'events';
const MD = /^\d{2}-\d{2}$/;

function pairOk() {
  const pair = circles.pair();
  return pair && circles.isComplete(pair) ? pair : null;
}

function localEvents() {
  const v = read(EV_KEY, {});
  return Array.isArray(v?.list) ? v.list.filter((e) => MD.test(e?.md) && e.title) : [];
}

export function events() {
  const pair = pairOk();
  if (!pair) return localEvents();
  const list = circles.item(pair.id, 'events', 'list')?.data?.list;
  return Array.isArray(list) ? list.filter((e) => MD.test(e?.md) && e.title) : [];
}

function saveEvents(list) {
  const clean = list.filter((e) => e.title).slice(0, 200);
  const pair = pairOk();
  if (pair) circles.put(pair.id, 'events', 'list', { list: clean });
  else write(EV_KEY, { list: clean });
}

/** Вошли в пару — свои праздники с телефона уходят в общий список (один раз). */
function mergeEvents() {
  const pair = pairOk();
  const mine = localEvents();
  if (!pair || !mine.length) return;
  const now = events();
  const add = mine.filter((e) => !now.some((x) => x.md === e.md && x.title === e.title));
  if (add.length) saveEvents([...now, ...add]);
  write(EV_KEY, { list: [] });
}

/* ---------- Календарь ---------- */

const dayMonth = (iso) => new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long' }).format(new Date(`${iso}T12:00:00`));

function monthGrid(year, month, ctx) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // понедельник — первый
  const count = new Date(year, month + 1, 0).getDate();
  const cells = [];
  const list = [];
  for (let i = 0; i < lead; i++) cells.push(h('span', { class: 'cycle-day is-empty' }));
  for (let d = 1; d <= count; d++) {
    const date = new Date(year, month, d);
    const iso = isoDate(date);
    const md = iso.slice(5);
    const marked = ctx.days.includes(iso);
    const soon = !marked && ctx.soon.has(iso);
    const own = ctx.events.filter((e) => e.md === md);
    const state = STATE[md];
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const cls = `cycle-day${weekend ? ' is-weekend' : ''}${state ? ' is-state' : ''}${own.length ? ' is-event' : ''}`
      + `${marked ? ' is-period' : ''}${soon ? ' is-soon' : ''}${iso === ctx.today ? ' is-today' : ''}${iso === ctx.editing ? ' is-editing' : ''}`
      + `${ctx.pulse && (marked || soon) && iso >= ctx.today ? ' is-pulse' : ''}`;
    const names = [state ? t(state) : '', ...own.map((e) => e.title)].filter(Boolean);
    cells.push(h('button', { type: 'button', class: cls, title: names.join(' · ') || null, 'aria-pressed': String(marked), onclick: () => ctx.tap(iso) }, String(d)));
    if (state) list.push(h('li', { class: 'is-state' }, `${d} — ${t(state)}`));
    for (const e of own) list.push(h('li', { class: 'is-event' }, `${d} — ${e.title}`));
  }
  const name = new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(first);
  const heads = [...Array(7)].map((_, i) => new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(new Date(2024, 0, 1 + i)).replace('.', ''));
  return h('section', { class: 'cycle-month' },
    h('p', { class: 'cycle-month__title caps' }, name),
    h('div', { class: 'cycle-grid' }, ...heads.map((n, i) => h('span', { class: `cycle-grid__head${i >= 5 ? ' is-weekend' : ''}` }, n)), ...cells),
    list.length ? h('ul', { class: 'cycle-month__events' }, ...list) : null,
  );
}

/** Форма своего праздника: подпись дня, «Сохранить», «Убрать». */
function eventForm(iso, done) {
  const md = iso.slice(5);
  const now = events();
  const mine = now.find((e) => e.md === md);
  const input = h('input', { type: 'text', class: 'input', maxlength: '60', value: mine?.title || '', placeholder: t('cycle.eventPh'), 'aria-label': t('cycle.eventPh') });
  const save = () => {
    const title = input.value.trim();
    saveEvents([...now.filter((e) => e.md !== md), ...(title ? [{ md, title }] : [])]);
    done();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  setTimeout(() => input.focus(), 50);
  return h('div', { class: 'cycle-event' },
    h('p', { class: 'caps cycle-event__date' }, dayMonth(iso)),
    input,
    h('div', { class: 'cycle-event__actions' },
      h('button', { type: 'button', class: 'btn btn--gold', onclick: save }, t('cycle.eventSave')),
      mine ? h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => { saveEvents(now.filter((e) => e.md !== md)); done(); } }, t('cycle.eventRemove')) : null,
      h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => done() }, t('common.cancel'))),
  );
}

/** ‹ 27 дн. › и пояснение, что это за число. own — своё число или null (считается по отметкам). */
function cycleStepper(s, ownCycle, redraw) {
  const value = ownCycle || s.cycle;
  const step = (d) => { setCycle(clamp(value + d, CYCLE_MIN, CYCLE_MAX)); redraw(); };
  return h('div', { class: 'cycle-len' },
    h('div', { class: 'cycle-len__row' },
      h('span', { class: 'cycle-len__label' }, t('cycle.len.title')),
      h('button', { type: 'button', class: 'icon-btn cycle-len__btn', 'aria-label': t('cycle.len.less'), disabled: value <= CYCLE_MIN, onclick: () => step(-1) }, '‹'),
      h('b', { class: 'cycle-len__value' }, t('cycle.len.days', { n: value })),
      h('button', { type: 'button', class: 'icon-btn cycle-len__btn', 'aria-label': t('cycle.len.more'), disabled: value >= CYCLE_MAX, onclick: () => step(1) }, '›')),
    h('p', { class: 'faint cycle-len__hint' }, t('cycle.len.hint'),
      ownCycle
        ? h('button', { type: 'button', class: 'cycle-len__auto', onclick: () => { setCycle(null); redraw(); } }, t('cycle.len.auto', { n: s.auto }))
        : h('span', {}, ` ${t('cycle.len.isAuto')}`)),
  );
}

let mode = 'period';
let editing = null;

function content() {
  mergeEvents();
  const man = side.get() === 'man';
  const sh = shown();
  const days = sh.days;
  const alone = man && !pairOk();
  const box = h('div', { class: 'cycle' });
  const redraw = () => { box.replaceWith(content()); paint(); };
  const today = isoDate();
  const now = new Date();
  const ctx = {
    days,
    soon: predicted(days, sh.cycle),
    events: events(),
    today,
    editing,
    pulse: man, // у мужчины её дни — сегодняшние и будущие — пульсируют
    tap: (iso) => {
      if (mode === 'event') { editing = iso; redraw(); return; }
      const own = ownDays();
      saveOwn(own.includes(iso) ? own.filter((d) => d !== iso) : [...own, iso]);
      redraw();
    },
  };
  const s = stats(days, sh.cycle);
  const next = s.last ? addDays(s.last.start, s.cycle * Math.max(1, Math.ceil((daysBetween(s.last.start, today) + 1) / s.cycle))) : null;
  add(box,
    h('p', { class: 'card__text cycle__lead' }, alone ? t('cycle.manAlone') : t(man ? 'cycle.manLead' : 'cycle.lead')),
    // Что отмечаем нажатием: месячные (у мужчины — её дни) или праздник
    h('div', { class: 'cycle-mode', role: 'group' },
      ...['period', 'event'].map((m) => h('button', {
        type: 'button', class: `btn ${mode === m ? 'btn--gold' : 'btn--ghost'} cycle-mode__btn`, 'aria-pressed': String(mode === m),
        onclick: () => { mode = m; editing = null; redraw(); },
      }, t(man && m === 'period' ? 'cycle.manMode' : `cycle.mode.${m}`)))),
    // Длина цикла: ‹ 27 дн. › — своё число; «по отметкам» — вернуть расчёт
    cycleStepper(s, man ? own().cycle : sh.cycle, redraw),
    editing ? eventForm(editing, () => { editing = null; redraw(); }) : h('p', { class: 'faint cycle__hint' }, t(mode === 'event' ? 'cycle.eventHint' : man ? 'cycle.manPeriodHint' : 'cycle.periodHint')),
    ...[-1, 0, 1].map((k) => monthGrid(now.getFullYear(), now.getMonth() + k, ctx)),
    h('ul', { class: 'cycle__legend' },
      h('li', {}, h('span', { class: 'cycle-dot is-period' }), t('cycle.period')),
      h('li', {}, h('span', { class: 'cycle-dot is-soon' }), t('cycle.soon')),
      h('li', {}, h('span', { class: 'cycle-dot is-event' }), t('cycle.event')),
      h('li', {}, h('span', { class: 'cycle-dot is-state' }), t('cycle.state')),
      h('li', {}, h('span', { class: 'cycle-dot is-weekend' }), t('cycle.weekend'))),
    (s.count >= 1
      ? h('p', { class: 'faint cycle__stats' }, t('cycle.stats', { cycle: s.cycle, len: s.len, next: next ? dayMonth(next) : '—' }))
      : h('p', { class: 'faint cycle__stats' }, t(man ? 'cycle.manEmpty' : 'cycle.empty'))),
  );
  return box;
}

export function openCalendar() {
  share();
  editing = null;
  openSheet({ title: t('cycle.title'), content: content() });
}
