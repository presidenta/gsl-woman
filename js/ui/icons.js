/* ЗНАЧКИ — тонкая линия 1.6, скруглённые концы, рисуются цветом текста (currentColor).
   Новый значок — строка здесь; экраны берут их через svg() из core/dom.js. */

const wrap = (body) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const icons = {
  today: wrap('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
  week: wrap('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v8.5l5.5 3.2"/>'),
  journal: wrap('<path d="M6 3.5h10.5a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z"/><path d="M6 3.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2M9.5 8h5M9.5 11.5h5"/>'),
  path: wrap('<path d="M5 20c0-5 4-6 7-8s5-4 5-8"/><circle cx="17" cy="4" r="1.6"/><circle cx="5" cy="20" r="1.6"/><path d="M9 14.5l.01 0M14 9.5l.01 0"/>'),
  gear: wrap('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>'),
  back: wrap('<path d="M15 5l-7 7 7 7"/>'),
  // Стакан тёплой воды (утренняя минута): стакан, вода и пар над ним
  cup: wrap('<path d="M6 8h12l-1.3 11.2a1.6 1.6 0 0 1-1.6 1.4H8.9a1.6 1.6 0 0 1-1.6-1.4z"/><path d="M6.8 12.5h10.4"/><path d="M10 2.8c-.8 1 .8 1.6 0 2.7M14 2.8c-.8 1 .8 1.6 0 2.7"/>'),
  // Градусник — температура воды в стакане (37–40 °C)
  thermo: wrap('<path d="M10 14.6V5.2a2 2 0 0 1 4 0v9.4a4 4 0 1 1-4 0z"/><path d="M12 9.5v7"/><circle cx="12" cy="17.6" r="1.4" fill="currentColor" stroke="none"/>'),
  chevronLeft: wrap('<path d="M14.5 6l-6 6 6 6"/>'),
  chevronRight: wrap('<path d="M9.5 6l6 6-6 6"/>'),
  close: wrap('<path d="M6 6l12 12M18 6L6 18"/>'),
  // Выйти: дверь с ручкой и стрелка наружу (владелец 12.11.2026: «чтобы было понятно, что дверь»)
  logout: wrap('<rect x="4" y="3" width="9.5" height="18" rx="1.4"/><circle cx="11" cy="12.2" r="1" fill="currentColor" stroke="none"/><path d="M15.5 12h5.5M18.5 9.2L21.2 12l-2.7 2.8"/>'),
  refresh: wrap('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>'),
  check: wrap('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  plus: wrap('<path d="M12 5v14M5 12h14"/>'),
  sparkle: wrap('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>'),
  heart: wrap('<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>'),
  phone: wrap('<path d="M6.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"/>'),
  mic: wrap('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'),
  sun: wrap('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v1.8M12 19.4v1.8M2.8 12h1.8M19.4 12h1.8"/>'),
  bell: wrap('<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
  cloud: wrap('<path d="M7 18.5h10.5a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6-1.4A4.5 4.5 0 0 0 7 18.5z"/><path d="M9.5 13.5l2 2 3.5-3.5"/>'),
  eye: wrap('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: wrap('<path d="M2.5 12S6 5.5 12 5.5c2 0 3.7.7 5.1 1.7M21.5 12s-3.5 6.5-9.5 6.5c-2 0-3.7-.7-5.1-1.7"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M4 20 20 4"/>'),
  lock: wrap('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  crown: wrap('<path d="M4 8l4 4 4-7 4 7 4-4-1.5 10h-13z"/><path d="M5.5 21h13"/>'),
  camera: wrap('<path d="M4 8.5a2 2 0 0 1 2-2h1.8l1.4-2h5.6l1.4 2H18a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.6" r="3.4"/>'),
  goals: wrap('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2"/>'),
  phoneIcon: wrap('<rect x="7" y="2.8" width="10" height="18.4" rx="2.4"/><path d="M10.5 18h3"/><path d="M12 6.5v6M9.6 10.2L12 12.6l2.4-2.4"/>'),
  trash: wrap('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'),
};
