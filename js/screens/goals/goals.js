import { h, svg, add } from '../../core/dom.js';
import { t, formatDate } from '../../core/i18n.js';
import * as goals from '../../goals/goals.js';
import { field } from '../../ui/controls.js';
import { icons } from '../../ui/icons.js';
import { openSheet, closeSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { segmented } from '../../ui/controls.js';
import { circleGoals } from '../../circles/goals-view.js';
// Письмо себе в будущее — через год, 5, 10 лет (letters/, 14.11.2026)
import { lettersBody } from '../../letters/letters-view.js';
import { ownBox } from '../../letters/letters.js';
import { lt } from '../../letters/texts.js';
import { plateLink, platePanel } from '../../ui/plate.js';
import { photoField, photoStrip } from '../../media/photo-field.js';
import * as media from '../../media/photos.js';
import { usedPhotoIds } from '../../media/used.js';
import { goalAudioField, deleteGoalAudio } from '../../goals/goal-media.js';

/* ЭКРАН «ЦЕЛИ»: вкладки «Мои · Пара · Семья» (владелец 13.11.2026: «цели у женщины, если она одна, и цели пары,
   если они вместе; и семьи»). «Мои» — сверху строка «Новая цель» и золотой «+», ниже — цели в работе, внизу —
   «Сбылось» с датами; кружок слева отмечает «сбылось», нажатие на текст открывает правку (данные — js/goals/).
   Под целями — плашки одного вида (ui/plate.js, владелец 15.11.2026: «чтобы не было хаоса»): «Помощь», в самом
   низу — «Письмо себе в будущее» (раскрывается на месте, золотая кнопка не утяжеляет середину экрана).
   «Пара» и «Семья» — общие цели контура (js/circles/goals-view.js).

   С 64 (владелец 15.11.2026: «нелогично — „+“ отдельно, а „здесь будут твои цели“ ниже»): «Мои цели» — ОДНА плашка.
   Слева золотой «+» — сразу раскрывает плашку и ставит курсор в строку новой цели; справа стрелка — раскрыть и
   свернуть. Внутри — строка новой цели, цели в работе и «Сбылось». В карточке цели — текст, описание, фото и голос
   (фото — поле записей media/, голос — перенесён из «Дверей» «Кванта», goals/goal-media.js). */

let tab = 'mine';
let boxOpen = false; // плашка «Мои цели» раскрыта — переживает перерисовку
let lettersOpen = false; // плашка письма раскрыта — переживает перерисовку («Написать», «Запечатать»)

function goalRow(g) {
  const mark = h('button', {
    type: 'button',
    class: `goal__mark${g.done ? ' is-done' : ''}`,
    'aria-label': g.done ? t('goals.undo') : t('goals.done'),
    'aria-pressed': g.done ? 'true' : 'false',
    onclick: () => {
      goals.toggle(g.id);
      if (!g.done) toast({ title: t('goals.congrats') });
    },
  }, svg(icons.check));

  const body = h('button', { type: 'button', class: 'goal__body', onclick: () => editGoal(g) },
    h('span', { class: 'goal__text' }, g.text),
    g.note ? h('span', { class: 'goal__note' }, g.note) : null,
    g.photos?.length ? photoStrip(g.photos) : null,
    g.done && g.doneAt ? h('span', { class: 'goal__date' }, t('goals.doneOn', { date: formatDate(g.doneAt.slice(0, 10)) })) : null,
  );

  return h('li', { class: `card goal${g.done ? ' goal--done' : ''}` }, mark, body);
}

function editGoal(g) {
  const f = field({ label: t('goals.text'), multiline: true, rows: 3, maxlength: goals.MAX_TEXT, value: g.text });
  const note = field({ label: t('goals.note'), multiline: true, rows: 4, maxlength: goals.MAX_NOTE, value: g.note || '' });
  let photoIds = [...(g.photos || [])];
  const photosNode = photoField({ ids: photoIds, onChange: (ids) => { photoIds = ids; } });
  // Голос — сразу на телефон, как у «Дверей» «Кванта»: «Сохранить» для него не нужно
  const voice = goalAudioField(g.id);
  // Снимки, которые больше никому не нужны (убрали, не сохранили), — стереть
  const tidy = () => media.prune(usedPhotoIds()).catch(() => {});

  const save = h('button', { type: 'button', class: 'btn btn--gold btn--block' }, t('common.save'));
  save.addEventListener('click', () => {
    goals.rename(g.id, f.control.value);
    goals.update(g.id, { note: note.control.value, photos: photoIds });
    voice.close();
    closeSheet();
    tidy();
  });
  const del = h('button', { type: 'button', class: 'btn btn--danger btn--block' }, svg(icons.trash), t('common.delete'));
  del.addEventListener('click', async () => {
    if (!confirm(t('goals.deleteConfirm'))) return;
    await voice.close();
    goals.remove(g.id);
    deleteGoalAudio(g.id);
    closeSheet();
    tidy();
  });
  openSheet({
    title: t('goals.edit'),
    content: h('div', { class: 'stack' }, f.node, note.node, photosNode, voice.node, save, del),
    onClose: () => { voice.close(); tidy(); },
  });
  setTimeout(() => f.control.focus(), 300);
}

export function render(view, ctx) {
  const tabs = segmented({
    label: t('goals.title'),
    options: ['mine', 'pair', 'family'].map((k) => ({ value: k, label: t(`us.goals.${k}`) })),
    value: tab,
    onChange: (v) => { tab = v; ctx.rerender(); },
  });
  if (tab !== 'mine') {
    add(view, h('h1', { class: 'screen-title' }, t('goals.title')), tabs, circleGoals(tab));
    return;
  }
  const list = goals.all();
  const open = list.filter((g) => !g.done);
  const done = list.filter((g) => g.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));

  const input = h('input', {
    class: 'input goals__input',
    placeholder: t('goals.placeholder'),
    maxlength: goals.MAX_TEXT,
    'aria-label': t('goals.placeholder'),
    enterkeyhint: 'done',
  });
  const addBtn = h('button', { type: 'submit', class: 'goals__add', 'aria-label': t('goals.add') }, svg(icons.plus));
  const form = h('form', { class: 'goals__new' }, input, addBtn);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (goals.add(input.value)) { input.value = ''; boxOpen = true; }
    else input.focus();
  });

  add(view,
    h('h1', { class: 'screen-title' }, t('goals.title')),
    tabs,
    h('p', { class: 'screen-lead' }, t('goals.lead')),
    goalsBox({ list, open, done, form, input }),
    helpPlate(),
    lettersPlate(ctx),
  );
}

/* Одна плашка «Мои цели»: «+» слева — раскрыть и сразу писать; стрелка справа — раскрыть и свернуть. */
function goalsBox({ list, open, done, form, input }) {
  const body = h('div', { class: 'plate__body goals-box__body' },
    form,
    open.length ? h('ul', { class: 'goals__list' }, ...open.map(goalRow)) : null,
    done.length ? h('h2', { class: 'caps goals__heading' }, t('goals.doneTitle'), h('span', { class: 'goals__count' }, String(done.length))) : null,
    done.length ? h('ul', { class: 'goals__list' }, ...done.map(goalRow)) : null,
  );
  const box = h('section', { class: `card plate plate--panel goals-box${boxOpen ? ' is-open' : ''}` });
  const setOpen = (v) => {
    boxOpen = v;
    box.classList.toggle('is-open', v);
    toggle.setAttribute('aria-expanded', String(v));
    body.hidden = !v;
  };
  const plus = h('button', {
    type: 'button',
    class: 'plate__icon goals-box__plus',
    'aria-label': t('goals.add'),
    onclick: () => { setOpen(true); setTimeout(() => input.focus(), 50); },
  }, svg(icons.plus));
  const toggle = h('button', { type: 'button', class: 'goals-box__toggle', onclick: () => setOpen(!boxOpen) },
    h('span', { class: 'plate__text' },
      h('span', { class: 'plate__title' }, list.length ? t('goals.boxTitle') : t('goals.emptyTitle')),
      h('span', { class: 'plate__lead' }, list.length ? t('goals.boxCount', { open: open.length, done: done.length }) : t('goals.boxEmpty')),
    ),
    h('span', { class: 'plate__arrow', 'aria-hidden': 'true' }, svg(icons.chevronRight)),
  );
  box.append(h('div', { class: 'plate__head goals-box__head' }, plus, toggle), body);
  setOpen(boxOpen);
  return box;
}

// «Помощь» — библиотека: первое свидание, вопросы, общие темы, комплименты (владелец 14.11.2026)
function helpPlate() {
  return plateLink({ href: '#/help', icon: icons.sparkle, title: t('help.title'), lead: t('help.lead') });
}

function lettersPlate(ctx) {
  const node = platePanel({
    icon: icons.mail,
    title: lt('title'),
    open: lettersOpen,
    body: lettersBody(ownBox, { rerender: () => { lettersOpen = true; ctx.rerender(); } }),
  });
  node.addEventListener('toggle', () => { lettersOpen = node.open; });
  return node;
}
