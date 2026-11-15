import { h, add } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import * as help from '../../help/help.js';
import * as meet from '../../meet/meet.js';
import { itemPlate } from '../help/help.js';

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
  const items = data.items.filter((i) => i.key !== 'questions' && i.key !== 'redline');
  add(view,
    h('h1', { class: 'screen-title' }, t('library.title')),
    h('p', { class: 'help__intro' }, data.libraryIntro || t('library.lead')),
    ...items.map((item) => itemPlate(item, ctx, verdicts)),
  );
}
