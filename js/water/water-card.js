import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { ITEMS, chosen, setItem } from './water.js';
import { icon } from './art.js';
import { glassNode } from './glass.js';

/* КАРТОЧКА «СТАКАН ТЁПЛОЙ ВОДЫ» на «Сегодня» — ПЕРВОЙ, до утренней минуты (владелец 13.11.2026; источники: вода сразу
   после пробуждения возмещает ночную потерю, лёгкое движение — после неё). Слева — большой стакан, справа — составляющие
   в столбик. Нажал — галочка, составляющая дугой летит в стакан, падает со всплеском и остаётся в нём; вода меняет
   цвет. Нажал ещё раз — тает и уходит. Выбор запоминается (water.js → настройки) и наутро уже в стакане.

   Полёт — копия значка поверх страницы (Web Animations), так он переживает перерисовку экрана. Записываем выбор,
   только когда составляющая долетела: перерисованный стакан покажет её уже в воде, со всплеском (fresh). При
   «меньше движения» в системе — без полёта, сразу. */

const FLIGHT_MS = 860;
const FRESH_MS = 1600;
const GONE_MS = 900;

let fresh = null; // { item, at } — только что упала: всплеск и появление
let gone = null; // { item, at } — только что убрана: тает
let flying = new Set();

const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const recent = (mark, ms) => (mark && Date.now() - mark.at < ms ? mark.item : null);

/** Полёт значка по дуге: от строки столбика к поверхности воды. */
function fly(fromEl, to) {
  const a = fromEl.getBoundingClientRect();
  const sx = a.left + a.width / 2;
  const sy = a.top + a.height / 2;
  // Вершина дуги — выше и стакана, и строки: составляющую «подбрасывают» в стакан
  const cx = (sx + to.x) / 2;
  const cy = Math.min(sy, to.y) - Math.max(70, Math.abs(sx - to.x) * 0.5);
  const clone = document.createElement('div');
  clone.className = 'water-fly';
  clone.innerHTML = fromEl.innerHTML;
  Object.assign(clone.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
  document.body.append(clone);

  const frames = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const x = (1 - k) ** 2 * sx + 2 * (1 - k) * k * cx + k ** 2 * to.x;
    const y = (1 - k) ** 2 * sy + 2 * (1 - k) * k * cy + k ** 2 * to.y;
    const scale = 1 + 0.35 * Math.sin(Math.PI * k) - 0.55 * k ** 2;
    frames.push({
      transform: `translate(${(x - sx).toFixed(1)}px, ${(y - sy).toFixed(1)}px) rotate(${(-200 * k).toFixed(1)}deg) scale(${scale.toFixed(3)})`,
      opacity: k > 0.88 ? (1 - k) / 0.12 : 1,
      offset: k,
    });
  }
  const anim = clone.animate(frames, { duration: FLIGHT_MS, easing: 'cubic-bezier(.4, .02, .5, 1)' });
  return anim.finished.catch(() => {}).then(() => clone.remove());
}

function summary(items) {
  if (!items.length) return h('p', { class: 'water__plain' }, t('morning.water.plain'));
  return h('div', { class: 'water__mine' },
    h('p', { class: 'caps water__mine-title' }, t('morning.water.mine')),
    h('ul', { class: 'water__mine-list' },
      ...items.map((k) => h('li', {},
        h('strong', {}, t(`morning.water.items.${k}.name`)),
        h('span', { class: 'dim' }, ` — ${t(`morning.water.items.${k}.amount`)}: ${t(`morning.water.items.${k}.benefit`)}`),
      )),
    ),
  );
}

export function waterCard(ctx) {
  const items = chosen(ctx.settings.water);
  const names = items.map((k) => t(`morning.water.items.${k}.name`).toLowerCase()).join(', ');
  const glass = glassNode(items, {
    fresh: recent(fresh, FRESH_MS),
    gone: recent(gone, GONE_MS),
    label: t('morning.water.glass', { list: names || t('morning.water.plainShort') }),
  });

  const rows = ITEMS.map((k) => {
    const on = items.includes(k) || flying.has(k);
    const art = h('span', { class: 'water__art', 'aria-hidden': 'true' });
    art.innerHTML = icon(k);
    const row = h('button', {
      type: 'button',
      class: `water__item${on ? ' is-on' : ''}`,
      role: 'checkbox',
      'aria-checked': String(on),
    },
    art,
    h('span', { class: 'water__item-text' },
      h('span', { class: 'water__item-name' }, t(`morning.water.items.${k}.name`)),
      h('span', { class: 'water__item-amount' }, t(`morning.water.items.${k}.amount`)),
    ),
    h('span', { class: 'water__check', 'aria-hidden': 'true' }, svg(icons.check)),
    );
    row.addEventListener('click', async () => {
      if (flying.has(k)) return;
      const add = !chosen().includes(k);
      row.classList.toggle('is-on', add);
      row.setAttribute('aria-checked', String(add));
      if (!add) {
        gone = { item: k, at: Date.now() };
        setItem(k, false);
        return;
      }
      if (!reduced()) {
        flying.add(k);
        await fly(art, glass.surface());
        flying.delete(k);
      }
      fresh = { item: k, at: Date.now() };
      setItem(k, true);
    });
    return row;
  });

  return h('section', { class: 'card water' },
    h('div', { class: 'card__eyebrow' },
      h('span', { class: 'card__icon' }, svg(icons.cup)),
      h('span', { class: 'caps' }, t('morning.water.title')),
    ),
    h('p', { class: 'card__text water__lead' }, t('morning.water.lead')),
    h('div', { class: 'water__stage' },
      h('div', { class: 'water__glass' }, glass.node),
      h('div', { class: 'water__list', role: 'group', 'aria-label': t('morning.water.pick') },
        h('p', { class: 'water__pick' }, t('morning.water.pick')),
        ...rows,
      ),
    ),
    summary(items),
    h('p', { class: 'faint water__care' }, t('morning.water.care')),
  );
}

/** Для проверок: забыть отметки полёта. */
export function _reset() {
  fresh = null;
  gone = null;
  flying = new Set();
}
