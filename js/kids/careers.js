import { h } from '../core/dom.js';
import { isoDate } from '../core/dates.js';
import { kt } from './texts.js';
import { PROFESSIONS, PROF_BY_ID, MAX_PROFESSIONS, routeOf } from './dreams-catalog.js';
import { okMap, skillCount } from './stars.js';

/* КЕМ Я ХОЧУ СТАТЬ (владелец 14.11.2026: «ребёнок выбирает профессию — и ему подтягиваются навыки: что надо делать,
   чтобы стать автомехаником, бизнесменом…»). До трёх профессий; у каждой — путь из шагов (dreams-catalog.js).
   Шаг: «На сегодня» (в задания дня) или «Сделано» — дело ребёнка (deed type step, ref «профессия.шаг»; шаг-навык —
   deed type skill), родитель подтверждает — звезда и шаг пути пройден.

   Записи семьи: career { member, prof, at } — выбранные профессии ребёнка. */

const short = (id) => String(id || '').replace(/-/g, '').slice(0, 8);

export function chosenOf(api, member = api.me) {
  return api.items('career').filter((c) => c.data.member === member && PROF_BY_ID[c.data.prof]);
}

/** Пройден ли шаг: навык — подтверждён хоть раз; своё дело — подтверждено «получилось». */
export function stepDone(api, member, profId, step) {
  if (step.skill) return skillCount(member, step.skill, api.items('deed'), api.items('ok')) > 0;
  const ok = okMap(api.items('ok'));
  return api.items('deed').some((d) => d.author === member && d.data.type === 'step' && d.data.ref === `${profId}.${step.id}`
    && ok.has(d.id) && !ok.get(d.id).data.again);
}

function stepWaiting(api, member, profId, step) {
  const ok = okMap(api.items('ok'));
  const type = step.skill ? 'skill' : 'step';
  const ref = step.skill || `${profId}.${step.id}`;
  return api.items('deed').some((d) => d.author === member && d.data.type === type && d.data.ref === ref && !ok.has(d.id));
}

export function progressOf(api, member, profId) {
  const route = routeOf(profId);
  const done = route.filter((s) => stepDone(api, member, profId, s)).length;
  return { done, all: route.length };
}

/** Дело ребёнка за шаг пути. */
export function doStep(api, profId, step) {
  const at = new Date().toISOString();
  if (step.skill) api.put('deed', api.newId('d'), { type: 'skill', ref: step.skill, text: step.title, at, day: isoDate() });
  else api.put('deed', api.newId('d'), { type: 'step', ref: `${profId}.${step.id}`, prof: profId, text: step.title, at, day: isoDate() });
}

/** Раздел «Кем стать» в «Мечтах» ребёнка. togglePlan(type, ref) / inPlan(type, ref) — задания на сегодня. */
export function careersView(api, { togglePlan, inPlan }) {
  const chosen = chosenOf(api);
  const ids = new Set(chosen.map((c) => c.data.prof));
  const full = chosen.length >= MAX_PROFESSIONS;

  const routes = chosen.map((c) => {
    const p = PROF_BY_ID[c.data.prof];
    const route = routeOf(p.id);
    const { done, all } = progressOf(api, api.me, p.id);
    return h('section', { class: 'card kid-career' },
      h('h2', { class: 'card__title' }, `${p.icon} ${p.title}`),
      h('p', { class: 'gold-text kid-career__count' }, kt('career.route', { done, all })),
      h('div', { class: 'kid-bar' }, h('span', { class: 'kid-bar__fill', style: { width: `${Math.round((done / Math.max(1, all)) * 100)}%` } })),
      done === all ? h('p', { class: 'kid-career__all' }, kt('career.allDone')) : null,
      h('ol', { class: 'kid-rows kid-route' }, ...route.map((s) => {
        const ok = stepDone(api, api.me, p.id, s);
        const wait = !ok && stepWaiting(api, api.me, p.id, s);
        // Шаг-навык ложится в задания дня как навык (его «Получилось» засчитывается и навыку, и пути)
        const [ptype, pref] = s.skill ? ['skill', s.skill] : ['step', `${p.id}.${s.id}`];
        const planned = inPlan(ptype, pref);
        return h('li', { class: `kid-row kid-route__step${ok ? ' is-done' : ''}` },
          h('span', { class: 'kid-route__mark', 'aria-hidden': 'true' }, ok ? '✅' : '⭕'),
          h('span', { class: 'kid-row__title' }, s.title),
          ok ? null : wait ? h('span', { class: 'kid-badge is-wait' }, kt('today.waiting')) : h('div', { class: 'kid-row__actions' },
            h('button', { type: 'button', class: `btn ${planned ? 'btn--gold' : 'btn--ghost'} kid-row__btn`, 'aria-pressed': String(planned), onclick: () => togglePlan(ptype, pref) },
              planned ? kt('skills.inPlan') : kt('career.stepPlan')),
            h('button', { type: 'button', class: 'btn btn--gold kid-row__btn', onclick: () => doStep(api, p.id, s) }, kt('career.stepDone'))),
        );
      })),
      h('button', { type: 'button', class: 'btn btn--ghost kid-career__remove', onclick: () => api.drop('career', c.id) }, kt('career.remove')),
    );
  });

  return [
    h('section', { class: 'card' },
      h('h2', { class: 'card__title' }, `🌱 ${kt('career.title')}`),
      h('p', { class: 'card__text faint' }, kt('career.lead', { n: MAX_PROFESSIONS })),
      h('div', { class: 'kid-profs' }, ...PROFESSIONS.map((p) => h('button', {
        type: 'button', class: `kid-prof${ids.has(p.id) ? ' is-on' : ''}`, 'aria-pressed': String(ids.has(p.id)),
        disabled: !ids.has(p.id) && full ? true : null,
        onclick: () => {
          if (ids.has(p.id)) return;
          api.put('career', `${short(api.me)}.${p.id}`, { member: api.me, prof: p.id, at: new Date().toISOString() });
        },
      }, h('span', { class: 'kid-prof__icon', 'aria-hidden': 'true' }, p.icon), h('span', {}, p.title)))),
      full ? h('p', { class: 'faint' }, kt('career.full', { n: MAX_PROFESSIONS })) : null,
    ),
    ...routes,
  ];
}

/** Название шага пути по ссылке «профессия.шаг» (для заданий дня и подтверждений). */
export function stepTitle(ref) {
  const [prof, ...rest] = String(ref).split('.');
  const id = rest.join('.');
  const s = routeOf(prof).find((x) => x.id === id);
  const p = PROF_BY_ID[prof];
  return s && p ? { title: s.title, icon: p.icon, prof: p, step: s } : null;
}
