import { h } from '../core/dom.js';
import { FIGURE, sideKey, figureSrc, figureImg } from '../ui/heels.js';

/* ФИГУРЫ ПРИВЫЧЕК ДНЯ — фигуры владельца (14.11.2026, assets/figures/): мужчина у мужской части, женщина у женской.

   Кегель — фигура стоит спокойно, в области таза «дышит» мягкое золотое свечение: сжатие — ярче и плотнее,
   расслабление — гаснет (классы kf--squeeze / kf--relax ставит карточка; до старта свечение мягко пульсирует).

   Шаги — фигура идёт: три кадра шага сменяют друг друга (опора → шаг → проход ноги), под ногами бежит дорога.
   Фон кадров чёрный — он сливается с карточкой (mix-blend-mode в habits.css). */

/** Фигура Кегеля: стоит, свечение в области таза. */
export function kegelFigure() {
  const who = sideKey();
  const glow = h('span', { class: 'kf-glow' });
  glow.style.left = `${FIGURE[who].pelvis[0] * 100}%`;
  glow.style.top = `${FIGURE[who].pelvis[1] * 100}%`;
  return h('div', { class: `kf kf--${who}`, 'aria-hidden': 'true' }, figureImg('kf__img', figureSrc('stand', who)), glow);
}

/** Идущая фигура своей части: три кадра по кругу и бегущая дорога. */
export function walkFigure() {
  const who = sideKey();
  return h('div', { class: `walk walk--${who}`, 'aria-hidden': 'true' },
    ...[1, 2, 3].map((n) => figureImg(`walk__frame walk__frame--${n}`, figureSrc(`walk-${n}`, who))),
    h('span', { class: 'walk__road' }),
  );
}
