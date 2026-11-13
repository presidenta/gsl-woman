import { h } from '../core/dom.js';
import { t } from '../core/i18n.js';
import * as side from '../side/side.js';

/* ПОДЪЁМЫ НА ПЯТКИ — живая подсказка ритма (владелец 12.11.2026): «человечек поднялся, опустился и выдохнул —
   и так каждую секунду; подниматься на 2–3 сантиметра, не больше; на опускании — выдох».

   Сборка 19 (владелец): настоящая женская фигура в полный рост — причёска с пучком, лицо в профиль, платье
   до середины бедра, руки, ноги и ступни целиком, без «палочки» снизу. На опускании изо рта выходит воздух —
   три струйки уходят вперёд и тают. Таймер стоит справа в этой же панели (aside).

   Силуэт в профиль, лицом вправо, чтобы было видно пятку. Один цикл — ровно секунда
   (styles/components/heels.css): быстрый подъём на носки, короткая задержка, мягкое опускание — в этот миг
   под пятками расходится золотой круг, изо рта выходит выдох и вспыхивает подпись «выдох».
   Ступня поворачивается вокруг подушечки (73, 190): пятка поднимается на 3 единицы при росте фигуры 182 —
   те самые 2–3 см; тело поднимается вместе с лодыжкой.

   heelsFigure({ aside }) → { node, setRunning(on, phase) }: aside — узел справа (таймер); пока идёт минута — ярче.
   Движение видно и до старта, чтобы ритм был понятен заранее. С «меньше движения» — неподвижная фигура. */

const SVG_NS = 'http://www.w3.org/2000/svg';

// Нога отдельно: ближняя входит в силуэт, дальняя — та же нога, сдвинутая назад и затемнённая
const LEG = `M68.4 96 C67.8 107 66.6 117 65.4 127 C65.2 129.6 66 132.4 65.6 135 C65 143 64.6 152 64.2 162
  C64 170 63.6 176 63.4 184 L58.6 184 C58.8 178 58.6 172 57.2 166 C55.4 158 53.4 150 53.8 141
  C54.2 135 56.2 131 57.2 128 C56.6 120 54.6 110 53.6 102 Z`;

const FOOT = `M58.8 178.5 L63.6 178.5 C64 182 64.8 184 67 185.4 C70.6 186.4 74.6 187 77.4 187.8
  C78.8 188.2 79.2 189.4 78.2 190 L60 190 C57.6 190 56.6 188.4 57 186.4 C57.4 184 58.4 181.6 58.8 178.5 Z`;

// Голова (лоб, нос, губы, подбородок), шея, грудь, талия, бёдра и ближняя нога — одним контуром
const BODY = `M58 8 C64 7.2 69 10.5 69.6 15.6 C69.8 17 70 17.6 70.6 18.6 L73.2 22.6
  C73.4 23.2 72.6 23.6 71.6 23.8 C71.9 24.6 71.9 25.2 71.5 25.6 C71.2 25.9 70.8 26.1 71.2 26.6
  C71.4 27.3 71.2 28 70.6 28.4 C70.8 29.6 70.4 30.8 69 31.4 C67.6 31.9 66 31.6 64.6 31
  C64.6 33.4 65 35.6 65.8 37.4 C68 39 69.4 41 70 44 C71.8 47 73 50.6 71.6 53.8
  C70.8 55.8 68.6 56.8 67 57.2 C65.2 61 63.8 64.6 63.8 67.6 C64 72 66.4 76.4 67.2 81
  C68.6 87 68.8 92 68.4 97 C67.8 107 66.6 117 65.4 127 C65.2 129.6 66 132.4 65.6 135
  C65 143 64.6 152 64.2 162 C64 170 63.6 176 63.4 184 L58.6 184 C58.8 178 58.6 172 57.2 166
  C55.4 158 53.4 150 53.8 141 C54.2 135 56.2 131 57.2 128 C56.6 120 54.6 110 53.6 102
  C52.2 98 49.8 94 49.6 88 C49.4 82 51.6 76 55 70.4 C56.8 66.6 57.4 62 56.8 57
  C56.2 51 55 46 55.8 41.4 C56.6 38.6 57.6 35.6 57.8 32 C56 30 53.6 28 52.6 24
  C51.4 19 52.4 11 58 8 Z`;

const HAIR = `M67.4 11 C63.4 6.6 55 6.8 52.6 12.8 C51.4 17 52 23 54.8 28.6 C56.2 26 56.8 22.2 57.8 19.8
  C59.8 15.8 63.6 12.8 67.4 11 Z`;

const DRESS = `M65.4 39.2 C68 40.4 69.6 42 70.3 44.2 C72.1 47 73.3 50.6 71.9 54 C71 56 68.9 57 67.3 57.5
  C65.5 61 64.1 64.6 64.1 67.6 C64.3 72 66.7 76.4 67.5 81 C68.7 87 69.2 92 69.2 97 C70.2 103 71.4 108.6 72.8 114
  C65 116.8 56 117.4 47.4 115.4 C48.4 109.6 49.6 103 50.2 97.6 C49.6 94.6 49.3 91.4 49.3 88 C49.1 82 51.3 76 54.7 70.4
  C56.5 66.6 57.1 62 56.5 57 C55.9 51 54.6 46 55.4 41.4 C58.6 42.8 62.2 41.8 65.4 39.2 Z`;

const ARM = `M57.4 41.6 C60.8 39.8 63.2 41.6 63 45 C62.6 52 61.6 59 61 65.6 C61.6 72 63 79 63.8 86.4
  C64.8 89.4 65.4 93 64.4 96.4 C63.6 98.6 62 98.4 61.8 96.4 C61.4 93.6 60.8 90.6 60.6 88.2
  C59 81.6 57.6 74 57.4 66.6 C57 59 56.4 51 56.2 45.4 C56.2 43.4 56.6 42.2 57.4 41.6 Z`;

const FIGURE = `
<svg viewBox="30 2 74 194" aria-hidden="true" class="heels__svg">
  <defs>
    <linearGradient id="heels-skin" gradientUnits="userSpaceOnUse" x1="44" y1="6" x2="82" y2="190">
      <stop offset="0" stop-color="#fde7d6"/><stop offset=".25" stop-color="#f3c7ab"/>
      <stop offset=".5" stop-color="#d9957c"/><stop offset=".72" stop-color="#f6d3bb"/><stop offset="1" stop-color="#c98470"/>
    </linearGradient>
    <linearGradient id="heels-dress" gradientUnits="userSpaceOnUse" x1="48" y1="38" x2="74" y2="116">
      <stop offset="0" stop-color="#e9a98f"/><stop offset=".45" stop-color="#b8664f"/><stop offset="1" stop-color="#8e4639"/>
    </linearGradient>
    <linearGradient id="heels-hair" gradientUnits="userSpaceOnUse" x1="46" y1="6" x2="66" y2="30">
      <stop offset="0" stop-color="#c47b63"/><stop offset="1" stop-color="#7a3a30"/>
    </linearGradient>
    <linearGradient id="heels-floor" gradientUnits="userSpaceOnUse" x1="34" y1="0" x2="100" y2="0">
      <stop offset="0" stop-color="#efc4a6" stop-opacity="0"/><stop offset=".5" stop-color="#efc4a6" stop-opacity=".6"/>
      <stop offset="1" stop-color="#efc4a6" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="heels-skin-far" gradientUnits="userSpaceOnUse" x1="50" y1="96" x2="70" y2="190">
      <stop offset="0" stop-color="#a8695a"/><stop offset=".55" stop-color="#8a5146"/><stop offset="1" stop-color="#6e3d35"/>
    </linearGradient>
    <radialGradient id="heels-shadow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <line x1="34" y1="190.4" x2="100" y2="190.4" stroke="url(#heels-floor)" stroke-width="1"/>
  <ellipse class="heels__shade" cx="66" cy="190.6" rx="15" ry="2.2" fill="url(#heels-shadow)"/>
  <ellipse class="heels__ripple" cx="60" cy="190.4" rx="10" ry="2.4" fill="none" stroke="#efc4a6" stroke-width="1"/>

  <g class="heels__body"><path d="${LEG}" transform="translate(-2.6 -0.4)" fill="url(#heels-skin-far)"/></g>
  <g class="heels__foot"><path d="${FOOT}" transform="translate(-2.6 0)" fill="url(#heels-skin-far)"/></g>

  <g class="heels__body">
    <path d="${BODY}" fill="url(#heels-skin)"/>
    <path d="${HAIR}" fill="url(#heels-hair)"/>
    <circle cx="50.8" cy="15.6" r="4.9" fill="url(#heels-hair)"/>
    <path d="M47.6 13.6 C49.4 11.6 52.4 11.4 54.2 13.2" fill="none" stroke="#f3c7ab" stroke-opacity=".45" stroke-width=".6" stroke-linecap="round"/>
    <path d="M66.6 18.6 C67.4 18.2 68.2 18.3 68.8 18.8" fill="none" stroke="#5a2a26" stroke-opacity=".7" stroke-width=".55" stroke-linecap="round"/>
    <path d="${DRESS}" fill="url(#heels-dress)"/>
    <g fill="none" stroke="#5a2a26" stroke-opacity=".35" stroke-width=".6" stroke-linecap="round">
      <path d="M59.6 99 C59.2 104 58.6 110 57.8 116.2"/><path d="M64.6 99.6 C65.4 105 66.2 110.6 66.8 115.8"/>
      <path d="M54.6 102 C53.6 106.6 52.4 111 51.2 115.6"/>
    </g>
    <path d="M57 61.4 C59.4 62.6 61.8 62.8 64 62.2" fill="none" stroke="#f6d3bb" stroke-opacity=".6" stroke-width=".8" stroke-linecap="round"/>
    <path d="M65.2 122 C64.9 126 64.6 130 64.4 133 M63.6 141 C63.4 152 63 166 62.6 178" fill="none" stroke="#fff3ea" stroke-opacity=".35" stroke-width=".6" stroke-linecap="round"/>
    <path d="${ARM}" fill="url(#heels-skin)" stroke="#3a1f22" stroke-opacity=".22" stroke-width=".6"/>
    <g class="heels__breath" fill="none" stroke="#f9e2d2" stroke-linecap="round">
      <path pathLength="1" d="M73.6 26.4 C77.6 25.2 80.4 28.2 84 27.4 C87.6 26.6 89.2 24.2 92.8 25"/>
      <path pathLength="1" d="M74 28 C78.4 29.2 81.6 31.6 86 30.8 C89.2 30.2 90.8 31.6 94 32.4" stroke-width=".9"/>
      <path pathLength="1" d="M73.6 24.6 C77 22.6 80.6 23.4 84.2 21.4" stroke-width=".7"/>
      <circle cx="96.6" cy="27" r=".9" fill="#f9e2d2" stroke="none"/>
      <circle cx="98.4" cy="31.6" r=".6" fill="#f9e2d2" stroke="none"/>
    </g>
  </g>

  <g class="heels__foot"><path d="${FOOT}" fill="url(#heels-skin)"/></g>
</svg>`;


/* МУЖСКАЯ ФИГУРА — для мужской части GSL (W+M)⁺ (владелец 13.11.2026: «утреннее напоминание такое же, как у женщин,
   только фигурку мужчины поставить»). Та же система координат и те же классы, что у женской: стопа поворачивается
   вокруг той же подушечки (73, 190), тело поднимается так же — анимация (styles/components/heels.css) одна на обе.
   Мужчина в профиль: короткая стрижка, рубашка с коротким рукавом, ремень, брюки, босые стопы. Цвета — классическое
   золото и графит, как оформление мужской части. */
const MAN_HEAD = `M57 7.5 C63.5 6.4 69.4 9.6 70.2 15.4 C70.4 16.8 70.6 17.6 71.2 18.6 L73.8 22.8
  C74 23.4 73.2 23.8 72.2 24 C72.5 24.8 72.5 25.4 72.1 25.8 C71.8 26.1 71.4 26.3 71.8 26.8
  C72 27.5 71.8 28.2 71.2 28.6 C71.6 30.2 71.4 31.8 70.4 32.6 C69 33.6 67 33.6 65.4 33
  C65.4 35 65.8 37 66.4 39.4 L56.4 40.2 C57 37 57.6 34 57.4 31.6 C55.2 29.6 53.2 27 52.4 23
  C51.4 17.6 52 10.6 57 7.5 Z`;

const MAN_HAIR = `M68.6 11.6 C66 7.2 58.6 6 54.4 9.4 C51.6 12 51.4 18 52.6 23.4 C53.6 24.6 54.6 25.2 55.6 25
  C55.4 21.6 55.8 18 57.4 15.6 C60.4 13 64.8 12 68.6 11.6 Z`;

const MAN_SHIRT = `M56 39.6 C59.6 38.6 63.4 38.4 66.8 38.6 C70.6 40 73.2 43 74 47.4 C74.6 52 74 56.4 72.8 60.4
  C72 64.6 71.6 69 71.4 73.4 C71.2 80 70.8 88 70.4 96.4 C64 98 58 98 53.4 96.8 C53.4 89 53.2 82 52.8 76
  C52 68 51.4 60 51.6 52.6 C51.8 47 53.4 42 56 39.6 Z`;

const MAN_LEG = `M53.4 95.6 L70.6 95.6 C70.8 104 70 114 69 124 C68.4 130 68.2 136 67.6 142
  C66.8 154 65.8 166 65 180.6 L58.2 180.6 C58 172 57.6 164 56.6 156 C55.6 148 55 140 55.4 132
  C55.2 124 54 116 53.6 108 Z`;

const MAN_ARM = `M58.4 42 C62.2 40.4 65 42.4 64.8 46 C64.4 53 63.4 60 62.8 66.6 C63.4 73 64.8 80 65.6 87.4
  C66.6 90.4 67.2 94 66.2 97.6 C65.4 99.8 63.6 99.6 63.4 97.6 C63 94.6 62.4 91.6 62.2 89.2
  C60.6 82.6 59 75 58.8 67.6 C58.4 60 57.6 52 57.4 46.4 C57.4 44.4 57.8 42.8 58.4 42 Z`;

const MAN_SLEEVE = `M57 41.4 C61.6 39.2 65.8 41.2 65.8 46 C65.6 51 64.8 56 64.4 60.8 C62 61.6 59.6 61.6 57.4 61
  C57 55 56.6 49 57 41.4 Z`;

const FIGURE_MAN = `
<svg viewBox="30 2 74 194" aria-hidden="true" class="heels__svg">
  <defs>
    <linearGradient id="heels-m-skin" gradientUnits="userSpaceOnUse" x1="44" y1="6" x2="82" y2="190">
      <stop offset="0" stop-color="#f6e2c2"/><stop offset=".3" stop-color="#e3bf8e"/>
      <stop offset=".55" stop-color="#c49461"/><stop offset=".78" stop-color="#ecd0a4"/><stop offset="1" stop-color="#b8875a"/>
    </linearGradient>
    <linearGradient id="heels-m-skin-far" gradientUnits="userSpaceOnUse" x1="50" y1="150" x2="70" y2="190">
      <stop offset="0" stop-color="#9c7448"/><stop offset="1" stop-color="#6e4f30"/>
    </linearGradient>
    <linearGradient id="heels-m-shirt" gradientUnits="userSpaceOnUse" x1="50" y1="38" x2="76" y2="98">
      <stop offset="0" stop-color="#f7dc84"/><stop offset=".45" stop-color="#c99a32"/><stop offset="1" stop-color="#7d5c17"/>
    </linearGradient>
    <linearGradient id="heels-m-legs" gradientUnits="userSpaceOnUse" x1="52" y1="96" x2="72" y2="182">
      <stop offset="0" stop-color="#7a6e58"/><stop offset=".55" stop-color="#554c3c"/><stop offset="1" stop-color="#3a3428"/>
    </linearGradient>
    <linearGradient id="heels-m-legs-far" gradientUnits="userSpaceOnUse" x1="52" y1="96" x2="72" y2="182">
      <stop offset="0" stop-color="#4a4234"/><stop offset="1" stop-color="#2a251d"/>
    </linearGradient>
    <linearGradient id="heels-m-hair" gradientUnits="userSpaceOnUse" x1="50" y1="6" x2="68" y2="26">
      <stop offset="0" stop-color="#6b5236"/><stop offset="1" stop-color="#2f2216"/>
    </linearGradient>
    <linearGradient id="heels-m-floor" gradientUnits="userSpaceOnUse" x1="34" y1="0" x2="100" y2="0">
      <stop offset="0" stop-color="#e3c77c" stop-opacity="0"/><stop offset=".5" stop-color="#e3c77c" stop-opacity=".6"/>
      <stop offset="1" stop-color="#e3c77c" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="heels-m-shadow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <line x1="34" y1="190.4" x2="100" y2="190.4" stroke="url(#heels-m-floor)" stroke-width="1"/>
  <ellipse class="heels__shade" cx="66" cy="190.6" rx="15" ry="2.2" fill="url(#heels-m-shadow)"/>
  <ellipse class="heels__ripple" cx="60" cy="190.4" rx="10" ry="2.4" fill="none" stroke="#e3c77c" stroke-width="1"/>

  <g class="heels__body"><path d="${MAN_LEG}" transform="translate(-2.6 -0.4)" fill="url(#heels-m-legs-far)"/></g>
  <g class="heels__foot"><path d="${FOOT}" transform="translate(-2.6 0)" fill="url(#heels-m-skin-far)"/></g>

  <g class="heels__body">
    <path d="${MAN_LEG}" fill="url(#heels-m-legs)" stroke="#e3c77c" stroke-opacity=".38" stroke-width=".5"/>
    <path d="M62.2 99 C62 120 61.6 150 61.2 179" fill="none" stroke="#f6e7b8" stroke-opacity=".16" stroke-width=".6" stroke-linecap="round"/>
    <path d="${MAN_HEAD}" fill="url(#heels-m-skin)"/>
    <path d="${MAN_HAIR}" fill="url(#heels-m-hair)"/>
    <ellipse cx="59.6" cy="21.6" rx="1.5" ry="2.4" fill="url(#heels-m-skin)" stroke="#5a3d22" stroke-opacity=".4" stroke-width=".4"/>
    <path d="M66.4 18.4 C67.3 17.9 68.3 18 69 18.6" fill="none" stroke="#3a2a18" stroke-opacity=".8" stroke-width=".6" stroke-linecap="round"/>
    <path d="${MAN_SHIRT}" fill="url(#heels-m-shirt)"/>
    <path d="M59.4 39.4 C61.6 41.6 64.2 41.8 66.4 39.8" fill="none" stroke="#4a3610" stroke-opacity=".55" stroke-width=".6" stroke-linecap="round"/>
    <path d="M71.6 46 C71.2 60 70.6 76 70 92" fill="none" stroke="#fff3c8" stroke-opacity=".35" stroke-width=".6" stroke-linecap="round"/>
    <path d="M53.4 94.4 L70.7 94.4 L70.6 97.4 L53.4 97.4 Z" fill="#3a2c10"/>
    <rect x="66.4" y="94.6" width="2.6" height="2.6" rx=".4" fill="none" stroke="#e3c77c" stroke-width=".5"/>
    <path d="${MAN_ARM}" fill="url(#heels-m-skin)" stroke="#3a2a18" stroke-opacity=".2" stroke-width=".6"/>
    <path d="${MAN_SLEEVE}" fill="url(#heels-m-shirt)" stroke="#4a3610" stroke-opacity=".35" stroke-width=".5"/>
    <g class="heels__breath" fill="none" stroke="#f6ecd2" stroke-linecap="round">
      <path pathLength="1" d="M74.2 26.6 C78.2 25.4 81 28.4 84.6 27.6 C88.2 26.8 89.8 24.4 93.4 25.2"/>
      <path pathLength="1" d="M74.6 28.2 C79 29.4 82.2 31.8 86.6 31 C89.8 30.4 91.4 31.8 94.6 32.6" stroke-width=".9"/>
      <path pathLength="1" d="M74.2 24.8 C77.6 22.8 81.2 23.6 84.8 21.6" stroke-width=".7"/>
      <circle cx="97.2" cy="27.2" r=".9" fill="#f6ecd2" stroke="none"/>
      <circle cx="99" cy="31.8" r=".6" fill="#f6ecd2" stroke="none"/>
    </g>
  </g>

  <g class="heels__foot"><path d="${FOOT}" fill="url(#heels-m-skin)"/></g>
</svg>`;

export function heelsFigure({ aside = null } = {}) {
  const holder = document.createElement('div');
  // Своя фигура у каждой части: женщина — у GSL Woman+, мужчина — у GSL Man+ (side/side.js)
  holder.innerHTML = side.get() === 'man' ? FIGURE_MAN : FIGURE;
  const svg = holder.firstElementChild;
  svg.setAttribute('xmlns', SVG_NS);

  const node = h('div', { class: 'heels', role: 'img', 'aria-label': t('morning.heels.rhythm') },
    svg,
    h('div', { class: 'heels__cues', 'aria-hidden': 'true' },
      h('span', { class: 'heels__cue heels__cue--up' }, t('morning.heels.up')),
      h('span', { class: 'heels__cue heels__cue--down' }, t('morning.heels.exhale')),
    ),
    aside,
  );
  return {
    node,
    /* phase — где сейчас секундный цикл (0…1): рисунок сдвигается так, чтобы пятки касались пола ровно на
       смене цифры и звуке. Новая отрисовка экрана посреди счёта тоже встаёт в такт. */
    setRunning(on, phase = 0) {
      if (on && !node.classList.contains('is-running')) {
        node.style.setProperty('--heels-delay', `${-phase}s`);
        void node.offsetWidth;
      }
      node.classList.toggle('is-running', on);
    },
  };
}
