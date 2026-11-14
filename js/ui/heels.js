import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import * as side from '../side/side.js';

/* ПОДЪЁМЫ НА ПЯТКИ — живая подсказка ритма (владелец 12.11.2026: «человечек поднялся, опустился и выдохнул —
   и так каждую секунду; подниматься на 2–3 сантиметра, не больше; на опускании — выдох»).

   С 48 (владелец 14.11.2026) — фигуры владельца: мужчина у мужской части, женщина у женской (assets/figures/).
   Два кадра одной и той же фигуры — на пятках и на носках (пятки чуть приподняты); кадры сменяют друг друга по
   ритму. Пар рисуем сами — мягкие облачка изо рта, ТОЛЬКО в момент опускания на пятки, на носках пара нет. В тот же
   миг под ногами расходится красный круг — видно, что главное — опустить всё тело на пятки. Слово «выдох» и
   стрелка вниз появляются вместе с паром.

   Один цикл — ровно секунда (styles/components/heels.css): 0–12% подъём, до 56% — на носках, 60% — опустились,
   дальше пар, круг и «выдох». Картинки стоят на своём тёмном фоне, края растворяет маска.

   heelsFigure({ aside }) → { node, art, setRunning(on, phase) }: aside — узел справа (таймер); art — сама фигура
   (её переносят в шапку свёрнутой карточки). Движение видно и до старта, чтобы ритм был понятен заранее. */

// Стрелка вниз под словом «выдох»
const ARROW_DOWN = '<svg viewBox="0 0 16 26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v20"/><path d="M2.5 16.5L8 22l5.5-5.5"/></svg>';

/* Где рот на картинке (доли ширины и высоты) и куда идёт пар: оба смотрят вправо (мужчина отражён 14.11.2026).
   Где центр таза — для свечения упражнения Кегеля (habits/figures.js). */
export const FIGURE = {
  man: { mouth: [0.6, 0.145], dir: 1, pelvis: [0.53, 0.55] },
  woman: { mouth: [0.61, 0.15], dir: 1, pelvis: [0.5, 0.52] },
};

export const sideKey = () => (side.get() === 'man' ? 'man' : 'woman');

/** Путь к картинке фигуры своей части: down (на пятках), up (на носках), stand (стоит, для Кегеля), walk-1…3. */
export const figureSrc = (kind, who = sideKey()) => `assets/figures/${who}-${kind}.webp`;

export const figureImg = (cls, src) => h('img', { class: cls, src, alt: '', draggable: 'false', decoding: 'async' });

/** Облачка пара изо рта — три, одно за другим. */
function vapor(who) {
  const f = FIGURE[who];
  const node = h('span', { class: `heels__vapor heels__vapor--${who}`, 'aria-hidden': 'true' },
    h('span', { class: 'heels__puff heels__puff--1' }),
    h('span', { class: 'heels__puff heels__puff--2' }),
    h('span', { class: 'heels__puff heels__puff--3' }),
  );
  node.style.left = `${f.mouth[0] * 100}%`;
  node.style.top = `${f.mouth[1] * 100}%`;
  node.style.setProperty('--dir', String(f.dir));
  return node;
}

export function heelsFigure({ aside = null } = {}) {
  const who = sideKey();
  const art = h('div', { class: `heels__art heels__art--${who}`, 'aria-hidden': 'true' },
    figureImg('heels__frame heels__frame--down', figureSrc('stand', who)),
    figureImg('heels__frame heels__frame--up', figureSrc('up', who)),
    vapor(who),
    h('span', { class: 'heels__ground' }),
  );

  // Одно слово «выдох» и стрелка вниз — в миг, когда пятки опускаются (владелец 14.11.2026)
  const node = h('div', { class: 'heels', role: 'img', 'aria-label': t('morning.heels.rhythm') },
    art,
    h('div', { class: 'heels__cues', 'aria-hidden': 'true' },
      h('span', { class: 'heels__cue heels__cue--down' },
        h('span', { class: 'heels__cue-word' }, t('morning.heels.exhale')),
        svg(ARROW_DOWN, 'heels__cue-arrow'),
      ),
    ),
    aside,
  );
  return {
    node,
    art,
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
