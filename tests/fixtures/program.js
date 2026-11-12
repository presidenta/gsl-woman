/* Учебная программа для проверок: устройство настоящей (6 месяцев, 24 недели, ритм 3 + 3 + 1, неделя 5 —
   шесть заданий, неделя 24 — без заданий), а текстов нет. Настоящая лежит на сервере «Кванта»
   (server/src/woman/program/ в planner) и в открытый код сайта не попадает. */

const tasks = (week, n) => Array.from({ length: n }, (_, i) => ({ title: `Задание ${week}.${i + 1}`, text: '…' }));

function lang(tag) {
  return {
    love: {
      title: 'Языки', intro: '…',
      kinds: Object.fromEntries(['words', 'time', 'gifts', 'service', 'touch'].map((k) => [k, {
        name: `${tag} ${k}`, about: '…', tell: `Скажи ${k}`,
        him: [0, 1, 2, 3, 4, 5, 6].map((i) => `${k} для него ${i}`), child: [0, 1, 2].map((i) => `${k} ребёнку ${i}`),
        thanks: [0, 1, 2].map((i) => `${k} спасибо ${i}`),
      }])),
      quiz: { him: [], me: [], child: [] },
    },
    months: Array.from({ length: 6 }, (_, i) => ({ title: `${tag} месяц ${i + 1}`, subtitle: '', goal: '' })),
    weeks: Array.from({ length: 24 }, (_, i) => {
      const week = i + 1;
      const n = week === 5 ? 6 : week === 24 ? 0 : 3;
      const w = { title: `${tag} неделя ${week}`, tasks: tasks(week, n), flow: 'Практика', call: 'Созвон',
        imsg: [1, 2, 3].map((k) => ({ title: `Ситуация ${week}.${k}`, old: 'Как обычно', say: `Мне приятно ${week}.${k}` })) };
      if (week === 1) w.tasks[0].levels = { min: 'мин', full: 'сто', max: 'макс' };
      return w;
    }),
  };
}

export default { version: 'test', langs: { ru: lang('ru'), ua: lang('ua'), en: lang('en') } };
