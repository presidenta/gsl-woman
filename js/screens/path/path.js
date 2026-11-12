import { h, add } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { weekOf, monthOf } from '../../core/dates.js';
import { outline } from '../../program/index.js';
import { weekSummary } from '../../progress/progress.js';

/* ЭКРАН «ПУТЬ»: шесть месяцев по четыре недели. Текущий месяц раскрыт, в нём подсвечена текущая
   неделя; у пройденных недель — процент выполнения. Названия будущих недель видны: путь целиком
   перед глазами мотивирует, а задания всё равно открываются по дням. */

function weekItem(ctx, w, currentWeek) {
  const isCurrent = w.week === currentWeek;
  const isPast = w.week < currentWeek;
  let badge;
  if (isCurrent) badge = h('span', { class: 'chip chip--solid' }, t('path.current'));
  else if (isPast) badge = h('span', { class: 'chip' }, `${weekSummary(w.week, ctx.entries, ctx.day).percent}%`);
  else badge = h('span', { class: 'chip chip--muted' }, t('path.ahead'));

  return h('li', { class: `path-week${isCurrent ? ' is-current' : ''}${!isPast && !isCurrent ? ' is-ahead' : ''}` },
    h('div', { class: 'path-week__head' },
      h('span', { class: 'path-week__num' }, String(w.week)),
      h('span', { class: 'path-week__title' }, w.title),
      badge,
    ),
    w.tasks.length ? h('p', { class: 'path-week__tasks' }, w.tasks.map((x) => x.title).filter((v, i, a) => a.indexOf(v) === i).join(' · ')) : null,
  );
}

export function render(view, ctx) {
  const currentWeek = ctx.day >= 1 ? weekOf(ctx.day) : 0;
  const currentMonth = currentWeek ? monthOf(currentWeek) : 1;

  add(view,
    h('h1', { class: 'screen-title' }, t('path.title')),
    h('p', { class: 'screen-lead' }, t('path.lead')),
  );

  for (const m of outline(ctx.lang)) {
    add(view,
      h('details', { class: 'card path-month', open: m.month === currentMonth },
        h('summary', { class: 'path-month__summary' },
          h('span', { class: 'path-month__num gold-text' }, String(m.month)),
          h('span', { class: 'path-month__names' },
            h('span', { class: 'path-month__title' }, m.title),
            h('span', { class: 'path-month__subtitle' }, m.subtitle),
          ),
        ),
        h('p', { class: 'path-month__goal' }, h('span', { class: 'caps' }, t('path.goal')), h('br'), m.goal),
        h('ol', { class: 'path-weeks' }, ...m.weeks.map((w) => weekItem(ctx, w, currentWeek))),
      ),
    );
  }

}
