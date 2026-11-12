import { h } from '../core/dom.js';
import { t } from '../core/i18n.js';

/* ПОДЪЁМЫ НА ПЯТКИ — живая подсказка ритма (владелец 12.11.2026): «человечек поднялся, опустился и выдохнул —
   и так каждую секунду; подниматься на 2–3 сантиметра, не больше; на опускании — выдох».

   Силуэт в профиле, чтобы было видно пятку. Один цикл — ровно секунда (styles/components/heels.css):
   быстрый подъём на носки, короткая задержка, мягкое опускание — и в этот миг под пятками расходится золотой
   круг, а рядом вспыхивает «выдох». Высота подъёма — три единицы рисунка ростом 140: те самые 2–3 см.

   heelsFigure() → { node, setRunning(on) }: пока идёт минута — ярче; движение показывается и до старта,
   чтобы ритм был виден заранее. С «меньше движения» в системе — неподвижный силуэт и подпись. */

const SVG_NS = 'http://www.w3.org/2000/svg';

const FIGURE = `
<svg viewBox="0 0 120 160" aria-hidden="true" class="heels__svg">
  <defs>
    <linearGradient id="heels-gold" gradientUnits="userSpaceOnUse" x1="40" y1="6" x2="86" y2="150">
      <stop offset="0" stop-color="#fde7d6"/><stop offset=".3" stop-color="#f1c0a3"/>
      <stop offset=".55" stop-color="#cf8a73"/><stop offset=".78" stop-color="#f8d8c0"/><stop offset="1" stop-color="#c27c66"/>
    </linearGradient>
    <linearGradient id="heels-floor" gradientUnits="userSpaceOnUse" x1="14" y1="0" x2="106" y2="0">
      <stop offset="0" stop-color="#efc4a6" stop-opacity="0"/><stop offset=".5" stop-color="#efc4a6" stop-opacity=".6"/>
      <stop offset="1" stop-color="#efc4a6" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <line x1="14" y1="149.5" x2="106" y2="149.5" stroke="url(#heels-floor)" stroke-width="1"/>
  <ellipse class="heels__ripple" cx="60" cy="149.5" rx="11" ry="2.6" fill="none" stroke="#efc4a6" stroke-width="1"/>
  <g class="heels__body">
    <circle cx="52.5" cy="15.5" r="4.6" fill="url(#heels-gold)"/>
    <ellipse cx="62" cy="20" rx="7.6" ry="8.8" fill="url(#heels-gold)"/>
    <path d="M59.4 27.5 L64.2 27.5 L64.6 37 L59.2 37 Z" fill="url(#heels-gold)"/>
    <path d="M56 38.5 C60 36.4 66 36.4 68.2 40 C71.2 44 72.2 48.4 69.2 52.4 C67.2 55.2 66.2 58 66.2 62
             C70.2 76 74 90 76.4 104 L49.6 104 C51.8 90 55.6 76 57.8 62 C56.6 56 55.2 50 56 44 Z" fill="url(#heels-gold)"/>
    <path d="M60.4 42 C58.6 54 58.8 66 62.4 80" fill="none" stroke="#3a1f22" stroke-opacity=".35" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M60.4 42 C58.6 54 58.8 66 62.4 80" fill="none" stroke="url(#heels-gold)" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M57.6 104 L56.8 143.5" stroke="url(#heels-gold)" stroke-opacity=".6" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M63.4 104 L62.6 143.5" stroke="url(#heels-gold)" stroke-width="3.4" stroke-linecap="round"/>
  </g>
  <g class="heels__foot" fill="none" stroke="url(#heels-gold)" stroke-width="3" stroke-linecap="round">
    <path d="M58.6 146 L73.4 148.4"/>
  </g>
</svg>`;

export function heelsFigure() {
  const holder = document.createElement('div');
  holder.innerHTML = FIGURE;
  const svg = holder.firstElementChild;
  svg.setAttribute('xmlns', SVG_NS);

  const node = h('div', { class: 'heels', role: 'img', 'aria-label': t('morning.heels.rhythm') },
    svg,
    h('div', { class: 'heels__cues', 'aria-hidden': 'true' },
      h('span', { class: 'heels__cue heels__cue--up' }, t('morning.heels.up')),
      h('span', { class: 'heels__cue heels__cue--down' }, t('morning.heels.exhale')),
    ),
  );
  return {
    node,
    setRunning(on) {
      // Новый старт — анимация с начала цикла, чтобы секунды шли вместе с таймером
      if (on && !node.classList.contains('is-running')) {
        node.classList.remove('is-running');
        void node.offsetWidth;
      }
      node.classList.toggle('is-running', on);
    },
  };
}
