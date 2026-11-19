import { h, svg } from '../core/dom.js';
import { icons } from '../ui/icons.js';
import { t, getLang } from '../core/i18n.js';
import { LANGS } from '../config.js';

/* КВЕСТ «Я⁺ • ЛЮБОВЬ» (владелец 18.11.2026: «Квест № 1 в мире — Я⁺ • Любовь. Игра длиною в жизнь»).
   - questMark() — название игры золотой меткой: «Я» с плюсом в степени, точка, «Любовь»; на языке приложения
     (ru «Я⁺ • Любовь», ua «Я⁺ • Любов», en «I⁺ • Love»). quoted — в кавычках языка: «…» или “…”.
   - questBanner() — картинка приветствия на языке приложения (assets/quest/banner-ru|ua|en.webp); весь текст
     картинки — в alt.
   - класс quest-scene — изумрудно-золотая сцена для нейтральных экранов (вход, выбор части), quest.css. */

const BANNER_LANGS = ['ru', 'ua', 'en'];

export function questMark({ cls = '', quoted = false } = {}) {
  const mark = h('span', { class: `quest-mark ${cls}`.trim(), 'aria-label': t('quest.mark') },
    h('span', { class: 'quest-mark__me', 'aria-hidden': 'true' }, t('quest.me')),
    h('span', { class: 'quest-mark__plus', 'aria-hidden': 'true' }, '+'),
    h('span', { class: 'quest-mark__dot', 'aria-hidden': 'true' }, '•'),
    h('span', { class: 'quest-mark__love', 'aria-hidden': 'true' }, t('quest.love')),
  );
  if (!quoted) return mark;
  return h('span', { class: 'quest-mark__quoted' }, t('quest.qOpen'), mark, t('quest.qClose'));
}

/** Картинка приветствия на всю ширину: сверху «дышит», снизу её же край, отражённый и затемнённый, уходит в тёмный
    изумрудный лес (владелец 19.11.2026: «из тёмного леса смотрим, как там сидит пара… снизу как продолжение»). */
export function questBanner(cls = '') {
  const lang = BANNER_LANGS.includes(getLang()) ? getLang() : 'ru';
  const src = `assets/quest/banner-${lang}.webp`;
  return h('div', { class: `quest-hero ${cls}`.trim() },
    // Нажал — картинка на весь экран, там её можно растянуть пальцами (владелец 19.11.2026: «чтобы увеличивалась,
    // прочитать, что там написано»): в окне приложения масштаб страницы выключен
    h('button', { type: 'button', class: 'quest-hero__open', 'aria-label': t('quest.zoomOpen'), onclick: () => openZoom(src) },
      h('img', { class: 'quest-hero__img', src, alt: t('quest.bannerAlt'), width: '1280', height: '720', fetchpriority: 'high' })),
    h('div', { class: 'quest-hero__deep', 'aria-hidden': 'true', style: { backgroundImage: `url("${src}")` } }),
  );
}

/* Язык на входе — без рамки: «RU Рус ▾» золотом; нажал — родной список телефона (владелец 19.11.2026). */
const LANG_SHORT = { ua: 'UA Укр', ru: 'RU Рус', en: 'EN Eng' };
const LANG_FULL = { ua: 'Українська', ru: 'Русский', en: 'English' };

export function questLang(current, onPick) {
  const select = h('select', { class: 'quest-lang__select', 'aria-label': t('settings.lang') },
    ...LANGS.map((l) => h('option', { value: l, selected: l === current, title: LANG_FULL[l] }, LANG_SHORT[l])));
  select.addEventListener('change', () => onPick(select.value));
  return h('label', { class: 'quest-lang' }, select, h('span', { class: 'quest-lang__chevron', 'aria-hidden': 'true' }, '▾'));
}

/* КАРТИНКА НА ВЕСЬ ЭКРАН С УВЕЛИЧЕНИЕМ: два пальца — растянуть (до 4 раз), один — двигать увеличенную, двойное
   касание — увеличить или вернуть; колёсико мыши — тоже. Закрывается крестиком, Esc или касанием мимо картинки. */
const MAX_SCALE = 4;

function openZoom(src) {
  const before = document.activeElement;
  const img = h('img', { class: 'quest-zoom__img', src, alt: t('quest.bannerAlt'), draggable: 'false' });
  const close = h('button', { type: 'button', class: 'quest-zoom__close', 'aria-label': t('common.close') }, svg(icons.close));
  const hint = h('p', { class: 'quest-zoom__hint' }, t('quest.zoomHint'));
  const root = h('div', { class: 'quest-zoom', role: 'dialog', 'aria-modal': 'true', tabindex: '-1' }, img, close, hint);

  let scale = 1, x = 0, y = 0;
  const pts = new Map();
  let start = null;
  let lastTap = 0;

  const clampPan = () => {
    const r = img.getBoundingClientRect();
    const w = r.width / scale, hgt = r.height / scale;
    const maxX = Math.max(0, (w * scale - window.innerWidth) / 2 + 24);
    const maxY = Math.max(0, (hgt * scale - window.innerHeight) / 2 + 24);
    x = Math.max(-maxX, Math.min(maxX, x));
    y = Math.max(-maxY, Math.min(maxY, y));
  };
  const apply = () => {
    if (scale <= 1.01) { scale = 1; x = 0; y = 0; } else clampPan();
    img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    hint.hidden = scale > 1;
  };
  const zoomTo = (next) => { scale = Math.max(1, Math.min(MAX_SCALE, next)); apply(); };
  const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };

  img.addEventListener('pointerdown', (e) => {
    img.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    start = pts.size === 2 ? { d: dist(), scale } : { px: e.clientX, py: e.clientY, x, y };
    if (pts.size === 1) {
      const now = Date.now();
      if (now - lastTap < 300) zoomTo(scale > 1 ? 1 : 2.5);
      lastTap = now;
    }
  });
  img.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && start?.d) zoomTo(start.scale * (dist() / start.d));
    else if (pts.size === 1 && scale > 1 && start?.px !== undefined) {
      x = start.x + (e.clientX - start.px);
      y = start.y + (e.clientY - start.py);
      apply();
    }
  });
  const lift = (e) => {
    pts.delete(e.pointerId);
    const p = [...pts.values()][0];
    start = p ? { px: p.x, py: p.y, x, y } : null;
  };
  img.addEventListener('pointerup', lift);
  img.addEventListener('pointercancel', lift);
  root.addEventListener('wheel', (e) => { e.preventDefault(); zoomTo(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); }, { passive: false });

  function shut() {
    document.removeEventListener('keydown', onKey);
    root.remove();
    before?.focus?.();
  }
  const onKey = (e) => { if (e.key === 'Escape') shut(); };
  close.addEventListener('click', shut);
  root.addEventListener('click', (e) => { if (e.target === root) shut(); });
  document.addEventListener('keydown', onKey);

  document.body.append(root);
  root.focus();
  apply();
}
