import { h, add } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import * as help from '../../help/help.js';
import * as meet from '../../meet/meet.js';
import { itemPlate, openPlate } from '../help/help.js';
import { photo, fixed } from '../../photos/photos.js';

/* ЭКРАН «ТАЙНЫЙ АРХИВ» (#/archive; до 22.11.2026 — «Библиотека», в коде — до сборки 240; владелец 15.11.2026: «библиотеку вынесем отдельно — это немножко библиотека, это не
   помощь; в помощи — что-то быстрое»). Те же пункты, что были в «Помощи» под заголовком «Библиотека»: слова, КПК /
   «Что ей нужно», авторы, темы, правила дома, идеи свиданий, комплименты. Данные — те же (поле help программы),
   плашки — из screens/help/help.js. Без вопросов (они в «Помощи») и без «Красного флага» (свой экран). */

/** Пришли с «Моей кнопки» (#/archive?open=types | rules | dates | topics) — плашка открыта и видна сразу. */
export function onEnter() {
  const key = new URLSearchParams(location.hash.split('?')[1] || '').get('open');
  if (key) openPlate(key);
}

export function render(view, ctx) {
  const data = help.content(ctx.lang);
  if (!data) {
    add(view, h('h1', { class: 'screen-title' }, t('archive.title')), h('p', { class: 'card__text' }, t('help.waiting')));
    return;
  }
  const verdicts = meet.content(ctx.lang)?.verdicts || null;
  // Без вопросов («Вопросы»), «Красного флага» (свой экран), комплиментов (своя плашка в «Артефактах», с 76) и анкет
  // (свой раздел «Анкеты» в «Артефактах», с 176)
  const items = data.items.filter((i) => !['questions', 'surveys', 'redline', 'compliments'].includes(i.key));
  add(view,
    h('h1', { class: 'screen-title' }, t('archive.title')),
    h('p', { class: 'help__intro' }, t('archive.lead')),
    // «Интим 18⁺» (с 161 — «Если постучишь в мою тайную дверь») стоял здесь первой плашкой; владелец 22.11.2026:
    // «это не библиотека» — плашка перенесена в «Артефакты» (screens/goals/)
    // «Секретные материалы» — с 172 в «Артефактах» (screens/goals/), здесь — только книга целиком
    // У каждого пункта — своё постоянное фото (js/photos/catalog.js → FIXED.archive): пирамиды, «JSL», игры
    ...items.map((item, i) => itemPlate(item, ctx, verdicts, { photo: photo(fixed('archive', i)) })),
  );
}
