import { h, svg } from '../core/dom.js';
import { t, list } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { foldCard } from '../ui/fold.js';
import { KINDS, GOLDEN, chosenOf, setItem, setItems } from './water.js';
import * as waterLog from './water-log.js';
import { icon } from './art.js';
import { glassNode, surfaceOf } from './glass.js';

/* КАРТОЧКА «СТАКАН ТЁПЛОЙ ВОДЫ» на «Сегодня» — ПЕРВОЙ, до утренней минуты (вода сразу после пробуждения, лёгкое
   движение — через 10–15 минут).

   Владелец 13.11.2026, сборка 40:
   - карточка сворачивается стрелкой (ui/fold.js): свёрнута — маленький стакан и строка «сразу после пробуждения…»;
   - составляющие стоят ВОКРУГ стакана: четыре слева, четыре справа — место экономится, стакан в центре;
   - нажал — галочка, составляющая дугой летит в стакан, падает со всплеском и остаётся в нём; вода меняет цвет;
     нажал ещё раз — тает и уходит. Выбор запоминается (water.js → настройки) и наутро уже в стакане;
   - под стаканом — идеальная температура: 37–40 °C, тёплая, как тело;
   - «Я выпила стакан» — отметка дня (water-log.js) для итогов «Утро»;
   - «Состав и польза» — раскрывается стрелкой: доза и конкретная польза каждой составляющей, «бережно» и
     «Золотая смесь» (куркума + перец + мёд) — собирается в стакан одной кнопкой.

   Полёт — копия значка поверх страницы (Web Animations), так он переживает перерисовку экрана. Откуда и куда
   лететь, ищем в момент полёта по странице: за время полёта экран мог перерисоваться. Выбор записываем, когда
   составляющая долетела, — перерисованный стакан покажет её уже в воде, со всплеском (fresh). При «меньше
   движения» в системе — без полёта, сразу. */

const FLIGHT_MS = 860;
const FRESH_MS = 1600;
const GONE_MS = 900;
const GOLDEN_GAP_MS = 170;

/* Состояние — у каждого стакана своё (утро и ночь стоят на одном экране): fresh — только что упали (всплеск),
   gone — только что убрана (тает), flying — летят сейчас, info — раскрыт «Состав и польза». */
const state = {};
const st = (kind) => (state[kind] ||= { fresh: null, gone: null, flying: new Set(), info: false });

const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = (kind) => KINDS[kind].texts;
const nameOf = (k, kind) => t(`${base(kind)}.items.${k}.name`);
const root = (kind) => `.water[data-kind="${kind}"]`;

function artSpan(k, cls) {
  const el = h('span', { class: cls, 'aria-hidden': 'true' });
  el.innerHTML = icon(k);
  return el;
}

// Где сейчас на странице значок составляющей и поверхность воды
const chipArt = (k, kind) => document.querySelector(`${root(kind)} .water-chip[data-item="${k}"] .water-chip__art`);
const surfaceNow = (kind) => {
  const el = document.querySelector(`${root(kind)} .wg`);
  return el ? surfaceOf(el) : null;
};

/** Полёт значка по дуге: от значка у стакана к поверхности воды. */
function fly(fromEl, kind) {
  const to = surfaceNow(kind);
  if (!fromEl || !to) return Promise.resolve();
  const a = fromEl.getBoundingClientRect();
  const sx = a.left + a.width / 2;
  const sy = a.top + a.height / 2;
  // Вершина дуги — выше и стакана, и значка: составляющую «подбрасывают» в стакан
  const cx = (sx + to.x) / 2;
  const cy = Math.min(sy, to.y) - Math.max(56, Math.abs(sx - to.x) * 0.6);
  const clone = document.createElement('div');
  clone.className = 'water-fly';
  clone.innerHTML = fromEl.innerHTML;
  Object.assign(clone.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
  document.body.append(clone);

  const frames = [];
  const steps = 18;
  const turn = sx < to.x ? 200 : -200;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const x = (1 - k) ** 2 * sx + 2 * (1 - k) * k * cx + k ** 2 * to.x;
    const y = (1 - k) ** 2 * sy + 2 * (1 - k) * k * cy + k ** 2 * to.y;
    const scale = 1 + 0.4 * Math.sin(Math.PI * k) - 0.55 * k ** 2;
    frames.push({
      transform: `translate(${(x - sx).toFixed(1)}px, ${(y - sy).toFixed(1)}px) rotate(${(turn * k).toFixed(1)}deg) scale(${scale.toFixed(3)})`,
      opacity: k > 0.88 ? (1 - k) / 0.12 : 1,
      offset: k,
    });
  }
  const anim = clone.animate(frames, { duration: FLIGHT_MS, easing: 'cubic-bezier(.4, .02, .5, 1)' });
  return anim.finished.catch(() => {}).then(() => clone.remove());
}

function mark(k, on, kind) {
  const chip = document.querySelector(`${root(kind)} .water-chip[data-item="${k}"]`);
  if (!chip) return;
  chip.classList.toggle('is-on', on);
  chip.setAttribute('aria-checked', String(on));
}

async function toggle(k, kind) {
  const s = st(kind);
  if (s.flying.has(k)) return;
  const add = !chosenOf(kind).includes(k);
  mark(k, add, kind);
  if (!add) {
    s.gone = { item: k, at: Date.now() };
    setItem(k, false, kind);
    return;
  }
  if (!reduced()) {
    s.flying.add(k);
    await fly(chipArt(k, kind), kind);
    s.flying.delete(k);
  }
  s.fresh = { items: [k], at: Date.now() };
  setItem(k, true, kind);
}

/** «Золотая смесь»: недостающие из трёх летят в стакан друг за другом. */
async function addGolden() {
  const s = st('morning');
  const missing = GOLDEN.filter((k) => !chosenOf('morning').includes(k) && !s.flying.has(k));
  if (!missing.length) return;
  missing.forEach((k) => mark(k, true, 'morning'));
  if (!reduced()) {
    missing.forEach((k) => s.flying.add(k));
    // Стакан мог уйти выше экрана, пока человек читал состав, — сначала показываем его
    document.querySelector(`${root('morning')} .water__stage`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await wait(480);
    await Promise.all(missing.map((k, i) => wait(i * GOLDEN_GAP_MS).then(() => fly(chipArt(k, 'morning'), 'morning'))));
    missing.forEach((k) => s.flying.delete(k));
  }
  s.fresh = { items: missing, at: Date.now() };
  setItems(missing, true);
}

function chip(k, on, kind) {
  const amount = t(`${base(kind)}.items.${k}.amount`);
  return h('button', {
    type: 'button',
    class: `water-chip${on ? ' is-on' : ''}`,
    role: 'checkbox',
    'aria-checked': String(on),
    'aria-label': `${nameOf(k, kind)} — ${amount}`,
    dataset: { item: k },
    onclick: () => toggle(k, kind),
  },
  h('span', { class: 'water-chip__medal' },
    artSpan(k, 'water-chip__art'),
    h('span', { class: 'water-chip__check', 'aria-hidden': 'true' }, svg(icons.check)),
  ),
  h('span', { class: 'water-chip__name', 'aria-hidden': 'true' }, nameOf(k, kind)),
  );
}

// Под стаканом — что в нём сейчас, одной строкой
function nowLine(items, kind) {
  if (!items.length) return h('p', { class: 'water__now' }, t(`${base(kind)}.plain`));
  return h('p', { class: 'water__now' },
    h('span', { class: 'caps water__now-label' }, t(`${base(kind)}.mine`)),
    h('span', {}, items.map((k) => nameOf(k, kind).toLowerCase()).join(' · ')),
  );
}

function goldenBlock(items) {
  const inGlass = GOLDEN.every((k) => items.includes(k));
  return h('div', { class: `water-gold${inGlass ? ' is-in' : ''}` },
    h('div', { class: 'water-gold__icons', 'aria-hidden': 'true' }, ...GOLDEN.map((k) => artSpan(k, 'water-gold__art'))),
    h('div', { class: 'water-gold__text' },
      h('p', { class: 'water-gold__title' }, t('morning.water.golden.title')),
      h('p', { class: 'water-gold__desc' }, t('morning.water.golden.text')),
    ),
    inGlass
      ? h('p', { class: 'water-gold__done' }, svg(icons.check, 'water-gold__done-icon'), t('morning.water.golden.done'))
      : h('button', { type: 'button', class: 'btn btn--gold btn--quiet water-gold__add', onclick: addGolden }, t('morning.water.golden.add')),
  );
}

function infoItem(k, on, kind) {
  const b = base(kind);
  const key = `${b}.items.${k}`;
  return h('article', { class: `water-info__item${on ? ' is-on' : ''}` },
    h('div', { class: 'water-info__head' },
      artSpan(k, 'water-info__art'),
      h('div', { class: 'water-info__titles' },
        h('h3', { class: 'water-info__name' }, nameOf(k, kind), on ? h('span', { class: 'water-info__in' }, t(`${b}.inGlass`)) : null),
        h('p', { class: 'water-info__dose' },
          h('span', { class: 'water-info__dose-label' }, t(`${b}.dose`)),
          t(`${key}.amount`),
        ),
      ),
    ),
    h('p', { class: 'water-info__benefit' }, t(`${key}.benefit`)),
    h('ul', { class: 'water-info__points' }, ...list(`${key}.points`).map((p) => h('li', {}, p))),
    h('p', { class: 'water-info__care' },
      h('span', { class: 'water-info__care-label' }, t(`${b}.careLabel`)),
      t(`${key}.care`),
    ),
  );
}

// «Состав и польза» — свёрнут; стрелка раскрывает: золотая смесь, каждая составляющая, общая оговорка
function info(items, kind) {
  const b = base(kind);
  const s = st(kind);
  const box = h('details', { class: 'water-info' },
    h('summary', { class: 'water-info__summary' },
      h('span', { class: 'water-info__mark', 'aria-hidden': 'true' }, svg(icons.sparkle)),
      h('span', { class: 'water-info__heading' },
        h('span', { class: 'water-info__title' }, t(`${b}.info`)),
        h('span', { class: 'water-info__hint' }, t(`${b}.infoHint`)),
      ),
      h('span', { class: 'fold__arrow water-info__arrow' }, svg(icons.chevronRight, 'fold__chevron')),
    ),
    h('div', { class: 'water-info__body' },
      kind === 'morning' ? goldenBlock(items) : null,
      ...KINDS[kind].items.map((k) => infoItem(k, items.includes(k), kind)),
      h('p', { class: 'faint water__care' }, t(`${b}.care`)),
    ),
  );
  box.open = s.info;
  box.addEventListener('toggle', () => { s.info = box.open; });
  return box;
}

/** Карточка стакана: kind — morning (утро, до минуты) или night (на ночь, в конце дня). */
export function waterCard(ctx, kind = 'morning') {
  const b = base(kind);
  const s = st(kind);
  const all = KINDS[kind].items;
  const items = chosenOf(kind, ctx.settings[KINDS[kind].setting]);
  const names = items.map((k) => nameOf(k, kind).toLowerCase()).join(', ');
  const glass = glassNode(items, {
    kind,
    fresh: s.fresh && Date.now() - s.fresh.at < FRESH_MS ? s.fresh.items : [],
    gone: s.gone && Date.now() - s.gone.at < GONE_MS ? s.gone.item : null,
    label: t(`${b}.glass`, { list: names || t(`${b}.plainShort`) }),
  });
  const log = waterLog.logOf(kind);
  const done = log.isDone(ctx.todayIso);
  const on = (k) => items.includes(k) || s.flying.has(k);
  const half = Math.ceil(all.length / 2);

  const glassSlot = h('div', { class: 'water__glass' });
  const stage = h('div', { class: 'water__stage' },
    h('div', { class: 'water__side', role: 'group', 'aria-label': t(`${b}.pick`) }, ...all.slice(0, half).map((k) => chip(k, on(k), kind))),
    h('div', { class: 'water__center' },
      glassSlot,
      // Идеальная температура (владелец 13.11.2026): тёплая, как тело — 37–40 °C; в такой и мёд сохраняет пользу
      h('p', { class: 'water__temp' },
        svg(icons.thermo, 'water__temp-icon'),
        h('strong', { class: 'water__temp-value' }, t(`${b}.temp`)),
        h('span', { class: 'water__temp-hint' }, t(`${b}.tempHint`)),
      ),
    ),
    h('div', { class: 'water__side', role: 'group', 'aria-label': t(`${b}.pick`) }, ...all.slice(half).map((k) => chip(k, on(k), kind))),
  );

  const drink = h('button', {
    type: 'button',
    class: `btn btn--block water__drink${done ? ' is-done' : ' btn--gold'}`,
    'aria-pressed': String(done),
    onclick: () => log.setDone(ctx.todayIso, !done),
  }, svg(icons.check, 'water__drink-icon'), done ? t(`${b}.drunk`) : t(`${b}.drink`));

  const fold = foldCard({
    id: kind === 'night' ? 'water-night' : 'water',
    cls: `water water--${kind}`,
    icon: kind === 'night' ? icons.moon : icons.cup,
    title: t(`${b}.title`),
    lead: t(`${b}.short`),
    status: done ? h('span', { class: 'fold__done', title: t(`${b}.drunk`) }, svg(icons.check)) : null,
    body: [
      h('p', { class: 'card__text water__lead' }, t(`${b}.lead`)),
      h('p', { class: 'water__pick' }, t(`${b}.pick`)),
      stage,
      nowLine(items, kind),
      h('div', { class: 'card__actions' }, drink),
      info(items, kind),
    ],
    // Один стакан на карточку: свёрнута — он в шапке, раскрыта — в центре, между составляющими
    onToggle: (open) => (open ? glassSlot : fold.thumb).append(glass.node),
  });
  fold.node.dataset.kind = kind;
  return fold.node;
}

/** Для проверок: забыть отметки полёта. */
export function _reset() {
  for (const k of Object.keys(state)) delete state[k];
}
