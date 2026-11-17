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
  return typeof v === 'boolean' ? v : fits(section, groupOf(api, member));
}

export function setShown(api, member, sectionId, on) {
  api.put('kshow', `show.${short(member)}`, { member, sections: { ...showOf(api, member), [sectionId]: !!on }, by: api.me, at: new Date().toISOString() });
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
          h('span', {}, `${sec.icon} ${sec.title}`)));
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
export const NORMS = {
  squats: { small: 'Присесть 20 раз', middle: 'Присесть 35 раз', teen: 'Присесть 50 раз' },
  rope: { small: 'Прыгнуть на скакалке 20 раз', middle: 'Прыгнуть на скакалке 50 раз', teen: 'Прыгнуть на скакалке 100 раз' },
  pushups: { small: 'Отжаться 5 раз', middle: 'Отжаться 10 раз', teen: 'Отжаться 20 раз' },
  walk: { small: 'Пройти пешком 3000 шагов', middle: 'Пройти пешком 5000 шагов', teen: 'Пройти пешком 7000 шагов' },
};

/** Название навыка с цифрой своей ступени. */
export const titleFor = (id, title, group) => NORMS[id]?.[group || 'small'] || title;

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
