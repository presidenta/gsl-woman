import { h } from '../core/dom.js';
import { t } from '../core/i18n.js';
import * as side from '../side/side.js';

/* ПОДЪЁМЫ НА ПЯТКИ — живая подсказка ритма (владелец 12.11.2026): «человечек поднялся, опустился и выдохнул —
   и так каждую секунду; подниматься на 2–3 сантиметра, не больше; на опускании — выдох».

   Сборка 19 (владелец): настоящая фигура в полный рост — лицо в профиль, руки, ноги и ступни целиком. С 40 —
   атлетичные фигуры в спортивной одежде (подробно — над FIGURE). На опускании изо рта выходит воздух —
   три струйки уходят вперёд и тают. Таймер стоит справа в этой же панели (aside).

   Силуэт в профиль, лицом вправо, чтобы было видно пятку. Один цикл — ровно секунда
   (styles/components/heels.css): быстрый подъём на носки, короткая задержка, мягкое опускание — в этот миг
   под пятками расходится золотой круг, изо рта выходит выдох и вспыхивает подпись «выдох».
   Ступня поворачивается вокруг подушечки (73, 190): пятка поднимается на 3 единицы при росте фигуры 182 —
   те самые 2–3 см; тело поднимается вместе с лодыжкой.

   heelsFigure({ aside }) → { node, setRunning(on, phase) }: aside — узел справа (таймер); пока идёт минута — ярче.
   Движение видно и до старта, чтобы ритм был понятен заранее. С «меньше движения» — неподвижная фигура. */

const SVG_NS = 'http://www.w3.org/2000/svg';

/* Сборка 40 (владелец 13.11.2026): «фигуры более фигурные, красивые, чтобы хотелось быть этой фигуркой и сразу
   вставать». Женщина — спортивная и женственная: красивая грудь, тонкая талия, глубокий прогиб поясницы, круглые
   подтянутые ягодицы, налитые бёдра и икры, подтянутые руки, высокий хвост; топ и леггинсы. Мужчина — умеренный
   культурист: мощная грудь, широкая спина и трапеции, круглые плечи, бицепс и трицепс, рельефный пресс, выпуклые
   ягодицы, объёмные бёдра и икры; тёмные шорты с золотым поясом. Одежда — тот же контур тела, обрезанный по месту
   (clipPath): ткань точно повторяет фигуру. Стопа общая (FOOT) — она поворачивается вокруг подушечки (73, 190). */

const FOOT = `M58.8 178.5 L63.6 178.5 C64 182 64.8 184 67 185.4 C70.6 186.4 74.6 187 77.4 187.8
  C78.8 188.2 79.2 189.4 78.2 190 L60 190 C57.6 190 56.6 188.4 57 186.4 C57.4 184 58.4 181.6 58.8 178.5 Z`;

/* — ЖЕНЩИНА — */

// Голова, шея, грудь, талия, живот, бедро, колено, голень — спереди сверху вниз; икра, бедро сзади, ягодицы,
// прогиб поясницы, спина, затылок — сзади снизу вверх
const W_BODY = `M58 8 C64 7.2 69 10.5 69.6 15.6 C69.8 17 70 17.6 70.6 18.6 L73.2 22.6
  C73.4 23.2 72.6 23.6 71.6 23.8 C71.9 24.6 71.9 25.2 71.5 25.6 C71.2 25.9 70.8 26.1 71.2 26.6
  C71.4 27.3 71.2 28 70.6 28.4 C70.8 29.6 70.4 30.8 69 31.4 C67.6 31.9 66 31.6 64.6 31
  C64.6 33.4 65 35.6 65.8 37.4 C67.4 38.6 68.6 40.6 69.6 42.8 C72.4 45 75.8 48 76.2 51.8
  C76.6 55.6 73.8 57.8 70 58.2 C68.8 60.8 67.8 63.4 67.2 66.4 C66.8 70.6 67.8 74.4 68.8 78.4
  C69.8 82.8 70.6 87.4 70.8 92 C71.6 97.4 71.6 103 70.6 109 C69.8 117 68.4 126 67.2 133.6
  C66.6 137 66.6 140 66.2 142.6 C65.4 150 64.6 158 64.2 166 C63.9 172 63.6 178 63.4 184
  L58.6 184 C58.8 178 58.4 172 57.2 166 C54.8 160 52.4 152 52.8 145 C53.2 139.6 55.6 136.4 56.4 132.6
  C56.2 125 54.4 118 53 112.6 C51.6 110.6 49.4 108.4 48.2 105.4 C46.4 101.4 46 96 47 91
  C48.2 86 51.6 81.4 54.6 77 C56.8 73.4 57.8 69.4 57.4 65.4 C57 59.6 55.6 54 55.2 49
  C54.8 45.4 55.4 42.4 56.4 40.4 C57.2 38 57.8 35 57.8 32 C56 30 53.6 28 52.6 24
  C51.4 19 52.4 11 58 8 Z`;

// Дальняя нога — та же форма от таза вниз
const W_LEG = `M70.8 96 C71.6 100 71.4 104 70.6 109 C69.8 117 68.4 126 67.2 133.6 C66.6 137 66.6 140 66.2 142.6
  C65.4 150 64.6 158 64.2 166 C63.9 172 63.6 178 63.4 184 L58.6 184 C58.8 178 58.4 172 57.2 166
  C54.8 160 52.4 152 52.8 145 C53.2 139.6 55.6 136.4 56.4 132.6 C56.2 125 54.4 118 53 112.6
  C52 108 51.6 102 52 96 Z`;

// Подтянутая рука: круглое плечо, бицепс, локоть, предплечье, кисть у бедра
const W_ARM = `M57.4 40.8 C61.6 38.8 65.4 40.6 65.8 44.8 C66.2 48.4 65 51.8 64.4 55.4 C63.8 59.4 63.4 63.4 63.8 67.4
  C64.6 73 65.8 79 66.6 85.4 C67.4 88.6 68 92.4 67 95.8 C66.2 98 64.6 97.8 64.4 95.8
  C64 93 63.4 90 63 87.6 C61.8 81.6 60.6 75 60 68.6 C59.2 64 58 60 57.2 56
  C56.2 51.6 55.6 47 55.8 43.8 C56 42.4 56.6 41.4 57.4 40.8 Z`;

const W_HAIR = `M67.4 11 C63.4 6.6 55 6.8 52.6 12.8 C51.4 17 52 23 54.8 28.6 C56.2 26 56.8 22.2 57.8 19.8
  C59.8 15.8 63.6 12.8 67.4 11 Z`;

// Высокий хвост: от макушки назад и вниз, мягкой волной
const W_TAIL = `M54.4 10.2 C49.6 9.6 46.2 13 45.8 18.4 C45.4 23.6 46.8 28.4 45.4 34.2 C45 36.2 46.6 36.8 47.6 35.2
  C50 31.2 50.6 26 50.8 21.4 C51 17 52.4 13.6 55.2 12.2 Z`;

const FIGURE = `
<svg viewBox="30 2 74 194" aria-hidden="true" class="heels__svg">
  <defs>
    <linearGradient id="heels-skin" gradientUnits="userSpaceOnUse" x1="44" y1="6" x2="82" y2="190">
      <stop offset="0" stop-color="#fde7d6"/><stop offset=".25" stop-color="#f3c7ab"/>
      <stop offset=".5" stop-color="#e2a488"/><stop offset=".72" stop-color="#f6d3bb"/><stop offset="1" stop-color="#c98470"/>
    </linearGradient>
    <linearGradient id="heels-skin-far" gradientUnits="userSpaceOnUse" x1="50" y1="96" x2="70" y2="190">
      <stop offset="0" stop-color="#a8695a"/><stop offset=".55" stop-color="#8a5146"/><stop offset="1" stop-color="#6e3d35"/>
    </linearGradient>
    <linearGradient id="heels-wear" gradientUnits="userSpaceOnUse" x1="46" y1="40" x2="74" y2="180">
      <stop offset="0" stop-color="#f0b29a"/><stop offset=".3" stop-color="#c8705c"/><stop offset=".7" stop-color="#a14e48"/><stop offset="1" stop-color="#7c3438"/>
    </linearGradient>
    <linearGradient id="heels-wear-far" gradientUnits="userSpaceOnUse" x1="50" y1="96" x2="70" y2="180">
      <stop offset="0" stop-color="#7a3a38"/><stop offset="1" stop-color="#4e2228"/>
    </linearGradient>
    <linearGradient id="heels-hair" gradientUnits="userSpaceOnUse" x1="44" y1="6" x2="66" y2="36">
      <stop offset="0" stop-color="#c47b63"/><stop offset="1" stop-color="#6e3229"/>
    </linearGradient>
    <linearGradient id="heels-floor" gradientUnits="userSpaceOnUse" x1="34" y1="0" x2="100" y2="0">
      <stop offset="0" stop-color="#efc4a6" stop-opacity="0"/><stop offset=".5" stop-color="#efc4a6" stop-opacity=".6"/>
      <stop offset="1" stop-color="#efc4a6" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="heels-shadow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="heels-top"><path d="M30 40.6 L56.6 40.6 C60.6 41.6 64.4 44.4 68.6 46.4 C70.8 46 72.2 45.2 73.4 44.6 L104 44 L104 60.6 L30 60.6 Z"/></clipPath>
    <clipPath id="heels-tights"><path d="M30 70.4 L104 69.6 L104 176 L30 176 Z"/></clipPath>
  </defs>
  <line x1="34" y1="190.4" x2="100" y2="190.4" stroke="url(#heels-floor)" stroke-width="1"/>
  <ellipse class="heels__shade" cx="66" cy="190.6" rx="15" ry="2.2" fill="url(#heels-shadow)"/>
  <ellipse class="heels__ripple" cx="60" cy="190.4" rx="10" ry="2.4" fill="none" stroke="#efc4a6" stroke-width="1"/>

  <g class="heels__body"><g transform="translate(-2.6 -0.4)">
    <path d="${W_LEG}" fill="url(#heels-skin-far)"/>
    <path d="${W_LEG}" fill="url(#heels-wear-far)" clip-path="url(#heels-tights)"/>
  </g></g>
  <g class="heels__foot"><path d="${FOOT}" transform="translate(-2.6 0)" fill="url(#heels-skin-far)"/></g>

  <g class="heels__body">
    <path d="${W_TAIL}" fill="url(#heels-hair)"/>
    <path d="${W_BODY}" fill="url(#heels-skin)"/>
    <path d="${W_BODY}" fill="url(#heels-wear)" clip-path="url(#heels-top)"/>
    <path d="${W_BODY}" fill="url(#heels-wear)" clip-path="url(#heels-tights)"/>
    <path d="${W_HAIR}" fill="url(#heels-hair)"/>
    <ellipse cx="54.2" cy="11.4" rx="1.7" ry="2.2" fill="#f0b29a"/>
    <path d="M66.6 18.6 C67.4 18.2 68.2 18.3 68.8 18.8" fill="none" stroke="#5a2a26" stroke-opacity=".7" stroke-width=".55" stroke-linecap="round"/>
    <!-- Рельеф: грудь, пресс, ягодица, бедро, икра — бликами и тенями -->
    <g fill="none" stroke-linecap="round">
      <path d="M72 46.6 C74.4 48.4 75.4 50.6 75.2 53.2" stroke="#ffd9c4" stroke-opacity=".6" stroke-width=".8"/>
      <path d="M68.4 58.4 C70.6 58.8 72.8 58.4 74.6 57" stroke="#5a2228" stroke-opacity=".5" stroke-width=".7"/>
      <path d="M56.6 60.6 L68.6 60.6" stroke="#7c3438" stroke-opacity=".6" stroke-width=".9"/>
      <path d="M66.6 62.4 C66.2 64.6 66.2 66.8 66.6 69" stroke="#8a4a3e" stroke-opacity=".4" stroke-width=".55"/>
      <path d="M57.2 70.6 L68.2 70.2" stroke="#6a2a30" stroke-opacity=".75" stroke-width="1"/>
      <path d="M48.4 92.4 C48.8 98.6 50.8 103.4 54 107.2" stroke="#4e1c24" stroke-opacity=".55" stroke-width=".8"/>
      <path d="M50.4 84.6 C49 87.4 48.4 90.4 48.6 93.4" stroke="#ffd9c4" stroke-opacity=".4" stroke-width=".7"/>
      <path d="M69.8 93 C70.4 101 69.6 112 67.8 125" stroke="#ffd9c4" stroke-opacity=".5" stroke-width=".9"/>
      <path d="M54.6 145 C55.6 151.6 56.8 157.6 57.8 164" stroke="#4e2228" stroke-opacity=".45" stroke-width=".7"/>
      <path d="M65.4 146 C65 154 64.6 162 64.2 170" stroke="#ffd9c4" stroke-opacity=".3" stroke-width=".6"/>
    </g>
    <path d="${W_ARM}" fill="url(#heels-skin)" stroke="#3a1f22" stroke-opacity=".22" stroke-width=".6"/>
    <path d="M57.4 51 C59.8 49.6 62.6 49.6 65 50.6" fill="none" stroke="#a8695a" stroke-opacity=".5" stroke-width=".55" stroke-linecap="round"/>
    <path d="M63.2 43.6 C64.2 46.6 63.8 49.8 63.2 52.8" fill="none" stroke="#fff3ea" stroke-opacity=".5" stroke-width=".6" stroke-linecap="round"/>
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


/* — МУЖЧИНА — та же система координат и те же классы: анимация (styles/components/heels.css) одна на обе. */

const M_BODY = `M57 7.5 C63.5 6.4 69.4 9.6 70.2 15.4 C70.4 16.8 70.6 17.6 71.2 18.6 L73.8 22.8
  C74 23.4 73.2 23.8 72.2 24 C72.5 24.8 72.5 25.4 72.1 25.8 C71.8 26.1 71.4 26.3 71.8 26.8
  C72 27.5 71.8 28.2 71.2 28.6 C71.6 30.2 71.4 31.8 70.4 32.6 C69 33.6 67.4 33.8 66 33.4
  C66.2 35.4 66.8 37.2 68 38.4 C71.4 39.4 74.8 40.8 77.4 43.2 C79.6 45.4 80.4 48.6 79.8 51.8
  C79.6 54.6 78.8 56.6 77 57.4 C75.4 58 73.4 58.2 72.2 59.2 C72 63 72.2 67 72.4 71
  C72.6 75 72.8 79 73 83 C73.2 86.6 73.6 90 74 93.6 C75.2 99 75.6 105 74.8 111
  C74 118 71.8 126 69.8 132.6 C69 135.6 68.6 138.6 68 141.6 C67 149 66.4 157 65.6 165
  C65 172 64.2 178 63.8 184 L58.2 184 C58.4 178 58 172 56.2 166 C53.4 160 50.4 154 50.6 147
  C50.8 141 53.4 136.6 55 133.4 C55 126 53.4 119 51.8 113.4 C50.4 111.4 48 109.4 46.8 106
  C45.4 101.8 45.4 96.4 46.6 92 C48 87.4 51.2 83.6 53.8 79.4 C55 76.4 55.6 73.6 55.4 70.4
  C55 65 53.4 60 51.6 55.4 C50.4 52 50.2 48 51 44.6 C51.8 41.6 53.8 38.8 55.6 36
  C56.6 34.4 57 33 56.8 31.6 C55 29.4 53 27 52.4 23 C51.4 17.6 52 10.6 57 7.5 Z`;

const M_LEG = `M74 94 C75.2 99 75.6 105 74.8 111 C74 118 71.8 126 69.8 132.6 C69 135.6 68.6 138.6 68 141.6
  C67 149 66.4 157 65.6 165 C65 172 64.2 178 63.8 184 L58.2 184 C58.4 178 58 172 56.2 166
  C53.4 160 50.4 154 50.6 147 C50.8 141 53.4 136.6 55 133.4 C55 126 53.4 119 51.8 113.4
  C50 108 49.6 100 50.4 94 Z`;

// Мощная рука: большое круглое плечо, бицепс, трицепс, предплечье, кулак у бедра
const M_ARM = `M56.4 40 C62.6 36.6 69.8 39.4 70.4 45.6 C70.6 48.8 69.6 51.2 69.2 53.4 C70.2 56.4 69.8 60.8 67.8 64.8
  C68.4 70.6 70.2 76.6 70.8 82.6 C71.4 87 71.6 91.4 70.6 95.4 C69.8 98.4 67 98.6 66.4 96
  C65.8 93 65 90 64.6 87.6 C62.6 81.4 60.4 75 59.4 69.2 C57.2 65 54.2 60.4 53.8 55
  C53.4 50 53.6 45.6 54.4 43 C54.8 41.4 55.4 40.6 56.4 40 Z`;

const M_HAIR = `M68.6 11.6 C66 7.2 58.6 6 54.4 9.4 C51.6 12 51.4 18 52.6 23.4 C53.6 24.6 54.6 25.2 55.6 25
  C55.4 21.6 55.8 18 57.4 15.6 C60.4 13 64.8 12 68.6 11.6 Z`;

const FIGURE_MAN = `
<svg viewBox="30 2 74 194" aria-hidden="true" class="heels__svg">
  <defs>
    <linearGradient id="heels-m-skin" gradientUnits="userSpaceOnUse" x1="44" y1="6" x2="84" y2="190">
      <stop offset="0" stop-color="#f6e2c2"/><stop offset=".28" stop-color="#e3bf8e"/>
      <stop offset=".5" stop-color="#c99a66"/><stop offset=".75" stop-color="#ecd0a4"/><stop offset="1" stop-color="#b8875a"/>
    </linearGradient>
    <linearGradient id="heels-m-skin-far" gradientUnits="userSpaceOnUse" x1="50" y1="96" x2="70" y2="190">
      <stop offset="0" stop-color="#9c7448"/><stop offset="1" stop-color="#6e4f30"/>
    </linearGradient>
    <linearGradient id="heels-m-shorts" gradientUnits="userSpaceOnUse" x1="46" y1="88" x2="76" y2="124">
      <stop offset="0" stop-color="#5e574a"/><stop offset=".55" stop-color="#3e392f"/><stop offset="1" stop-color="#26221c"/>
    </linearGradient>
    <linearGradient id="heels-m-shorts-far" gradientUnits="userSpaceOnUse" x1="46" y1="88" x2="76" y2="124">
      <stop offset="0" stop-color="#34302a"/><stop offset="1" stop-color="#1c1915"/>
    </linearGradient>
    <linearGradient id="heels-m-gold" gradientUnits="userSpaceOnUse" x1="46" y1="0" x2="76" y2="0">
      <stop offset="0" stop-color="#8a661c"/><stop offset=".5" stop-color="#f7d774"/><stop offset="1" stop-color="#b8832a"/>
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
    <clipPath id="heels-m-pants"><path d="M30 89.4 L104 89.4 L104 119 C90 120 80 121.4 30 123 Z"/></clipPath>
  </defs>
  <line x1="34" y1="190.4" x2="100" y2="190.4" stroke="url(#heels-m-floor)" stroke-width="1"/>
  <ellipse class="heels__shade" cx="66" cy="190.6" rx="16" ry="2.3" fill="url(#heels-m-shadow)"/>
  <ellipse class="heels__ripple" cx="60" cy="190.4" rx="10" ry="2.4" fill="none" stroke="#e3c77c" stroke-width="1"/>

  <g class="heels__body"><g transform="translate(-2.6 -0.4)">
    <path d="${M_LEG}" fill="url(#heels-m-skin-far)"/>
    <path d="${M_LEG}" fill="url(#heels-m-shorts-far)" clip-path="url(#heels-m-pants)"/>
  </g></g>
  <g class="heels__foot"><path d="${FOOT}" transform="translate(-2.6 0)" fill="url(#heels-m-skin-far)"/></g>

  <g class="heels__body">
    <path d="${M_BODY}" fill="url(#heels-m-skin)"/>
    <path d="${M_BODY}" fill="url(#heels-m-shorts)" clip-path="url(#heels-m-pants)"/>
    <path d="M46.6 90.6 L74 90.6" stroke="url(#heels-m-gold)" stroke-width="2"/>
    <path d="${M_HAIR}" fill="url(#heels-m-hair)"/>
    <ellipse cx="59.6" cy="21.6" rx="1.5" ry="2.4" fill="url(#heels-m-skin)" stroke="#5a3d22" stroke-opacity=".4" stroke-width=".4"/>
    <path d="M66.4 18.4 C67.3 17.9 68.3 18 69 18.6" fill="none" stroke="#3a2a18" stroke-opacity=".8" stroke-width=".6" stroke-linecap="round"/>
    <path d="M65.8 31.6 C67.4 32.6 69.4 32.6 70.6 31.6" fill="none" stroke="#5a3d22" stroke-opacity=".35" stroke-width=".5" stroke-linecap="round"/>
    <!-- Рельеф: грудь, пресс, широчайшие, ягодица, бедро, икра -->
    <g fill="none" stroke-linecap="round">
      <path d="M75 43.4 C77.8 45.4 79 48.4 78.8 51.6" stroke="#fff3dc" stroke-opacity=".6" stroke-width=".9"/>
      <path d="M72.2 58.8 C74.4 58.6 76.6 58 78.4 56.4" stroke="#5a3d22" stroke-opacity=".65" stroke-width=".9"/>
      <path d="M70.4 60.4 C70 68 70.2 76 70.8 85" stroke="#6e4f30" stroke-opacity=".3" stroke-width=".55"/>
      <path d="M70.6 64.6 C71.2 65 71.8 65 72.4 64.6M70.8 70.6 C71.4 71 72 71 72.6 70.6M71 76.6 C71.6 77 72.2 77 72.8 76.6M71.2 82.4 C71.8 82.8 72.4 82.8 73 82.4" stroke="#6e4f30" stroke-opacity=".5" stroke-width=".55"/>
      <path d="M52.2 49 C53.6 55 55 61 55.4 67.6" stroke="#5a3d22" stroke-opacity=".45" stroke-width=".7"/>
      <path d="M53.6 40 C52.4 42.4 51.8 45 51.8 47.6" stroke="#fff3dc" stroke-opacity=".4" stroke-width=".7"/>
      <path d="M47.4 93.4 C47.8 99.6 49.6 104.6 53 108.4" stroke="#14110d" stroke-opacity=".6" stroke-width=".8"/>
      <path d="M49.4 92.4 C48.4 95.4 48.2 98.6 48.8 101.6" stroke="#8a826e" stroke-opacity=".45" stroke-width=".7"/>
      <path d="M74 112 C73 119.4 71.2 126 69.2 131.6" stroke="#fff3dc" stroke-opacity=".55" stroke-width=".9"/>
      <path d="M69.8 125 C68.8 128.4 67.6 131 66.6 133.2" stroke="#6e4f30" stroke-opacity=".45" stroke-width=".6"/>
      <path d="M52.2 145 C53.4 152.6 55.2 159 57 165" stroke="#5a3d22" stroke-opacity=".55" stroke-width=".8"/>
      <path d="M51.8 140 C51 143 50.8 146 51.2 149" stroke="#fff3dc" stroke-opacity=".35" stroke-width=".6"/>
      <path d="M66.8 146 C66.2 154 65.6 162 65 170" stroke="#fff3dc" stroke-opacity=".35" stroke-width=".6"/>
    </g>
    <path d="${M_ARM}" fill="url(#heels-m-skin)" stroke="#3a2a18" stroke-opacity=".25" stroke-width=".6"/>
    <g fill="none" stroke-linecap="round">
      <path d="M54.2 51.6 C58.4 49.4 64 49 69.4 50.8" stroke="#6e4f30" stroke-opacity=".55" stroke-width=".7"/>
      <path d="M66.6 42 C68.4 45 68.6 48 67.8 50.6" stroke="#fff3dc" stroke-opacity=".55" stroke-width=".8"/>
      <path d="M68.2 54.4 C68.8 57.6 68.2 61 66.8 63.8" stroke="#fff3dc" stroke-opacity=".5" stroke-width=".8"/>
      <path d="M55.6 56 C56.8 60 58.4 63.6 60 66.6" stroke="#5a3d22" stroke-opacity=".45" stroke-width=".6"/>
      <path d="M67.8 66.6 C66.4 66.2 65 66.4 63.8 67.2" stroke="#5a3d22" stroke-opacity=".4" stroke-width=".55"/>
      <path d="M69.2 72 C69.8 76.6 70.2 80.6 70.4 85" stroke="#fff3dc" stroke-opacity=".4" stroke-width=".7"/>
    </g>
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
