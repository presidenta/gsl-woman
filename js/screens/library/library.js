import { h, add } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import * as help from '../../help/help.js';
import * as meet from '../../meet/meet.js';
import { itemPlate } from '../help/help.js';
import { photo, fixed } from '../../photos/photos.js';
import { intimLink } from '../intim/intim.js';

/* ЭКРАН «БИБЛИОТЕКА» (#/library, владелец 15.11.2026: «библиотеку вынесем отдельно — это немножко библиотека, это не
   помощь; в помощи — что-то быстрое»). Те же пункты, что были в «Помощи» под заголовком «Библиотека»: слова, КПК /
   «Что ей нужно», авторы, темы, правила дома, идеи свиданий, комплименты. Данные — те же (поле help программы),
   плашки — из screens/help/help.js. Без вопросов (они в «Помощи») и без «Красного флага» (свой экран). */

export function render(view, ctx) {
  const data = help.content(ctx.lang);
  if (!data) {
    add(view, h('h1', { class: 'screen-title' }, t('library.title')), h('p', { class: 'card__text' }, t('help.waiting')));
    return;
  }
  const verdicts = meet.content(ctx.lang)?.verdicts || null;
  // Без вопросов («Вопросы»), «Красного флага» (свой экран) и комплиментов (своя плашка в «Артефактах», с 76)
  const items = data.items.filter((i) => !['questions', 'redline', 'compliments'].includes(i.key));
  add(view,
    h('h1', { class: 'screen-title' }, t('library.title')),
    h('p', { class: 'help__intro' }, data.libraryIntro || t('library.lead')),
    // «Интим 18⁺» — свой экран (#/intim, владелец 21.11.2026), первой плашкой
    intimLink(ctx.lang),
    // У каждого пункта — своё постоянное фото (js/photos/catalog.js → FIXED.library): пирамиды, «JSL», игры
    ...items.map((item, i) => itemPlate(item, ctx, verdicts, { photo: photo(fixed('library', i)) })),
  );
}
