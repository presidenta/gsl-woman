import { h } from '../core/dom.js';
import { isoDate } from '../core/dates.js';
import { kt } from './texts.js';
import { toast } from '../ui/toast.js';

/* ВОЗРАСТ РЕБЁНКА, ЧТО ПОКАЗЫВАТЬ И «МОЯ СУПЕРСИЛА ДЛЯ СЕМЬИ» (владелец 17.11.2026: «ребёнок ребёнку рознь… игры и
   задачи для разного возраста разные; для подростков — целая отдельная история»).

   Три ступени: small — 6–9 лет, middle — 10–13, teen — 14–17. Ступень ставит родитель во вкладке «Дети» (запись семьи
   kage: { member, group }). Пока не поставлена — ребёнок видит всё, как раньше.

   ЧТО ПОКАЗЫВАТЬ РЕБЁНКУ решают родители (владелец: «ребёнок развивается не по дням — в 7–8 лет ему уже интересно»):
   у каждого раздела навыков во вкладке «Дети» переключатель. Ступень даёт только начальный выбор; любой из родителей
   (и один родитель, если он один) включает и выключает разделы — запись kshow: { member, sections: { id: true|false } }.

   НОРМЫ — с цифрами по ступени (NORMS): приседания, скакалка, отжимания, шаги. Цифра — минимум, от которого
   отталкиваться; побил — молодец сам себе, без сравнения с другими.

   «Моя суперсила для семьи — твоя secret-миссия: подари тепло близким!» — одно дело в день в благодарность родителям,
   без звёзд: служение семье, а не работа за награду. Идеи — готовые по ступени и свои от родителей (запись kpower:
   { member | null, text }): «вынести мусор», «помочь на огороде». Ребёнок выбирает, делает — и в семейный чат уходит
   «🦸 Моя суперсила для семьи: …». */

export const GROUPS = ['small', 'middle', 'teen'];

const short = (id) => String(id || '').replace(/-/g, '').slice(0, 8);

/** Ступень ребёнка или null (родитель ещё не выбрал). */
export function groupOf(api, member) {
  const g = api.items('kage').find((x) => x.data.member === member)?.data.group;
  return GROUPS.includes(g) ? g : null;
}

export function setGroup(api, member, group) {
  api.put('kage', `age.${short(member)}`, { member, group, by: api.me, at: new Date().toISOString() });
}

/** Подходит ли пункт каталога ступени: без пометки ages — всем; ступень не выбрана — всё. */
export const fits = (item, group) => !group || !item.ages || item.ages.includes(group);

/* ---------- Что показывать ребёнку ---------- */

const showOf = (api, member) => api.items('kshow').find((x) => x.data.member === member)?.data.sections || {};

/** Виден ли раздел ребёнку: решение родителя, иначе — по ступени. */
export function shown(api, member, section) {
  const v = showOf(api, member)[section.id];
  if (typeof v === 'boolean') return v;
  // Безопасность — только когда родитель сам начал тренировку (parentOnly в catalog.js)
  return !section.parentOnly && fits(section, groupOf(api, member));
}

export function setShown(api, member, sectionId, on) {
  const row = api.items('kshow').find((x) => x.data.member === member)?.data || {};
  api.put('kshow', `show.${short(member)}`, { ...row, member, sections: { ...showOf(api, member), [sectionId]: !!on }, by: api.me, at: new Date().toISOString() });
}

/** Блок родителя: возраст и что показывать ребёнку (вкладка «Дети»). */
export function parentSetup(api, kid, sections, rerender) {
  const now = groupOf(api, kid.id);
  return h('details', { class: 'kid-setup' },
    h('summary', { class: 'kid-setup__summary' }, `⚙️ ${kt('ages.setup')}`),
    h('p', { class: 'caps kid-age__title' }, kt('ages.title')),
    h('div', { class: 'kid-age__row', role: 'group', 'aria-label': kt('ages.title') },
      ...GROUPS.map((g) => h('button', {
        type: 'button', class: `btn ${now === g ? 'btn--gold' : 'btn--ghost'} kid-age__btn`, 'aria-pressed': String(now === g),
        onclick: () => { setGroup(api, kid.id, g); rerender(); },
      }, kt(`ages.${g}`)))),
    h('p', { class: 'faint kid-age__hint' }, kt(now ? 'ages.showLead' : 'ages.hint')),
    h('ul', { class: 'kid-show' }, ...sections.map((sec) => {
      const on = shown(api, kid.id, sec);
      return h('li', {},
        h('label', { class: 'kid-show__row' },
          h('input', { type: 'checkbox', checked: on, onchange: (e) => { setShown(api, kid.id, sec.id, e.target.checked); rerender(); } }),
          h('span', {}, `${sec.icon} ${sec.title}`)),
        sec.parentOnly ? h('p', { class: 'faint kid-age__hint' }, kt('ages.safetyHint')) : null);
    })),
    h('p', { class: 'caps kid-age__title' }, kt('ages.normsTitle')),
    h('ul', { class: 'kid-show' }, ...Object.keys(NORMS).map((id) => {
      const input = h('input', { type: 'number', min: '1', max: '100000', class: 'input kid-norm__input', value: String(normOf(api, kid.id, id)), 'aria-label': NORMS[id].word.replace('{n}', '') });
      input.addEventListener('change', () => { if (Number(input.value) > 0) { setNorm(api, kid.id, id, Number(input.value)); rerender(); } });
      return h('li', { class: 'kid-show__row' }, h('span', {}, NORMS[id].word.replace(' {n}', '').replace('{n} ', '')), input);
    })),
    h('p', { class: 'caps kid-age__title' }, kt('power.parentTitle')),
    h('p', { class: 'faint kid-age__hint' }, kt('power.parentLead')),
    h('ul', { class: 'kid-rows' }, ...ownPower(api, kid.id).map((p) => h('li', { class: 'kid-row' },
      h('span', { class: 'kid-row__title' }, p.text),
      h('button', { type: 'button', class: 'btn btn--ghost kid-row__btn', 'aria-label': kt('power.remove'), onclick: () => { api.drop('kpower', p.id); rerender(); } }, '−')))),
    powerForm(api, kid, rerender),
  );
}

/** Поле «своё дело» и «＋ Добавить» — родитель вписывает, что нужно по дому. */
function powerForm(api, kid, rerender) {
  const input = h('input', { type: 'text', class: 'input kid-power__input', maxlength: '120', placeholder: kt('power.addPh'), 'aria-label': kt('power.add') });
  const add = () => {
    const text = input.value.trim();
    if (!text) return;
    api.put('kpower', api.newId('kp'), { member: kid.id, text, by: api.me });
    rerender();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  return h('div', { class: 'kid-power__form' }, input, h('button', { type: 'button', class: 'btn btn--ghost', onclick: add }, `＋ ${kt('power.add')}`));
}

/* ---------- Нормы с цифрами ---------- */

/** Минимум по ступени для навыков с числом; без ступени — младшая. */
/* Владелец 17.11.2026: «рассчитываем, что люди вообще не приседают и не занимаются; для спортсменов — отдельное
   спортивное приложение». Минимум по ступени — 5 / 10 / 20; хочется больше — родитель ставит своё число. */
export const NORMS = {
  squats: { word: 'Присесть {n} раз', small: 5, middle: 10, teen: 20 },
  pushups: { word: 'Отжаться {n} раз', small: 5, middle: 10, teen: 20 },
  walk: { word: 'Пройти пешком {n} шагов', small: 3000, middle: 5000, teen: 7000 },
};

const normsOf = (api, member) => api.items('kshow').find((x) => x.data.member === member)?.data.norms || {};

/** Число навыка: своё от родителя, иначе — по ступени. */
export function normOf(api, member, id) {
  const own = Number(normsOf(api, member)[id]);
  return own > 0 ? own : NORMS[id][groupOf(api, member) || 'small'];
}

export function setNorm(api, member, id, n) {
  const row = api.items('kshow').find((x) => x.data.member === member)?.data || { member, sections: {} };
  api.put('kshow', `show.${short(member)}`, { ...row, member, norms: { ...(row.norms || {}), [id]: Math.max(1, Math.round(n)) }, by: api.me, at: new Date().toISOString() });
}

/** Название навыка с числом ребёнка. */
export const titleFor = (api, member, id, title) => (NORMS[id] ? NORMS[id].word.replace('{n}', normOf(api, member, id)) : title);

/* ---------- «Моя суперсила для семьи» ---------- */

/* Готовые идеи по ступеням: тёплые дела для близких — мамы, папы, бабушек, дедушек, братьев и сестёр. */
export const POWER = {
  small: ['Обнять маму и папу и сказать «Я тебя люблю»', 'Нарисовать открытку для мамы или папы', 'Накрыть на стол к ужину', 'Принести папе тапочки после работы',
    'Полить цветы, пока мама отдыхает', 'Убрать свои игрушки самому, первым', 'Рассказать маме, что было самым хорошим за день',
    'Позвонить бабушке или дедушке и сказать, что любишь', 'Поиграть с младшим братом или сестрой', 'Помочь бабушке накрыть на стол'],
  middle: ['Приготовить чай маме и папе', 'Помыть посуду после ужина', 'Сказать родителям: «Спасибо, что вы у меня есть»', 'Помочь младшему с уроками',
    'Убрать в прихожей обувь всей семьи', 'Написать тёплую записку и спрятать в мамину сумку', 'Спросить папу, как прошёл его день, и выслушать',
    'Вынести мусор', 'Сходить в магазин по списку', 'Помочь бабушке или дедушке по дому', 'Помочь на огороде или в саду'],
  teen: ['Приготовить ужин для всей семьи', 'Взять на себя покупки по списку', 'Сказать родителям, за что ты им благодарен', 'Починить то, что давно ждёт рук',
    'Провести вечер с семьёй: настольная игра, телефон отдыхает', 'Помочь бабушке или дедушке', 'Спланировать семейный выходной',
    'Сделать уборку во всей квартире', 'Помочь на огороде или в саду', 'Позаниматься с младшим братом или сестрой', 'Отвезти или проводить бабушку к врачу'],
};

/** Свои идеи родителей для этого ребёнка (и общие — без member). */
export const ownPower = (api, member) => api.items('kpower')
  .filter((x) => !x.data.member || x.data.member === member)
  .map((x) => ({ id: x.id, text: x.data.text }));

/** Карточка на «Сегодня» ребёнка: идеи от родителей и три готовые на сегодня; «Сделано!» → семейный чат. */
export function powerCard(api) {
  const group = groupOf(api, api.me) || 'small';
  const pool = POWER[group];
  const day = Number(isoDate().replace(/-/g, ''));
  const ready = [0, 1, 2].map((i) => pool[(day + i * 3) % pool.length]);
  const ideas = [...ownPower(api, api.me).map((p) => p.text), ...ready].filter((v, i, a) => a.indexOf(v) === i);
  const today = isoDate();
  const done = api.items('msg').some((m) => m.author === api.me && m.data.power === today);
  return h('section', { class: 'card kid-power' },
    h('h2', { class: 'card__title' }, `🦸 ${kt('power.title')}`),
    h('p', { class: 'gold-text kid-power__slogan' }, kt('power.slogan')),
    done
      ? h('p', { class: 'card__text' }, kt('power.done'))
      : h('ul', { class: 'kid-rows' }, ...ideas.map((idea) => h('li', { class: 'kid-row' },
        h('span', { class: 'kid-row__title' }, idea),
        h('button', {
          type: 'button', class: 'btn btn--ghost kid-row__btn',
          onclick: () => {
            api.put('msg', api.newId('m'), { text: `🦸 ${kt('power.title')}: ${idea}`, power: today, at: new Date().toISOString() });
            toast({ title: kt('power.sent') });
          },
        }, kt('power.did'))))),
  );
}
