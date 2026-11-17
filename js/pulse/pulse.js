import { h } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { read, write } from '../core/store.js';
import { weekOf } from '../core/dates.js';
import { icons } from '../ui/icons.js';
import { foldCard } from '../ui/fold.js';

/* ЗАМЕР НЕДЕЛИ — «что изменилось в моей жизни» (владелец 17.11.2026: «баллы дня есть, а ответа на этот вопрос нет…
   делаем в первую очередь»).

   Раз в неделю, в день итога (день 7), человек ставит три оценки от 1 до 10:
     warm — тепло в отношениях, calm — моё спокойствие, ask — получаю, о чём прошу (у мужчин: делаю, что обещал).
   Из оценок на «Пути» складываются три линии по неделям — видно, куда движется жизнь, и есть о чём говорить с
   наставником на созвоне. Это личное: хранится на телефоне (ключ pulse: { неделя: { warm, calm, ask, at } }),
   в пару и семью не уходит. Оценка себя, а не человека рядом — правилу «Красный флаг» не противоречит. */

const KEY = 'pulse';
export const SCALES = ['warm', 'calm', 'ask'];
const clamp = (n) => Math.min(10, Math.max(1, Math.round(Number(n) || 0)));

export function all() {
  const v = read(KEY, {});
  return v && typeof v === 'object' ? v : {};
}

export const ofWeek = (week) => all()[week] || null;

export function save(week, marks) {
  const next = { ...all(), [week]: { ...Object.fromEntries(SCALES.map((k) => [k, clamp(marks[k])])), at: new Date().toISOString() } };
  write(KEY, next);
}

/** Карточка дня итога: три шкалы и «Сохранить». Уже отмечено — показывает оценки, можно поправить. */
export function pulseCard(ctx, plan) {
  if (plan.kind !== 'call') return null;
  const week = weekOf(plan.day);
  const saved = ofWeek(week);
  const draft = Object.fromEntries(SCALES.map((k) => [k, saved?.[k] || 5]));
  const done = h('p', { class: 'pulse__done', hidden: !saved }, t('pulse.saved'));

  const rows = SCALES.map((k) => {
    const value = h('b', { class: 'pulse__value' }, String(draft[k]));
    const input = h('input', { type: 'range', min: '1', max: '10', step: '1', value: String(draft[k]), class: 'pulse__range', 'aria-label': t(`pulse.${k}`) });
    input.addEventListener('input', () => { draft[k] = clamp(input.value); value.textContent = String(draft[k]); });
    return h('label', { class: 'pulse__row' },
      h('span', { class: 'pulse__name' }, t(`pulse.${k}`), value),
      input,
      h('span', { class: 'pulse__ends' }, h('span', {}, '1'), h('span', {}, '10')),
    );
  });

  return foldCard({
    id: 'pulse',
    cls: 'pulse',
    icon: icons.pulse,
    title: t('pulse.title'),
    lead: saved ? t('pulse.leadDone') : t('pulse.lead'),
    body: [
      h('p', { class: 'card__text' }, t('pulse.how')),
      ...rows,
      h('button', {
        type: 'button', class: 'btn btn--gold btn--block',
        onclick: () => { save(week, draft); done.hidden = false; },
      }, t('pulse.save')),
      done,
    ],
  }).node;
}

/** Линии на «Пути»: по одной на шкалу, точки — недели с замером. Замеров меньше двух — подсказка. */
export function pulseChart() {
  const data = all();
  const weeks = Object.keys(data).map(Number).filter((w) => w > 0).sort((a, b) => a - b);
  const box = h('section', { class: 'card pulse-chart' },
    h('h2', { class: 'caps pulse-chart__title' }, t('pulse.chartTitle')));
  if (weeks.length < 2) {
    box.append(h('p', { class: 'card__text' }, t(weeks.length ? 'pulse.chartOne' : 'pulse.chartEmpty')));
    return box;
  }
  const W = 320, H = 120, pad = 14;
  const first = weeks[0], span = Math.max(1, weeks[weeks.length - 1] - first);
  const x = (w) => pad + ((w - first) / span) * (W - pad * 2);
  const y = (v) => H - pad - ((v - 1) / 9) * (H - pad * 2);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'pulse-chart__svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', t('pulse.chartTitle'));
  for (const k of SCALES) {
    const line = document.createElementNS(ns, 'polyline');
    line.setAttribute('points', weeks.map((w) => `${x(w).toFixed(1)},${y(data[w][k]).toFixed(1)}`).join(' '));
    line.setAttribute('class', `pulse-chart__line pulse-chart__line--${k}`);
    svg.append(line);
    for (const w of weeks) {
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('cx', x(w).toFixed(1));
      dot.setAttribute('cy', y(data[w][k]).toFixed(1));
      dot.setAttribute('r', '3');
      dot.setAttribute('class', `pulse-chart__dot pulse-chart__line--${k}`);
      svg.append(dot);
    }
  }
  const last = data[weeks[weeks.length - 1]], start = data[first];
  box.append(
    svg,
    h('ul', { class: 'pulse-chart__legend' }, ...SCALES.map((k) => {
      const d = last[k] - start[k];
      return h('li', { class: `pulse-chart__key pulse-chart__key--${k}` },
        h('span', {}, t(`pulse.${k}`)),
        h('b', {}, `${start[k]} → ${last[k]}${d > 0 ? ` (+${d})` : ''}`));
    })),
  );
  return box;
}
