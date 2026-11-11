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
  chevronLeft: wrap('<path d="M14.5 6l-6 6 6 6"/>'),
  chevronRight: wrap('<path d="M9.5 6l6 6-6 6"/>'),
  close: wrap('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: wrap('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  plus: wrap('<path d="M12 5v14M5 12h14"/>'),
  sparkle: wrap('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>'),
  heart: wrap('<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>'),
  phone: wrap('<path d="M6.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"/>'),
  mic: wrap('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'),
  sun: wrap('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v1.8M12 19.4v1.8M2.8 12h1.8M19.4 12h1.8"/>'),
  bell: wrap('<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
  lock: wrap('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  crown: wrap('<path d="M4 8l4 4 4-7 4 7 4-4-1.5 10h-13z"/><path d="M5.5 21h13"/>'),
  trash: wrap('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'),
};
