import { h } from '../core/dom.js';
import { t, getLang } from '../core/i18n.js';

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

export function questBanner(cls = '') {
  const lang = BANNER_LANGS.includes(getLang()) ? getLang() : 'ru';
  return h('img', {
    class: `quest-banner ${cls}`.trim(),
    src: `assets/quest/banner-${lang}.webp`,
    alt: t('quest.bannerAlt'),
    width: '1280', height: '720', decoding: 'async',
  });
}
