/* РИСУНКИ СОСТАВЛЯЮЩИХ — для столбика (значок 48×48) и для стакана (как составляющая выглядит в воде).
   Цветные, без градиентов с id: один и тот же рисунок стоит в столбике, летит в стакан и плавает в нём, а
   одинаковые id на странице спутали бы заливки. Свои SVG-строки, текст пользователя сюда не попадает. */

const ICON = {
  lemon: `
    <circle cx="24" cy="24" r="19" fill="#f2c62e"/>
    <circle cx="24" cy="24" r="16.2" fill="#fff4c2"/>
    <circle cx="24" cy="24" r="14.6" fill="#fbdf6c"/>
    <g stroke="#fff4c2" stroke-width="1.7" stroke-linecap="round">
      <path d="M24 11v26M11 24h26M14.8 14.8l18.4 18.4M33.2 14.8 14.8 33.2"/>
    </g>
    <circle cx="24" cy="24" r="2.2" fill="#fff4c2"/>
    <path d="M10.5 18.5a15 15 0 0 1 7-7" stroke="#fffbe6" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>`,
  ginger: `
    <path d="M7 30c0-6 5-8.5 9.5-7.5C16.5 16.5 22 13.5 26 16.5c2-5 9-5 10.5.5 5 0 7.5 6 4 10 2.5 4.5-1.5 9.5-7 7.5-3 4.5-10 4.5-12.5.5C15.5 38 7.5 36 7 30Z" fill="#d6a85f"/>
    <g stroke="#a97a37" stroke-width="1.4" fill="none" stroke-linecap="round">
      <path d="M16.5 23.5c2 3 2 7 0 9.5M26 17.5c2 4 2 8.5 0 12M35.5 17.5c-2 4-2 8 0 11.5"/>
    </g>
    <path d="M11 27.5c2-2 5-2.2 7-1.2M28.5 20c2-1.6 4.5-1.6 6 0" stroke="#f1d49a" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  honey: `
    <path d="M24 5.5S10.5 21 10.5 30.2C10.5 37.8 16.5 43.5 24 43.5S37.5 37.8 37.5 30.2C37.5 21 24 5.5 24 5.5Z" fill="#e39a1f"/>
    <path d="M24 11.5c-3.2 4.7-9.2 12-9.2 18.7 0 5.2 4.1 9.4 9.2 9.4" fill="#f4bf4a" opacity=".75"/>
    <ellipse cx="18.6" cy="29" rx="2.4" ry="4.6" fill="#fff2c2" opacity=".9" transform="rotate(-20 18.6 29)"/>
    <circle cx="20.5" cy="37" r="1.3" fill="#fff2c2" opacity=".7"/>`,
  turmeric: `
    <ellipse cx="24" cy="38.6" rx="19" ry="3" fill="#a9640c" opacity=".55"/>
    <path d="M5.5 38.5C9.5 28.5 16 21.5 24 21s14.5 7.5 18.5 17.5Z" fill="#e8981a"/>
    <path d="M12 35.5c3-5.8 7-9 12-9.6" stroke="#f9c95c" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <g fill="#c07510"><circle cx="30" cy="31" r="1.2"/><circle cx="34.5" cy="35" r="1"/><circle cx="25.5" cy="34" r="1"/><circle cx="19" cy="34.5" r=".9"/></g>
    <path d="M30 14.5c3-3.6 8.5-3 10.5.5 1.4 2.6-.4 5.6-3.2 5.4-2-.2-3.4-2.2-5.3-2.6-1.8-.4-3.4-1.6-2-3.3Z" fill="#c9821f"/>
    <path d="M33 15.5c1.6-1 3.6-1 5 .2" stroke="#f0b552" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
  pepper: `
    <circle cx="16.5" cy="29" r="7.2" fill="#3b2f28"/>
    <circle cx="30.5" cy="31" r="7.6" fill="#2f251f"/>
    <circle cx="24" cy="18" r="6.8" fill="#47392f"/>
    <g stroke="#62503f" stroke-width="1.1" fill="none" stroke-linecap="round">
      <path d="M12.5 27c2-1.5 5-1.5 7 .5M27 29.5c2-1.8 5-1.6 7 .4M20.5 16.5c2-1.4 4.6-1.2 6.4.6"/>
    </g>
    <g fill="#9a8270"><circle cx="14" cy="25.5" r="1.3"/><circle cx="27.8" cy="27.4" r="1.4"/><circle cx="21.8" cy="14.8" r="1.2"/></g>`,
  cinnamon: `
    <g transform="rotate(-32 24 24)">
      <rect x="5" y="16.5" width="38" height="7.4" rx="3.7" fill="#9c5a2b"/>
      <rect x="5" y="16.5" width="38" height="2.6" rx="1.3" fill="#c47c43"/>
      <ellipse cx="43" cy="20.2" rx="2.4" ry="3.7" fill="#6f3b19"/>
      <path d="M43 18.3c1.2.3 1.4 2.4 0 3 -.9.3-1.2-1-.4-1.3" stroke="#c47c43" stroke-width=".8" fill="none"/>
      <rect x="7" y="25.6" width="34" height="6.8" rx="3.4" fill="#8a4c22"/>
      <rect x="7" y="25.6" width="34" height="2.3" rx="1.2" fill="#b56f39"/>
      <ellipse cx="41" cy="29" rx="2.2" ry="3.4" fill="#653416"/>
    </g>`,
  mint: `
    <path d="M24 40.5C13.5 38.5 7.5 28 11.5 13.5 24 15.5 30 26 24 40.5Z" fill="#5db26a"/>
    <path d="M24 40.5C18.5 32 15 24 11.5 13.5" stroke="#3c8749" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M25 40.5c9.5-3 16.5-12 13.5-24.5C28 18 22 28.5 25 40.5Z" fill="#7ccb82"/>
    <path d="M25 40.5c5-8.5 9-15.5 13.5-24.5" stroke="#4a9a56" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <path d="M24.6 40.5v4" stroke="#3c8749" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M14 20c1.5 1 3 2.6 4 4.4M33.5 22c-1.6 1-3 2.4-4 4" stroke="#b9e6b8" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".8"/>`,
};

/** Значок составляющей 48×48 (столбик и полёт в стакан). */
export const icon = (key) => `<svg viewBox="0 0 48 48" aria-hidden="true" class="water-art">${ICON[key] || ''}</svg>`;

/* Составляющая В СТАКАНЕ (координаты стакана: viewBox 0 -44 200 300, поверхность воды — y 74, дно — y 243).
   layer: under — под водой (вода красит её сверху), surface — на поверхности, behind — позади воды (палочка корицы
   стоит в стакане и торчит над краем). Анимации — классы wf--* в water.css. */
export const INSIDE = {
  lemon: {
    layer: 'surface',
    svg: `<g class="wf wf--bob"><g transform="translate(124 70) rotate(-18) scale(1.15 .72) translate(-24 -24)">${ICON.lemon}</g></g>`,
  },
  mint: {
    layer: 'surface',
    svg: `<g class="wf wf--bob wf--late"><g transform="translate(70 68) rotate(24) scale(.95) translate(-24 -24)">${ICON.mint}</g></g>`,
  },
  ginger: {
    layer: 'under',
    svg: `<g class="wf wf--drift">
      <g transform="translate(88 152) rotate(-14)"><ellipse rx="13" ry="9" fill="#f1d898" stroke="#c99a52" stroke-width="1.6"/><ellipse rx="7" ry="4.6" fill="none" stroke="#d9b672" stroke-width="1"/></g>
      <g transform="translate(118 190) rotate(22)"><ellipse rx="11" ry="7.6" fill="#ecd08b" stroke="#c39249" stroke-width="1.5"/><ellipse rx="5.6" ry="3.6" fill="none" stroke="#d6b06a" stroke-width="1"/></g>
    </g>`,
  },
  honey: {
    layer: 'under',
    svg: `<g class="wf wf--swirl">
      <path d="M100 214c10 0 14-8 8-13-8-6-22-2-24 10-2 13 12 22 26 19 16-3 24-18 18-31" fill="none" stroke="#e39a1f" stroke-width="4" stroke-linecap="round" opacity=".75"/>
      <path d="M100 214c6 0 8-5 4-8" fill="none" stroke="#f6c55a" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
    </g>`,
  },
  turmeric: {
    layer: 'under',
    svg: `<g class="wf wf--cloud">
      <ellipse cx="100" cy="214" rx="54" ry="24" fill="#eba123" opacity=".42"/>
      <ellipse cx="88" cy="204" rx="26" ry="12" fill="#f3b443" opacity=".38"/>
      <g fill="#d98b12" opacity=".8"><circle cx="72" cy="196" r="1.6"/><circle cx="96" cy="186" r="1.2"/><circle cx="118" cy="200" r="1.5"/><circle cx="132" cy="214" r="1.2"/><circle cx="80" cy="222" r="1.4"/><circle cx="108" cy="176" r="1"/></g>
    </g>`,
  },
  pepper: {
    layer: 'under',
    svg: `<g class="wf wf--drift wf--late" fill="#3b2f28">
      <circle cx="78" cy="118" r="2.6"/><circle cx="126" cy="132" r="2.2"/><circle cx="96" cy="168" r="2.4"/>
      <circle cx="140" cy="182" r="2"/><circle cx="70" cy="200" r="2.2"/><circle cx="112" cy="226" r="2.6"/>
    </g>`,
  },
  cinnamon: {
    layer: 'behind',
    svg: `<g class="wf wf--lean"><g transform="rotate(13 132 140)">
      <rect x="128" y="-30" width="11" height="268" rx="5.5" fill="#8f5226"/>
      <rect x="128" y="-30" width="4" height="268" rx="2" fill="#bd7740"/>
      <ellipse cx="133.5" cy="-30" rx="5.5" ry="2.6" fill="#6a3818"/>
      <path d="M131 -30.5c1.4-1.6 4.4-1.4 5.2.4" stroke="#c98a4f" stroke-width=".9" fill="none"/>
    </g></g>`,
  },
};
