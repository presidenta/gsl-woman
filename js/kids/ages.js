import { h } from '../core/dom.js';
import { isoDate } from '../core/dates.js';
import { kt } from './texts.js';
import { toast } from '../ui/toast.js';

/* ВОЗРАСТ РЕБЁНКА И «МОЯ СУПЕРСИЛА ДЛЯ СЕМЬИ» (владелец 17.11.2026: «ребёнок ребёнку рознь… игры и задачи для разного
   возраста разные; для подростков — целая отдельная история»).

   Три ступени: small — 6–9 лет, middle — 10–13, teen — 14–17. Ступень ставит родитель во вкладке «Дети» (запись семьи
   kage/<ребёнок>: { group }). Пока не поставлена — ребёнок видит всё, как раньше.
   Навыки и игры каталога помечены полем ages (catalog.js); без пометки — для всех. Я-сообщения и языки любви —
   раздел «Чувства и слова», с 10 лет.

   «Моя суперсила для семьи — твоя secret-миссия: подари тепло близким!» — одно дело в день в благодарность родителям,
   без звёзд: служение семье, а не работа за награду. Ребёнок выбирает идею, делает — и в семейный чат уходит
   «🦸 Моя суперсила для семьи: …», родители отвечают сердечком. */

export const GROUPS = ['small', 'middle', 'teen'];

/** Ступень ребёнка или null (родитель ещё не выбрал). */
export function groupOf(api, member) {
  const g = api.items('kage').find((x) => x.data.member === member)?.data.group;
  return GROUPS.includes(g) ? g : null;
}

const short = (id) => String(id || '').replace(/-/g, '').slice(0, 8);

export function setGroup(api, member, group) {
  api.put('kage', `age.${short(member)}`, { member, group, by: api.me, at: new Date().toISOString() });
}

/** Подходит ли пункт каталога ступени: без пометки ages — всем; ступень не выбрана — всё. */
export const fits = (item, group) => !group || !item.ages || item.ages.includes(group);

/** Выбор ступени у родителя (вкладка «Дети»). */
export function groupPicker(api, kid, rerender) {
  const now = groupOf(api, kid.id);
  return h('div', { class: 'kid-age' },
    h('p', { class: 'caps kid-age__title' }, kt('ages.title')),
    h('div', { class: 'kid-age__row', role: 'group', 'aria-label': kt('ages.title') },
      ...GROUPS.map((g) => h('button', {
        type: 'button', class: `btn ${now === g ? 'btn--gold' : 'btn--ghost'} kid-age__btn`, 'aria-pressed': String(now === g),
        onclick: () => { setGroup(api, kid.id, g); rerender(); },
      }, kt(`ages.${g}`)))),
    now ? null : h('p', { class: 'faint kid-age__hint' }, kt('ages.hint')),
  );
}

/* Идеи «суперсилы» по ступеням: короткие, тёплые, без денег. */
export const POWER = {
  small: ['Обнять маму и папу и сказать «Я тебя люблю»', 'Нарисовать открытку для мамы или папы', 'Накрыть на стол к ужину', 'Принести папе тапочки после работы',
    'Полить цветы, пока мама отдыхает', 'Убрать свои игрушки самому, первым', 'Рассказать маме, что было самым хорошим за день'],
  middle: ['Приготовить чай маме и папе', 'Помыть посуду после ужина', 'Сказать родителям: «Спасибо, что вы у меня есть»', 'Помочь младшему с уроками',
    'Убрать в прихожей обувь всей семьи', 'Написать тёплую записку и спрятать в мамину сумку', 'Спросить папу, как прошёл его день, и выслушать'],
  teen: ['Приготовить ужин для всей семьи', 'Взять на себя покупки по списку', 'Сказать родителям, за что ты им благодарен', 'Починить то, что давно ждёт рук',
    'Провести вечер с семьёй: настольная игра, телефон отдыхает', 'Помочь бабушке или дедушке', 'Спланировать семейный выходной'],
};

/** Карточка на «Сегодня» ребёнка: три идеи на сегодня и «Сделано!» → сообщение в семейный чат. */
export function powerCard(api) {
  const group = groupOf(api, api.me) || 'small';
  const pool = POWER[group];
  const day = Number(isoDate().replace(/-/g, ''));
  const ideas = [0, 1, 2].map((i) => pool[(day + i * 3) % pool.length]).filter((v, i, a) => a.indexOf(v) === i);
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
