import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { foldCard } from '../ui/fold.js';
import { toast } from '../ui/toast.js';
import { walkFigure } from './figures.js';
import { LEVELS, STEP_LEVELS, MAX_STEPS, stepsOf, stepsLevel, setSteps } from './logs.js';

/* КАРТОЧКА «ШАГИ» на «Сегодня» — в самом конце (владелец 13.11.2026: «Минимум 3000, 100% — 6000, Максимум —
   12 000 и больше; вписываются вручную, можно просто кнопку нажать; фигурка накачанная, под ногами движется дорога,
   и идёт счётчик»). Сворачивается (ui/fold.js). Шаги приложение само считать не умеет — человек отмечает их
   кнопкой уровня или своим числом. */

const fmt = (n) => Number(n).toLocaleString('ru-RU').replace(/ /g, ' ');

/* Шаги ↔ время: бодрым шагом около 100 шагов в минуту (Tudor-Locke и др., CADENCE-Adults): 3000 — ~30 минут,
   6000 — ~1 час, 12 000 — ~2 часа. Кто шагомером не пользуется — вписывает минуты прогулки. */
export const STEPS_PER_MINUTE = 100;
export function approx(n) {
  const min = Math.round(n / STEPS_PER_MINUTE);
  if (min < 60) return t('day.steps.about', { n: min });
  const hours = Math.round((min / 60) * 2) / 2;
  return t('day.steps.aboutH', { n: String(hours).replace('.', ',') });
}

export function stepsCard(ctx) {
  const iso = ctx.todayIso;
  const n = stepsOf(iso);
  const level = stepsLevel(n);
  const figure = walkFigure();
  const stage = h('div', { class: 'heels steps__stage', role: 'img', 'aria-label': t('day.steps.title') },
    figure,
    h('div', { class: 'minute__dial steps__dial' + (level ? ' is-running' : '') },
      h('span', { class: 'minute__count steps__count' }, n ? fmt(n) : '0'),
      h('span', { class: 'faint minute__unit' }, n ? `${level ? t(`levels.${level}`) : ''} ${approx(n)}`.trim() : t('day.steps.title').toLowerCase()),
    ),
  );

  const mark = (value) => {
    setSteps(iso, value);
    toast({ title: t('day.steps.done'), text: t('day.steps.today', { n: fmt(value) }) });
  };
  const picks = h('div', { class: 'minute__picks' },
    ...LEVELS.map((lv) => h('button', {
      type: 'button',
      class: `minute__pick${level === lv ? ' is-on' : ''}`,
      onclick: () => mark(STEP_LEVELS[lv]),
    },
    h('span', { class: 'minute__pick-level' }, t(`levels.${lv}`)),
    h('span', { class: 'minute__pick-time kegel__pick-time' }, t(`day.steps.levels.${lv}`)),
    h('span', { class: 'steps__pick-about faint' }, approx(STEP_LEVELS[lv])))),
  );
  // Своё число шагов — или минуты прогулки (пересчёт в шаги)
  const stepsInput = h('input', { id: 'steps-own', class: 'input', type: 'number', inputmode: 'numeric', min: '0', max: String(MAX_STEPS), step: '100', placeholder: t('day.steps.stepsPh') });
  const minutesInput = h('input', { id: 'steps-min', class: 'input', type: 'number', inputmode: 'numeric', min: '0', max: '600', step: '5', placeholder: t('day.steps.minutesPh') });
  const save = h('button', {
    type: 'button',
    class: 'btn btn--ghost btn--block',
    onclick: () => {
      if (Number(stepsInput.value) > 0) { mark(stepsInput.value); return; }
      const m = Number(minutesInput.value);
      if (!(m > 0)) return;
      const value = Math.round(m * STEPS_PER_MINUTE);
      setSteps(iso, value);
      toast({ title: t('day.steps.done'), text: t('day.steps.fromMinutes', { m, n: fmt(value) }) });
    },
  }, t('day.steps.save'));

  // Полоса до 12 000 с отметками уровней
  const percent = Math.min(100, (n / STEP_LEVELS.max) * 100);
  const bar = h('div', { class: 'bar minute__bar steps__bar' },
    h('div', { class: 'bar__fill', style: { width: `${percent}%` } }),
    ...['min', 'full'].map((lv) => h('span', { class: 'steps__tick', style: { left: `${(STEP_LEVELS[lv] / STEP_LEVELS.max) * 100}%` } })),
  );

  const fold = foldCard({
    id: 'steps',
    cls: 'steps',
    icon: icons.footprints,
    title: t('day.steps.title'),
    lead: n ? t('day.steps.today', { n: fmt(n) }) : t('day.steps.short'),
    status: level ? h('span', { class: 'fold__done', title: t('day.steps.done') }, svg(icons.check)) : null,
    body: [
      h('p', { class: 'card__text' }, t('day.steps.text')),
      stage,
      bar,
      h('div', { class: 'card__actions' }, picks),
      h('div', { class: 'steps__own' },
        h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'steps-own' }, t('day.steps.stepsLabel')), stepsInput),
        h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'steps-min' }, t('day.steps.minutesLabel')), minutesInput),
        save,
      ),
      h('p', { class: 'field__hint' }, t('day.steps.rate')),
    ],
    onToggle: (open) => (open ? stage.prepend(figure) : fold.thumb.append(figure)),
  });
  return fold.node;
}
