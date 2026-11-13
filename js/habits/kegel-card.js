import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { foldCard } from '../ui/fold.js';
import * as sound from '../ui/tick.js';
import { kegelFigure } from './figures.js';
import { LEVELS, kegelLevel, markKegel } from './logs.js';

/* КАРТОЧКА «УПРАЖНЕНИЕ КЕГЕЛЯ» на «Сегодня» — в конце дня (владелец 13.11.2026: «как вода: минимум, 100%,
   максимум; с человечком, с анимацией, как делать правильно и сколько раз»). Сворачивается (ui/fold.js).

   Уровни (по Mayo Clinic): Минимум — 10 сжатий по 3 секунды; 100% — 3 подхода по 10 по 5 секунд; Максимум —
   3 подхода по 10 по 10 секунд. Расслабление — столько же, сколько сжатие; между подходами — 20 секунд отдыха.
   Таймер ведёт: «сжать» — свечение в области таза ярче, «расслабить» — гаснет; звук на каждой смене. Дошёл до
   конца — отметка дня сама (logs.js, лучший уровень за день).

   Таймер живёт вне отрисовки (как утренняя минута в today.js): экран перерисовывается от любой правки, а идущее
   упражнение сбиваться не должно. paint подменяет каждая новая отрисовка карточки. */

export const PLAN = {
  min: { sets: 1, reps: 10, hold: 3 },
  full: { sets: 3, reps: 10, hold: 5 },
  max: { sets: 3, reps: 10, hold: 10 },
};
const REST = 20;

/** Ход упражнения по секундам: [{ kind: squeeze|relax|rest, sec, set, rep }]. */
export function phases(level) {
  const p = PLAN[level];
  const out = [];
  for (let s = 1; s <= p.sets; s++) {
    for (let r = 1; r <= p.reps; r++) {
      out.push({ kind: 'squeeze', sec: p.hold, set: s, rep: r });
      out.push({ kind: 'relax', sec: p.hold, set: s, rep: r });
    }
    if (s < p.sets) out.push({ kind: 'rest', sec: REST, set: s, rep: p.reps });
  }
  return out;
}

let run = null; // { iso, level, list, start, index }
let timer = null;
let paint = null;

function current() {
  if (!run) return null;
  let left = (Date.now() - run.start) / 1000;
  for (let i = 0; i < run.list.length; i++) {
    if (left < run.list[i].sec) return { index: i, phase: run.list[i], left: run.list[i].sec - left };
    left -= run.list[i].sec;
  }
  return { index: run.list.length, phase: null, left: 0 };
}

function stop() {
  clearInterval(timer);
  timer = null;
  run = null;
  paint?.();
}

function start(iso, level) {
  sound.unlock();
  clearInterval(timer);
  run = { iso, level, list: phases(level), start: Date.now(), index: -1 };
  timer = setInterval(() => {
    const c = current();
    if (!c || !run) return;
    if (!c.phase) {
      const { iso: day, level: done } = run;
      clearInterval(timer);
      timer = null;
      run = null;
      sound.finish();
      markKegel(day, done);
      paint?.();
      return;
    }
    if (c.index !== run.index) {
      run.index = c.index;
      if (c.phase.kind !== 'rest') sound.tick(c.phase.kind === 'squeeze');
    }
    paint?.();
  }, 200);
}

export function kegelCard(ctx) {
  const iso = ctx.todayIso;
  const figure = kegelFigure();
  const count = h('span', { class: 'minute__count' });
  const unit = h('span', { class: 'faint minute__unit' });
  const dial = h('div', { class: 'minute__dial' }, count, unit);
  const stage = h('div', { class: 'heels kegel__stage', role: 'img', 'aria-label': t('day.kegel.title') }, figure, h('div', { class: 'kegel__cue' }), dial);
  const cue = stage.querySelector('.kegel__cue');
  const setLine = h('p', { class: 'kegel__set faint' });
  const fill = h('div', { class: 'bar__fill', style: { width: '0%' } });
  const status = h('span', { class: 'minute__fold-status' });

  const picks = h('div', { class: 'minute__picks' },
    ...LEVELS.map((level) => h('button', { type: 'button', class: 'minute__pick', onclick: () => { start(iso, level); paint(); } },
      h('span', { class: 'minute__pick-level' }, t(`levels.${level}`)),
      h('span', { class: 'minute__pick-time kegel__pick-time' }, t(`day.kegel.levels.${level}`)))),
  );
  const runningRow = h('div', { class: 'minute__running' },
    h('span', { class: 'minute__status' }, t('day.kegel.short')),
    h('button', { type: 'button', class: 'minute__stop', onclick: stop }, t('day.kegel.stop')),
  );

  function draw() {
    const c = current();
    const running = !!(c && c.phase);
    const done = kegelLevel(iso);
    figure.classList.toggle('kf--squeeze', running && c.phase.kind === 'squeeze');
    figure.classList.toggle('kf--relax', running && c.phase.kind !== 'squeeze');
    figure.classList.toggle('kf--idle', !running);
    stage.classList.toggle('is-running', running);
    dial.classList.toggle('is-running', running);
    if (running) {
      count.textContent = String(Math.max(1, Math.ceil(c.left)));
      unit.textContent = t('morning.sec');
      cue.textContent = c.phase.kind === 'rest' ? t('day.kegel.rest') : t(`day.kegel.${c.phase.kind}`);
      const p = PLAN[run.level];
      setLine.textContent = `${t('day.kegel.set', { n: c.phase.set, all: p.sets })} · ${c.phase.rep} / ${p.reps}`;
      fill.style.width = `${(c.index / run.list.length) * 100}%`;
    } else {
      count.textContent = done ? '✓' : '10';
      unit.textContent = done ? t(`levels.${done}`) : '×';
      cue.textContent = `${t('day.kegel.squeeze')} · ${t('day.kegel.relax')}`;
      setLine.textContent = '';
      fill.style.width = done ? '100%' : '0%';
    }
    picks.hidden = running;
    runningRow.hidden = !running;
    if (running) status.replaceChildren(h('span', { class: 'minute__fold-count' }, `${Math.ceil(c.left)} · ${c.phase.rep}/${PLAN[run.level].reps}`));
    else status.replaceChildren(done ? h('span', { class: 'fold__done', title: t('day.kegel.done') }, svg(icons.check)) : '');
  }
  paint = draw;
  draw();

  const fold = foldCard({
    id: 'kegel',
    cls: 'kegel',
    icon: icons.pulse,
    title: t('day.kegel.title'),
    lead: t('day.kegel.short'),
    status,
    body: [
      h('p', { class: 'card__text' }, t('day.kegel.text')),
      stage,
      setLine,
      h('div', { class: 'bar minute__bar' }, fill),
      h('div', { class: 'card__actions' }, picks, runningRow),
      h('p', { class: 'faint water__care' }, t('day.kegel.care')),
    ],
    onToggle: (open) => (open ? stage.prepend(figure) : fold.thumb.append(figure)),
  });
  return fold.node;
}
