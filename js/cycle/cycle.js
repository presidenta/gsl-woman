import { h, svg, add } from '../core/dom.js';
import { t, locale, formatDate } from '../core/i18n.js';
import { read, write } from '../core/store.js';
import { isoDate, addDays, daysBetween, isValidIso } from '../core/dates.js';
import * as circles from '../circles/circles.js';
import * as side from '../side/side.js';
import { openSheet, closeSheet } from '../ui/sheet.js';
import { icons } from '../ui/icons.js';
import * as settings from '../settings/settings.js';
import * as access from '../access/access.js';

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
   - КАЛЕНДАРЬ ОДИН (владелец 18.11.2026: «один календарь, одни отметки; тот, что в кружке, — оставить как есть»).
     Вид прежний: 90 дней, год, месяцы. Кроме цикла в нём: начало тренинга и дни, пока открыт доступ
     (access.openDays) — зелёным. Поле «Дата старта» (controls.dateField) открывает его же в режиме
     выбора даты: нажал на число — дата выбрана, лист закрылся.

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

/** Ожидаемые дни: от последнего начала — ещё cycles циклов вперёд (обычно три, для «Весь год» — до конца года). */
export function predicted(days, own = null, cycles = 3) {
  const s = stats(days, own);
  if (!s.last) return new Set();
  const out = new Set();
  for (let k = 1; k <= cycles; k++) {
    const start = addDays(s.last.start, s.cycle * k);
    for (let i = 0; i < s.len; i++) out.add(addDays(start, i));
  }
  return out;
}

/* ПОТЕНЦИАЛЬНАЯ ОВУЛЯЦИЯ (владелец 24–25.11.2026: «высчитывать в среднем, подписать — потенциальная овуляция;
   обычно неделя, сделай точный медицинский расчёт; меняется вместе с циклом»).
   Медицина: яйцеклетка живёт 12–24 часа, сперматозоиды — до 5 дней, поэтому зачатие возможно 6 дней подряд, последний
   — день овуляции (Wilcox, NEJM 1995). День овуляции по календарю не угадать точно (Wilcox, BMJ 2000: окно ложится
   на дни 10–17 лишь у 30 % женщин), поэтому календарный метод Огино — Кнауса берёт запас по её же циклам:
     первый день окна = самый короткий цикл − 18, последний = самый длинный цикл − 11 (дни цикла, 1-й — начало месячных).
   При ровном цикле 28 — дни 10–17 (8 дней); чем сильнее гуляет цикл, тем окно шире. Самый вероятный день овуляции —
   за 14 дней до следующих месячных: день (цикл − 14), вторая половина цикла почти у всех 12–16 дней.
   Прошедшие циклы — по их настоящей длине; текущий и будущие — короткий и длинный из последних 12 циклов вместе с
   длиной цикла (своей или по отметкам), поэтому при смене длины окно переезжает. Окно не выходит за свой цикл.
   Видят все, кто видит календарь: она, он по своим отметкам, в паре — оба по общим. */
export const LUTEAL = 14;
export const FIRST_FERTILE = 18;
export const LAST_FERTILE = 11;

/** Окна по циклам: [{ from, to, peak }] по порядку + наборы дней: peak — вероятный день, around — остальные дни окна. */
export function ovulation(days, own = null, cycles = 3) {
  const peak = new Set();
  const around = new Set();
  const list = [];
  const s = stats(days, own);
  if (!s.last) return { peak, around, list };
  const eps = episodes(days);
  const dayOf = (start, n) => addDays(start, n - 1); // n-й день цикла
  const mark = (start, short, long, len) => {
    const first = Math.max(1, short - FIRST_FERTILE);
    const last = Math.min(len - 1, long - LAST_FERTILE);
    const p = dayOf(start, len - LUTEAL);
    for (let n = first; n <= last; n++) around.add(dayOf(start, n));
    peak.add(p);
    list.push({ from: dayOf(start, first), to: dayOf(start, last), peak: p });
  };
  const gaps = [];
  for (let i = 1; i < eps.length; i++) {
    const gap = daysBetween(eps[i - 1].start, eps[i].start);
    // Пропущенный месяц (промежуток длиннее цикла) — это окно не угадать, пропускаем
    if (gap >= CYCLE_MIN && gap <= CYCLE_MAX) { gaps.push(gap); mark(eps[i - 1].start, gap, gap, gap); }
  }
  const recent = [...gaps.slice(-12), s.cycle];
  const short = Math.min(...recent);
  const long = Math.max(...recent);
  // Текущий цикл (k = 0) и ожидаемые вперёд
  for (let k = 0; k <= cycles; k++) mark(addDays(s.last.start, s.cycle * k), short, long, s.cycle);
  for (const p of peak) around.delete(p);
  return { peak, around, list };
}

/** Ближайшее окно: идёт сейчас или следующее ({ from, to, peak }); нет отметок — null. */
export function nextOvulation(days, own = null, today = isoDate()) {
  return ovulation(days, own).list.find((w) => w.to >= today) || null;
}

/* ---------- Кружок в шапке ---------- */

let button = null;

/** Кружок с числом и днём недели. Шапка строится один раз, число освежает paint() при каждой перерисовке. */
export function headerButton() {
  button = h('button', { type: 'button', class: 'icon-btn cycle-btn', 'aria-label': t('cycle.open'), onclick: () => openCalendar() },
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
  // Пульсирует у обеих частей (владелец 18.11.2026: «куда пропала пульсация»): красным — идут месячные, розовым —
  // ожидаются или начнутся через день-два. Подсказка «больше тепла и заботы» — только мужчине.
  const pulse = care !== null;
  const manNote = pulse && side.get() === 'man';
  button.classList.toggle('is-pulse', pulse);
  button.setAttribute('aria-label', manNote ? `${t('cycle.open')}. ${t('cycle.manAlert')}` : t('cycle.open'));
  button.title = manNote ? t('cycle.manAlert') : '';
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

/** История циклов: [{ start, len, cycle }] — cycle от начала до начала следующих, у текущего null. */
export function cycleHistory(days) {
  const eps = episodes(days);
  return eps.map((e, i) => ({ start: e.start, len: e.len, cycle: eps[i + 1] ? daysBetween(e.start, eps[i + 1].start) : null }));
}

/** Статистика года: циклы, начатые в этом году, средние, самый короткий и длинный (только правдоподобные 18–45). */
export function yearStats(days, year) {
  const list = cycleHistory(days).filter((c) => c.start.startsWith(`${year}-`));
  const full = list.map((c) => c.cycle).filter((n) => n && n >= 18 && n <= 45);
  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  return { list, count: list.length, cycle: avg(full), len: avg(list.map((c) => c.len)), min: full.length ? Math.min(...full) : null, max: full.length ? Math.max(...full) : null };
}

/** Окно «90 дней»: 45 дней до сегодня и 45 после (владелец 17.11.2026: «они должны смещаться»). */
export const WINDOW = 45;
export function windowRange(today = isoDate()) {
  return { from: addDays(today, -WINDOW), to: addDays(today, WINDOW) };
}

/* ---------- Календарь ---------- */

const dayMonth = (iso) => new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long' }).format(new Date(`${iso}T12:00:00`));

const weekHeads = () => [...Array(7)].map((_, i) => new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(new Date(2024, 0, 1 + i)).replace('.', ''))
  .map((n, i) => h('span', { class: `cycle-grid__head${i >= 5 ? ' is-weekend' : ''}` }, n));

const inOpen = (iso, ctx) => ctx.open?.kind === 'paid' && iso >= ctx.open.from && iso <= ctx.open.to;
/** Потенциальная овуляция в этот день: 'peak' — самый вероятный день, 'around' — другой день окна, null — нет. */
const ovulOf = (iso, ctx) => (ctx.ovul.peak.has(iso) ? 'peak' : ctx.ovul.around.has(iso) ? 'around' : null);
/* Сердечко (владелец 25.11.2026: «зарождение жизни — красное сердечко»): у вероятного дня — красный контур вокруг
   цифры, без заливки и свечения; у остальных дней окна — маленькое красное сердечко в степени, как плюс в «GSL⁺». */
const HEART = 'M12 21.3C6.6 17.7 2.6 13.9 2.6 9.2 2.6 6.1 5 3.8 7.9 3.8c1.8 0 3.3.9 4.1 2.3.8-1.4 2.3-2.3 4.1-2.3 2.9 0 5.3 2.3 5.3 5.4 0 4.7-4 8.5-9.4 12.1z';
const heartLine = (cls) => svg(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="${HEART}"/></svg>`, cls);
const heartFill = (cls) => svg(`<svg viewBox="0 0 24 24" fill="currentColor"><path d="${HEART}"/></svg>`, cls);
const heartOf = (ov, base) => (ov === 'peak' ? heartLine(`${base}heart`) : ov ? heartFill(`${base}sup`) : null);

/** Ячейка дня и строки праздников этого дня. */
function dayCell(date, ctx) {
  const iso = isoDate(date);
  const md = iso.slice(5);
  const marked = ctx.days.includes(iso);
  const soon = !marked && ctx.soon.has(iso);
  const own = ctx.events.filter((e) => e.md === md);
  const state = STATE[md];
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const ov = ovulOf(iso, ctx);
  const cls = `cycle-day${weekend ? ' is-weekend' : ''}${state ? ' is-state' : ''}${own.length ? ' is-event' : ''}`
    + `${inOpen(iso, ctx) ? ' is-open' : ''}${iso === ctx.picked ? ' is-picked' : ''}`
    + `${marked ? ' is-period' : ''}${soon ? ' is-soon' : ''}${iso === ctx.today ? ' is-today' : ''}${iso === ctx.editing ? ' is-editing' : ''}`
    + `${ov ? ` is-ovul${ov === 'peak' ? ' is-ovul-peak' : ''}` : ''}`;
  const names = [iso === ctx.start ? t('cycle.start') : '', state ? t(state) : '', ...own.map((e) => e.title), ov ? t(ov === 'peak' ? 'cycle.ovulPeak' : 'cycle.ovul') : ''].filter(Boolean);
  const cell = h('button', { type: 'button', class: cls, title: names.join(' · ') || null, 'aria-pressed': String(marked), 'aria-label': ov ? `${dayMonth(iso)}, ${t(ov === 'peak' ? 'cycle.ovulPeak' : 'cycle.ovul')}` : dayMonth(iso), onclick: () => ctx.tap(iso) },
    String(date.getDate()), heartOf(ov, 'cycle-day__'));
  const notes = [
    ...(state ? [h('li', { class: 'is-state' }, `${dayMonth(iso)} — ${t(state)}`)] : []),
    ...own.map((e) => h('li', { class: 'is-event' }, `${dayMonth(iso)} — ${e.title}`)),
  ];
  return { cell, notes };
}

function monthGrid(year, month, ctx) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // понедельник — первый
  const count = new Date(year, month + 1, 0).getDate();
  const cells = [];
  const list = [];
  for (let i = 0; i < lead; i++) cells.push(h('span', { class: 'cycle-day is-empty' }));
  for (let d = 1; d <= count; d++) {
    const { cell, notes } = dayCell(new Date(year, month, d), ctx);
    cells.push(cell);
    list.push(...notes);
  }
  const name = new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(first);
  return h('section', { class: 'cycle-month' },
    h('p', { class: 'cycle-month__title caps' }, name),
    h('div', { class: 'cycle-grid' }, ...weekHeads(), ...cells),
    list.length ? h('ul', { class: 'cycle-month__events' }, ...list) : null,
  );
}

/** Лента «90 дней»: недели подряд с понедельника, сегодня — посередине; над неделей, где начинается месяц, — его
    название. Дни за краем окна — бледные и без нажатия (владелец 17.11.2026: «45 дней до и 45 после»). */
function rollingGrid(ctx) {
  const { from, to } = windowRange(ctx.today);
  const d0 = new Date(`${from}T12:00:00`);
  const start = addDays(from, -((d0.getDay() + 6) % 7));
  const d1 = new Date(`${to}T12:00:00`);
  const end = addDays(to, (7 - d1.getDay()) % 7);
  const thisYear = new Date().getFullYear();
  const monthName = (date) => new Intl.DateTimeFormat(locale(), { month: 'long', ...(date.getFullYear() !== thisYear ? { year: 'numeric' } : {}) }).format(date);
  const rows = [];
  const list = [];
  for (let week = start; week <= end; week = addDays(week, 7)) {
    const dates = [...Array(7)].map((_, i) => new Date(`${addDays(week, i)}T12:00:00`));
    const firstOfMonth = dates.find((x) => x.getDate() === 1 && isoDate(x) >= from && isoDate(x) <= to);
    // Название месяца — над его первым числом (в первой неделе — над первым днём окна)
    const head = firstOfMonth || (week === start ? d0 : null);
    if (head) rows.push(h('p', { class: 'cycle-roll__month caps', style: `grid-column:${((head.getDay() + 6) % 7) + 1} / -1` }, monthName(head)));
    for (const date of dates) {
      const iso = isoDate(date);
      if (iso < from || iso > to) { rows.push(h('span', { class: 'cycle-day is-out' }, String(date.getDate()))); continue; }
      const { cell, notes } = dayCell(date, ctx);
      rows.push(cell);
      list.push(...notes);
    }
  }
  return h('section', { class: 'cycle-month cycle-roll' },
    h('div', { class: 'cycle-grid cycle-grid--heads' }, ...weekHeads()),
    h('div', { class: 'cycle-grid' }, ...rows),
    list.length ? h('ul', { class: 'cycle-month__events' }, ...list) : null,
  );
}

/** «Весь год»: 12 маленьких месяцев с цветными днями; нажатие на месяц — он целиком, с отметками. */
function yearGrid(center, ctx, openMonth) {
  const nowY = new Date().getFullYear();
  const nowM = new Date().getMonth();
  // 13 месяцев: шесть до текущего, текущий — седьмой, посередине, шесть после (владелец 18.11.2026)
  const months = [...Array(13)].map((_, k) => {
    const idx = center - 6 + k;
    const year = Math.floor(idx / 12);
    const m = ((idx % 12) + 12) % 12;
    const first = new Date(year, m, 1);
    const lead = (first.getDay() + 6) % 7;
    const count = new Date(year, m + 1, 0).getDate();
    const dots = [...Array(lead)].map(() => h('i', { class: 'cycle-mini__d is-empty' }));
    for (let d = 1; d <= count; d++) {
      const iso = isoDate(new Date(year, m, d));
      const marked = ctx.days.includes(iso);
      const soon = !marked && ctx.soon.has(iso);
      const ev = ctx.events.some((e) => e.md === iso.slice(5));
      const dow = new Date(year, m, d).getDay();
      const ov = ovulOf(iso, ctx);
      dots.push(h('i', { class: `cycle-mini__d${dow === 0 || dow === 6 ? ' is-weekend' : ''}${STATE[iso.slice(5)] ? ' is-state' : ''}${marked ? ' is-period' : ''}${soon ? ' is-soon' : ''}${ev ? ' is-event' : ''}${iso === ctx.today ? ' is-today' : ''}${inOpen(iso, ctx) ? ' is-open' : ''}${iso === ctx.picked ? ' is-picked' : ''}${ov ? ` is-ovul${ov === 'peak' ? ' is-ovul-peak' : ''}` : ''}` },
        String(d), heartOf(ov, 'cycle-mini__')));
    }
    const name = new Intl.DateTimeFormat(locale(), { month: 'long' }).format(first);
    const title = year === nowY ? name : `${name} ${year}`;
    return h('button', { type: 'button', class: `cycle-mini${year === nowY && m === nowM ? ' is-now' : ''}`, 'aria-label': t('cycle.openMonth', { month: title }), onclick: () => openMonth(year, m) },
      h('span', { class: 'cycle-mini__title caps' }, title),
      h('span', { class: 'cycle-mini__grid' }, ...dots));
  });
  return h('div', { class: 'cycle-year' }, ...months);
}

/** Подпись окна «Весь год»: «май 2026 — май 2027». */
function yearRange(center) {
  const f = (idx) => new Intl.DateTimeFormat(locale(), { month: 'short', year: 'numeric' }).format(new Date(Math.floor(idx / 12), ((idx % 12) + 12) % 12, 1)).replace(' г.', '');
  return `${f(center - 6)} — ${f(center + 6)}`;
}

/** Статистика года: средние и история циклов полосками (цикл — полоса, месячные — красная часть). */
function yearStatsView(days, year, today) {
  const st = yearStats(days, year);
  if (!st.count) return h('p', { class: 'faint cycle__stats' }, t('cycle.yearEmpty'));
  const rows = st.list.map((c) => {
    const len = c.cycle || daysBetween(c.start, today) + 1;
    const width = Math.max(8, Math.min(100, Math.round((len / 45) * 100)));
    const red = Math.min(100, Math.round((c.len / len) * 100));
    return h('li', { class: 'cycle-hist__row' },
      h('span', { class: 'cycle-hist__label' }, c.cycle
        ? t('cycle.row', { date: dayMonth(c.start), cycle: c.cycle, len: c.len })
        : t('cycle.rowNow', { date: dayMonth(c.start), day: len, len: c.len })),
      h('span', { class: 'cycle-hist__bar', style: `width:${width}%` }, h('span', { class: 'cycle-hist__red', style: `width:${red}%` })));
  });
  return h('section', { class: 'cycle-hist' },
    h('p', { class: 'cycle-month__title caps' }, t('cycle.yearStats', { year })),
    h('p', { class: 'cycle__stats' }, t('cycle.count', { n: st.count })),
    st.cycle ? h('p', { class: 'cycle__stats' }, t('cycle.avg', { cycle: st.cycle, len: st.len })) : null,
    st.min ? h('p', { class: 'faint cycle__stats' }, t('cycle.range', { min: st.min, max: st.max })) : null,
    h('ul', { class: 'cycle-hist__list' }, ...rows));
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

/** Галочка ⌄: открывает и закрывает пояснение рядом; открыто — смотрит вверх (владелец 18.11.2026: «с какого перепуга
    буква „и“ — нарисовал галочку»). Свёрнуто по умолчанию. */
function infoButton(open, label, toggle) {
  return h('button', { type: 'button', class: `cycle-info${open ? ' is-open' : ''}`, 'aria-label': label, 'aria-expanded': String(open), onclick: toggle }, svg(icons.chevronRight));
}

/** Одна строка: «Длина цикла  ‹ 27 дн. ›  ⌄»; под галочкой — пояснение, «считать по отметкам» и статистика года
    (extra — её строит вызывающий: «Циклов за год…», «идёт сейчас…» убраны с экрана, владелец 18.11.2026). */
function cycleStepper(s, ownCycle, redraw, extra) {
  const value = ownCycle || s.cycle;
  const step = (d) => { setCycle(clamp(value + d, CYCLE_MIN, CYCLE_MAX)); redraw(); };
  return h('div', { class: 'cycle-len' },
    h('div', { class: 'cycle-len__row' },
      h('span', { class: 'cycle-len__label' }, t('cycle.len.title')),
      h('span', { class: 'cycle-len__step' },
        h('button', { type: 'button', class: 'icon-btn cycle-len__btn', 'aria-label': t('cycle.len.less'), disabled: value <= CYCLE_MIN, onclick: () => step(-1) }, '‹'),
        h('b', { class: 'cycle-len__value' }, t('cycle.len.days', { n: value })),
        h('button', { type: 'button', class: 'icon-btn cycle-len__btn', 'aria-label': t('cycle.len.more'), disabled: value >= CYCLE_MAX, onclick: () => step(1) }, '›')),
      infoButton(lenOpen, t('cycle.helpLabel'), () => { lenOpen = !lenOpen; redraw(); })),
    lenOpen ? h('p', { class: 'faint cycle-len__hint' }, t('cycle.len.hint'),
      ownCycle
        ? h('button', { type: 'button', class: 'cycle-len__auto', onclick: () => { setCycle(null); redraw(); } }, t('cycle.len.auto', { n: s.auto }))
        : h('span', {}, ` ${t('cycle.len.isAuto')}`)) : null,
    lenOpen ? extra?.() : null,
  );
}

let mode = 'period';
let editing = null;
// Выбор даты (поле «Дата старта»): { value, onPick } — тот же календарь, нажатие на число выбирает дату
let pick = null;
// Какие пояснения раскрыты: как отмечать дни (кружок у кнопок) и что такое длина цикла
let helpOpen = false;
let lenOpen = false;
// Вид календаря: 'roll' — 90 дней вокруг сегодня (по умолчанию), 'year' — весь год, 'month' — месяц из года
let view = 'roll';
let shownYear = new Date().getFullYear();
// «Весь год» — окно из 13 месяцев вокруг месяца yearCenter (год*12 + месяц); по умолчанию — текущий в середине
const nowIndex = () => new Date().getFullYear() * 12 + new Date().getMonth();
let yearCenter = nowIndex();
let shownMonth = 0;

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
  const openDays = access.openDays(today);
  const ctx = {
    days,
    soon: predicted(days, sh.cycle, view === 'roll' ? 3 : 15),
    ovul: ovulation(days, sh.cycle, view === 'roll' ? 3 : 15),
    events: events(),
    today,
    editing,
    start: settings.get().startDate,
    open: openDays,
    picked: pick?.value || null,
    tap: (iso) => {
      if (pick && mode === 'pick') { const { onPick } = pick; closeSheet(); onPick(iso); return; }
      if (mode === 'event') { editing = iso; redraw(); return; }
      const own = ownDays();
      saveOwn(own.includes(iso) ? own.filter((d) => d !== iso) : [...own, iso]);
      redraw();
    },
  };
  const s = stats(days, sh.cycle);
  const ovNext = nextOvulation(days, sh.cycle, today);
  const next = s.last ? addDays(s.last.start, s.cycle * Math.max(1, Math.ceil((daysBetween(s.last.start, today) + 1) / s.cycle))) : null;
  add(box,
    // Одна строка: вид (90 дней / весь год) слева; справа «Праздник» и «Месячные» с галочкой — она открывает, как отмечать дни
    h('div', { class: 'cycle-bar', role: 'group' },
      ...['roll', 'year'].map((v) => h('button', {
        type: 'button', class: `btn ${view === v || (v === 'year' && view === 'month') ? 'btn--gold' : 'btn--ghost'} cycle-bar__btn`, 'aria-pressed': String(view === v),
        onclick: () => { view = v; shownYear = now.getFullYear(); yearCenter = nowIndex(); redraw(); },
      }, t(`cycle.view.${v}`))),
      h('span', { class: 'cycle-bar__gap' }),
      ...['event', 'period'].map((m) => h('button', {
        type: 'button', class: `btn ${mode === m ? 'btn--gold' : 'btn--ghost'} cycle-bar__btn`, 'aria-pressed': String(mode === m),
        // При выборе даты (поле «Дата старта») обе кнопки не нажаты и число выбирает дату; нажал «Месячные» или «Праздник» —
        // календарь отмечает дни, ещё раз на ту же — снова выбор даты (владелец 18.11.2026: «один календарь, все кнопки на месте»)
        onclick: () => { mode = pick && mode === m ? 'pick' : m; editing = null; redraw(); },
      }, t(man && m === 'period' ? 'cycle.manMode' : `cycle.mode.${m}`))),
      infoButton(helpOpen, t('cycle.helpLabel'), () => { helpOpen = !helpOpen; redraw(); })),
    pick && mode === 'pick' ? h('p', { class: 'faint cycle__hint' }, t('cycle.pickLead')) : null,
    // Пояснение к «Месячные» — только по галочке
    helpOpen ? h('div', { class: 'cycle__help' },
      h('p', { class: 'card__text' }, alone ? t('cycle.manAlone') : t(man ? 'cycle.manLead' : 'cycle.lead')),
      h('p', { class: 'faint cycle__hint' }, t(man ? 'cycle.manPeriodHint' : 'cycle.periodHint')),
      h('p', { class: 'faint cycle__hint' }, t('cycle.ovulHint'))) : null,
    // Длина цикла — одной строкой
    cycleStepper(s, man ? own().cycle : sh.cycle, redraw, () => yearStatsView(days, now.getFullYear(), today)),
    editing ? eventForm(editing, () => { editing = null; redraw(); }) : null,
    ...(view === 'roll' ? [rollingGrid(ctx)] : []),
    ...(view === 'year' ? [
      h('div', { class: 'cycle-yearnav' },
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('cycle.prevYear'), onclick: () => { yearCenter -= 12; redraw(); } }, '‹'),
        h('b', { class: 'cycle-yearnav__year' }, yearRange(yearCenter)),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('cycle.nextYear'), onclick: () => { yearCenter += 12; redraw(); } }, '›')),
      yearGrid(yearCenter, ctx, (y, m) => { shownYear = y; shownMonth = m; view = 'month'; redraw(); }),
    ] : []),
    ...(view === 'month' ? [
      h('button', { type: 'button', class: 'btn btn--ghost cycle-back', onclick: () => { view = 'year'; redraw(); } }, `‹ ${t('cycle.view.year')}`),
      monthGrid(shownYear, shownMonth, ctx),
    ] : []),
    // Подписи — двумя группами (владелец 25.11.2026: «отделить всё, что связано с женскими днями»). Первая — женские
    // дни: календарь цикла, красное и сердечки ищут глазами в первую очередь; под ней — её числа (цикл, овуляция).
    // Тонкая полоска — и вторая группа, календарь: доступ, государственные праздники, выходные, наши праздники; под
    // ней — срок доступа.
    h('section', { class: 'cycle-key' },
      h('p', { class: 'cycle-key__title caps' }, t(man ? 'cycle.key.her' : 'cycle.key.cycle')),
      h('ul', { class: 'cycle__legend' },
        h('li', {}, h('span', { class: 'cycle-dot is-period' }), t('cycle.period')),
        h('li', {}, h('span', { class: 'cycle-dot is-soon' }), t('cycle.soon')),
        h('li', {}, heartFill('cycle-dot is-ovul'), t('cycle.ovul')),
        h('li', {}, heartLine('cycle-dot is-ovul-peak'), t('cycle.ovulPeak'))),
      s.count >= 1
        ? h('p', { class: 'faint cycle__stats' }, t('cycle.stats', { cycle: s.cycle, len: s.len, next: next ? dayMonth(next) : '—' }))
        : h('p', { class: 'faint cycle__stats' }, t(man ? 'cycle.manEmpty' : 'cycle.empty')),
      // Ближайшая потенциальная овуляция
      ovNext ? h('p', { class: 'faint cycle__stats' }, t('cycle.ovulNext', { from: dayMonth(ovNext.from), to: dayMonth(ovNext.to), peak: dayMonth(ovNext.peak) })) : null),
    h('hr', { class: 'cycle-key__line' }),
    h('section', { class: 'cycle-key' },
      h('p', { class: 'cycle-key__title caps' }, t('cycle.key.calendar')),
      h('ul', { class: 'cycle__legend' },
        openDays.kind === 'paid' ? h('li', {}, h('span', { class: 'cycle-dot is-open' }), t('cycle.openDays')) : null,
        h('li', {}, h('span', { class: 'cycle-dot is-state' }), t('cycle.state')),
        h('li', {}, h('span', { class: 'cycle-dot is-weekend' }), t('cycle.weekend')),
        h('li', {}, h('span', { class: 'cycle-dot is-event' }), t('cycle.event'))),
      // Срок доступа: до какого числа и сколько дней осталось (тест-режим может остановиться в любой момент)
      openDays.kind === 'paid' ? accessNote(openDays) : null),
  );
  return box;
}

/** Строка про доступ под календарём: до какого числа открыто и сколько дней осталось. */
function accessNote(open) {
  return h('p', { class: 'faint cycle__stats cycle__access' }, t(open.left ? 'cycle.access.paid' : 'cycle.access.ended', { date: formatDate(open.to, { day: 'numeric', month: 'long' }), n: open.left }));
}

/** Один календарь, два входа: кружок в шапке и поле «Дата старта». С pick — выбор даты: нажатие на число отдаёт её. */
export function openCalendar(opts = {}) {
  share();
  editing = null;
  helpOpen = false;
  lenOpen = false;
  const mine = opts.pick ? { value: opts.pick.value, onPick: opts.pick.onPick } : null;
  pick = mine;
  mode = mine ? 'pick' : 'period';
  view = 'roll';
  shownYear = new Date().getFullYear();
  yearCenter = nowIndex();
  // Выбираемая дата за краем ленты «90 дней» — сразу её месяц
  const v = mine?.value;
  if (isValidIso(v)) {
    const { from, to } = windowRange();
    if (v < from || v > to) { view = 'month'; shownYear = Number(v.slice(0, 4)); shownMonth = Number(v.slice(5, 7)) - 1; }
  }
  const box = content();
  openSheet({ title: t(mine ? 'cycle.pickTitle' : 'cycle.title'), content: box, onClose: () => { if (pick === mine) pick = null; } });
  pick = mine;
  // Выбранный день, а если его нет — сегодняшний, оказывается на виду
  setTimeout(() => box.isConnected && (box.querySelector('.is-picked') || box.querySelector('.is-today'))?.scrollIntoView({ block: 'center' }), 60);
}

/** Выбор даты тем же календарём (поле «Дата старта»). */
export const pickDate = (value, onPick) => openCalendar({ pick: { value, onPick } });
