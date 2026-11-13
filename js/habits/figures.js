import * as side from '../side/side.js';
import { figureCopy, defsCopy, PARTS } from '../ui/heels.js';

/* ФИГУРЫ ПРИВЫЧЕК ДНЯ — из тех же атлетичных фигур, что и утренняя минута (ui/heels.js), каждая под своей
   приставкой id (на экране они стоят одновременно).

   Кегель — фигура стоит спокойно, в области таза «дышит» мягкое золотое свечение: сжатие — ярче и плотнее,
   расслабление — гаснет (классы kf--squeeze / kf--relax ставит карточка; до старта свечение мягко пульсирует).

   Шаги — фигура идёт по дороге: бедро качается от бедренного сустава (61, 99), голень сгибается в колене (61, 139),
   руки идут навстречу ногам, тело чуть пружинит; дорога под ногами бежит назад. Тело нарисовано тем же контуром,
   ближняя нога у него обрезана выше бедра — её рисуют отдельные бедро и голень. */

const NS = 'http://www.w3.org/2000/svg';

function toNode(markup) {
  const holder = document.createElement('div');
  holder.innerHTML = markup.trim();
  const svg = holder.firstElementChild;
  svg.setAttribute('xmlns', NS);
  return svg;
}

/** Фигура Кегеля: копия фигуры части со свечением в области таза. */
export function kegelFigure() {
  const glow = `
  <defs><radialGradient id="kf-glow-g" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#fff3c8" stop-opacity=".95"/><stop offset=".45" stop-color="#f2c658" stop-opacity=".55"/>
    <stop offset="1" stop-color="#f2c658" stop-opacity="0"/>
  </radialGradient></defs>
  <ellipse class="kf-glow" cx="60" cy="99" rx="13" ry="9" fill="url(#kf-glow-g)"/>`;
  const svg = toNode(figureCopy('kf').replace(/<\/svg>\s*$/, `${glow}</svg>`));
  svg.classList.add('kf');
  return svg;
}

/** Идущая фигура своей части. */
export function walkFigure() {
  const man = side.get() === 'man';
  const p = man ? PARTS.man : PARTS.woman;
  const g = man
    ? { skin: 'walk-m-skin', far: 'walk-m-skin-far', wear: 'walk-m-shorts', wearFar: 'walk-m-shorts-far', hair: 'walk-m-hair', clip: 'walk-m-pants' }
    : { skin: 'walk-skin', far: 'walk-skin-far', wear: 'walk-wear', wearFar: 'walk-wear-far', hair: 'walk-hair', clip: 'walk-tights' };
  const ground = man ? '#e3c77c' : '#efc4a6';

  // Нога из двух частей: бедро (выше колена) и голень со стопой; одежда — обрезкой ткани по месту
  const leg = (far) => {
    const fill = far ? g.far : g.skin;
    const wear = far ? g.wearFar : g.wear;
    const shift = far ? 'translate(-2.6 -0.4)' : '';
    return `
    <g class="walk__thigh walk__thigh--${far ? 'far' : 'near'}"><g transform="${shift}">
      <g clip-path="url(#walk-thigh-clip)"><path d="${p.leg}" fill="url(#${fill})"/><path d="${p.leg}" fill="url(#${wear})" clip-path="url(#${g.clip})"/></g>
      <g class="walk__shin walk__shin--${far ? 'far' : 'near'}">
        <g clip-path="url(#walk-shin-clip)"><path d="${p.leg}" fill="url(#${fill})"/><path d="${p.leg}" fill="url(#${wear})" clip-path="url(#${g.clip})"/></g>
        <path d="${PARTS.foot}" fill="url(#${fill})"/>
      </g>
    </g></g>`;
  };

  const face = man
    ? `<path d="${p.hair}" fill="url(#${g.hair})"/>
       <ellipse cx="59.6" cy="21.6" rx="1.5" ry="2.4" fill="url(#${g.skin})" stroke="#5a3d22" stroke-opacity=".4" stroke-width=".4"/>
       <path d="M66.4 18.4 C67.3 17.9 68.3 18 69 18.6" fill="none" stroke="#3a2a18" stroke-opacity=".8" stroke-width=".6" stroke-linecap="round"/>
       <path d="M46.6 90.6 L74 90.6" stroke="url(#walk-m-gold)" stroke-width="2"/>`
    : `<path d="${p.hair}" fill="url(#${g.hair})"/>
       <ellipse cx="54.2" cy="11.4" rx="1.7" ry="2.2" fill="#f0b29a"/>
       <path d="M66.6 18.6 C67.4 18.2 68.2 18.3 68.8 18.8" fill="none" stroke="#5a2a26" stroke-opacity=".7" stroke-width=".55" stroke-linecap="round"/>`;
  const body = man
    ? `<path d="${p.body}" fill="url(#${g.skin})"/><path d="${p.body}" fill="url(#${g.wear})" clip-path="url(#${g.clip})"/>`
    : `<path d="${p.tail}" fill="url(#${g.hair})"/><path d="${p.body}" fill="url(#${g.skin})"/>
       <path d="${p.body}" fill="url(#${g.wear})" clip-path="url(#walk-top)"/><path d="${p.body}" fill="url(#${g.wear})" clip-path="url(#${g.clip})"/>`;

  const svg = toNode(`
<svg viewBox="18 0 98 200" class="walk" aria-hidden="true">
  ${defsCopy('walk')}
  <defs>
    <clipPath id="walk-torso-clip"><rect x="0" y="0" width="140" height="104"/></clipPath>
    <clipPath id="walk-thigh-clip"><rect x="0" y="90" width="140" height="50"/></clipPath>
    <clipPath id="walk-shin-clip"><rect x="0" y="137" width="140" height="60"/></clipPath>
    <linearGradient id="walk-road" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${ground}" stop-opacity="0"/><stop offset=".5" stop-color="${ground}" stop-opacity=".7"/>
      <stop offset="1" stop-color="${ground}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <ellipse cx="64" cy="191" rx="18" ry="2.4" fill="#000" opacity=".35"/>
  <line class="walk__road" x1="18" y1="191.4" x2="116" y2="191.4" stroke="url(#walk-road)" stroke-width="1.4" stroke-dasharray="7 6"/>
  <line x1="18" y1="194.6" x2="116" y2="194.6" stroke="url(#walk-road)" stroke-width=".6" opacity=".5"/>
  <g class="walk__bob">
    <g class="walk__arm walk__arm--far"><g transform="translate(-2.6 0)"><path d="${p.arm}" fill="url(#${g.far})"/></g></g>
    ${leg(true)}
    <g clip-path="url(#walk-torso-clip)">${body}</g>
    ${face}
    ${leg(false)}
    <g class="walk__arm walk__arm--near"><path d="${p.arm}" fill="url(#${g.skin})" stroke="#3a1f22" stroke-opacity=".22" stroke-width=".6"/></g>
  </g>
</svg>`);
  return svg;
}
