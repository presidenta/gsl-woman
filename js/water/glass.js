import { INSIDE } from './art.js';
import { waterColor } from './water.js';

/* СТАКАН — большой, с тёплой водой (владелец 13.11.2026: «прям видно, что она тёпленькая, что она шевелится»).
   Слои снизу вверх: тёплое свечение → стекло изнутри → палочка корицы (за водой) → то, что под водой (имбирь,
   перец, облако куркумы, завиток мёда) → вода (две волны навстречу, свет) → то, что на поверхности (лимон, мята) →
   пар над краем → стекло снаружи (кромка, блики, толстое дно) → всплеск от упавшей составляющей.

   Экран «Сегодня» перерисовывается после любой правки, и стакан строится заново. Чтобы волны, пар и плавающие
   дольки не дёргались, у всех движений общий такт (--phase от времени страницы), а цвет воды плавно перетекает
   от прежнего к новому (lastColor). */

const NS = 'http://www.w3.org/2000/svg';
const SURFACE = 74;
const CYCLE = 12; // секунд: длины всех движений делят его нацело (water.css)

let lastColor = null;

// Волна шириной 400: период 100 — сдвиг на 100 или 200 незаметен, движение бесконечное
const wave = (y, amp) => {
  let d = `M0 ${y}`;
  for (let x = 0; x < 400; x += 50) d += ` Q${x + 25} ${y + (x / 50 % 2 ? amp : -amp)} ${x + 50} ${y}`;
  return `${d} V250 H0 Z`;
};

const GLASS = 'M30 30 L45 236 Q46 246 56 246 L144 246 Q154 246 155 236 L170 30';
const INNER = 'M33.2 32 L47.6 233 Q48.6 242.4 57 242.4 L143 242.4 Q151.4 242.4 152.4 233 L166.8 32 Z';

/**
 * Стакан с составляющими items. fresh — только что упавшая (всплеск и появление), gone — только что убранная
 * (тает). Вернёт { node, svg, surface() } — surface() даёт точку поверхности воды на экране (куда летит составляющая).
 */
export function glassNode(items, { fresh = null, gone = null, label = '' } = {}) {
  const color = waterColor(items);
  const from = lastColor || color;
  lastColor = color;

  const phase = -((performance.now() / 1000) % CYCLE);
  const parts = (layer) => {
    const keys = [...items];
    if (gone && !keys.includes(gone) && INSIDE[gone]?.layer === layer) keys.push(gone);
    return keys
      .filter((k) => INSIDE[k]?.layer === layer)
      .map((k) => `<g class="wg-item${k === fresh ? ' is-new' : ''}${k === gone ? ' is-gone' : ''}" data-item="${k}">${INSIDE[k].svg}</g>`)
      .join('');
  };

  const markup = `
<svg viewBox="0 -44 200 300" class="wg" role="img" aria-label="${label.replace(/"/g, '&quot;')}" xmlns="${NS}">
  <defs>
    <clipPath id="wg-inner"><path d="${INNER}"/></clipPath>
    <linearGradient id="wg-water" x1="0" y1="0" x2="0" y2="1">
      <stop class="wg-top" offset="0"/>
      <stop class="wg-bottom" offset="1"/>
    </linearGradient>
    <linearGradient id="wg-back" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity=".07"/><stop offset=".5" stop-color="#fff" stop-opacity=".02"/>
      <stop offset="1" stop-color="#fff" stop-opacity=".06"/>
    </linearGradient>
    <linearGradient id="wg-shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".5"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="wg-base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/>
    </linearGradient>
    <radialGradient id="wg-glow" cx=".5" cy=".62" r=".55">
      <stop class="wg-glow-in" offset="0"/><stop class="wg-glow-out" offset="1"/>
    </radialGradient>
  </defs>

  <ellipse cx="100" cy="150" rx="104" ry="120" fill="url(#wg-glow)"/>
  <ellipse cx="100" cy="248" rx="62" ry="6" fill="#000" opacity=".35"/>
  <path d="${GLASS} Z" fill="url(#wg-back)"/>

  ${parts('behind')}

  <g clip-path="url(#wg-inner)">
    ${parts('under')}
    <g class="wg-waves">
      <path class="wg-wave wg-wave--back" d="${wave(SURFACE - 2, 3.2)}" fill="url(#wg-water)" opacity=".55"/>
      <path class="wg-wave wg-wave--front" d="${wave(SURFACE, 4.2)}" fill="url(#wg-water)"/>
      <path class="wg-wave wg-wave--line" d="${wave(SURFACE, 4.2).replace(/ V250 H0 Z$/, '')}" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="1.2"/>
    </g>
    <path class="wg-light" d="M60 90 L78 90 L66 240 L48 240 Z" fill="#fff" opacity=".07"/>
    ${fresh ? `<ellipse class="wg-ripple" cx="100" cy="${SURFACE}" rx="10" ry="2.6" fill="none" stroke="#fff" stroke-width="1.4"/>` : ''}
  </g>

  ${parts('surface')}

  <g class="wg-steam" fill="none" stroke="#fff" stroke-linecap="round">
    <path class="wg-steam__wisp" d="M82 20 C76 8 88 0 82 -12 C77 -22 86 -28 82 -38" stroke-width="3.2"/>
    <path class="wg-steam__wisp wg-steam__wisp--2" d="M100 22 C106 10 94 2 100 -10 C105 -20 96 -28 100 -40" stroke-width="3.6"/>
    <path class="wg-steam__wisp wg-steam__wisp--3" d="M118 20 C112 9 124 1 118 -11 C113 -21 122 -27 118 -36" stroke-width="3"/>
  </g>

  <path d="${GLASS}" fill="none" stroke="#fff" stroke-opacity=".42" stroke-width="1.6" stroke-linejoin="round"/>
  <ellipse cx="100" cy="30" rx="70" ry="5.2" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.4"/>
  <path d="M47 236 Q48 246 57 246 L143 246 Q152 246 153 236 L152.2 228 Q100 236 47.8 228 Z" fill="url(#wg-base)"/>
  <path d="M40 46 L52 222" stroke="url(#wg-shine)" stroke-width="7" stroke-linecap="round" opacity=".55"/>
  <path d="M157 52 L148 210" stroke="#fff" stroke-opacity=".18" stroke-width="2" stroke-linecap="round"/>
</svg>`;

  const holder = document.createElement('div');
  holder.className = 'wg-holder';
  holder.innerHTML = markup.trim();
  const svg = holder.firstElementChild;
  /* Встроенные style="…" в разметке политика безопасности страницы запрещает (CSP style-src 'self') — такт и цвет
     ставим через свойства элементов: так можно */
  svg.style.setProperty('--phase', `${phase.toFixed(3)}s`);
  svg.querySelector('.wg-top').style.stopColor = from.top;
  svg.querySelector('.wg-bottom').style.stopColor = from.bottom;

  // Цвет воды перетекает от прежнего к новому (переход stop-color — в water.css)
  if (from !== color) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      svg.querySelector('.wg-top').style.stopColor = color.top;
      svg.querySelector('.wg-bottom').style.stopColor = color.bottom;
    }));
  }

  return {
    node: holder,
    svg,
    /** Точка поверхности воды на экране — сюда падает составляющая. */
    surface() {
      const r = svg.getBoundingClientRect();
      return { x: r.left + r.width * 0.5, y: r.top + r.height * ((SURFACE + 44) / 300) };
    },
  };
}
