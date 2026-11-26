import { h, svg, add } from '../../core/dom.js';
import { t, formatDate, getLang } from '../../core/i18n.js';
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
import { photoOf, photo, fixed } from '../../photos/photos.js';
import { plateLink, platePanel } from '../../ui/plate.js';
import * as help from '../../help/help.js';
import { at } from '../../anketa/texts.js';
import { itemPlate } from '../help/help.js';
import { intimLink } from '../intim/intim.js';
import { secretPlate } from '../../secret/secret.js';
import { photoStrip } from '../../media/photo-field.js';
import * as mediaStore from '../../media/photos.js';
import { usedPhotoIds } from '../../media/used.js';
import { goalAudioField, deleteGoalAudio, getGoalAudioMeta } from '../../goals/goal-media.js';
import { formatDuration } from '../../goals/audio.js';
import { draft, setDraft, resetDraft } from '../../goals/draft.js';
import { now as syncNow } from '../../sync/sync.js';

/* ЭКРАН «ЦЕЛИ»: вкладки «Мои · Пара · Семья» (владелец 13.11.2026: «цели у женщины, если она одна, и цели пары,
   если они вместе; и семьи»). «Мои» — сверху строка «Новая цель» и золотой «+», ниже — цели в работе, внизу —
   «Сбылось» с датами; кружок слева отмечает «сбылось», нажатие на текст открывает правку (данные — js/goals/).
   Под целями — плашки одного вида (ui/plate.js, владелец 15.11.2026: «чтобы не было хаоса»): «Помощь», в самом
   низу — «Письмо себе в будущее» (раскрывается на месте, золотая кнопка не утяжеляет середину экрана).
   «Пара» и «Семья» — общие цели контура (js/circles/goals-view.js).

   С 64 (владелец 15.11.2026: «нелогично — „+“ отдельно, а „здесь будут твои цели“ ниже»): «Мои цели» — ОДНА плашка.
   Слева золотой «+» — сразу раскрывает плашку и ставит курсор в строку новой цели; справа стрелка — раскрыть и
   свернуть. Внутри — строка новой цели, цели в работе и «Сбылось». В карточке цели — текст, описание, фото и голос
   (фото — поле записей media/, голос — перенесён из «Дверей» «Кванта», goals/goal-media.js).

   С 68 (владелец 15.11.2026: «нажимаю плюсик — и нет даже упоминания, что можно добавить; сделай, как на снимке»)
   строка новой цели — как дверь «Кванта»: сверху справа «✓ Готово» (горит, когда цель написана), поле и дискета
   ростом с него, под ними «Записать · Файл · Фото n/3», голос с плеером и снимки. Голос и фото можно добавить ещё до
   дискеты — они лежат в черновике (goals/draft.js) под номером будущей цели. Строка строится один раз и переживает
   перерисовку экрана: идущая запись голоса и набранный текст не обрываются. В карточке цели — тот же ряд, внизу
   «✓ Готово» (сохранить и закрыть). */

let tab = 'mine';
let boxOpen = false; // плашка «Мои цели» раскрыта — переживает перерисовку
let lettersOpen = false; // плашка письма раскрыта — переживает перерисовку («Написать», «Запечатать»)
let composer = null; // строка новой цели: { id, lang, node, input } — одна на черновик

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

  // Есть голос — пометка «🎤 0:12» (длина из базы звука, приходит чуть позже)
  const voice = h('span', { class: 'goal__voice', hidden: true });
  getGoalAudioMeta(g.id).then((m) => {
    if (!m) return;
    voice.textContent = '🎤 ' + (formatDuration(m.durationMs) || t('goals.audio.recName'));
    voice.hidden = false;
  }).catch(() => {});
  const body = h('button', { type: 'button', class: 'goal__body', onclick: () => editGoal(g) },
    h('span', { class: 'goal__text' }, g.text),
    g.note ? h('span', { class: 'goal__note' }, g.note) : null,
    voice,
    g.photos?.length ? photoStrip(g.photos) : null,
    g.done && g.doneAt ? h('span', { class: 'goal__date' }, t('goals.doneOn', { date: formatDate(g.doneAt.slice(0, 10)) })) : null,
  );

  return h('li', { class: `card goal${g.done ? ' goal--done' : ''}` }, mark, body);
}

function editGoal(g) {
  const f = field({ label: t('goals.text'), multiline: true, rows: 3, maxlength: goals.MAX_TEXT, value: g.text });
  const note = field({ label: t('goals.note'), multiline: true, rows: 4, maxlength: goals.MAX_NOTE, value: g.note || '' });
  let photoIds = [...(g.photos || [])];
  // Голос и фото — одним рядом, как у двери «Кванта»; голос ложится на телефон сразу, фото — по «Готово»
  const media = goalAudioField(g.id, { photos: photoIds, onPhotos: (ids) => { photoIds = ids; } });
  // Снимки, которые больше никому не нужны (убрали, не сохранили), — стереть
  const tidy = () => mediaStore.prune(usedPhotoIds()).catch(() => {});

  const ready = h('button', { type: 'button', class: 'goal-ready-btn' }, t('goals.ready'));
  ready.addEventListener('click', () => {
    goals.rename(g.id, f.control.value);
    goals.update(g.id, { note: note.control.value, photos: photoIds });
    media.close();
    closeSheet();
    tidy();
    syncNow();
  });
  const del = h('button', { type: 'button', class: 'btn btn--danger btn--block' }, svg(icons.trash), t('common.delete'));
  del.addEventListener('click', async () => {
    if (!confirm(t('goals.deleteConfirm'))) return;
    await media.close();
    goals.remove(g.id);
    deleteGoalAudio(g.id);
    closeSheet();
    tidy();
  });
  openSheet({
    title: t('goals.edit'),
    content: h('div', { class: 'stack' }, f.node, media.node, note.node, ready, del),
    onClose: () => { media.close(); tidy(); },
  });
  setTimeout(() => f.control.focus(), 300);
}

/* Строка новой цели (как строка двери «Кванта»): «✓ Готово» — поле и дискета — «Записать · Файл · Фото». */
function goalComposer() {
  const d = draft();
  if (composer && composer.id === d.id && composer.lang === getLang()) return composer;
  composer?.media.close();

  const badge = h('span', { class: 'goal-ready', hidden: true }, t('goals.ready'));
  const input = h('input', {
    class: 'input goal-new__input',
    placeholder: t('goals.placeholder'),
    maxlength: goals.MAX_TEXT,
    'aria-label': t('goals.placeholder'),
    enterkeyhint: 'done',
    value: d.text,
  });
  const save = h('button', { type: 'submit', class: 'goal-save', 'aria-label': t('goals.add'), title: t('goals.add') },
    h('span', { class: 'goal-save__ico', 'aria-hidden': 'true' }));
  const paint = () => {
    const has = !!input.value.trim();
    badge.hidden = !has;
    save.disabled = !has;
  };
  input.addEventListener('input', () => { setDraft({ text: input.value }); paint(); });

  const media = goalAudioField(d.id, { photos: d.photos, onPhotos: (ids) => setDraft({ photos: ids }) });
  const form = h('form', { class: 'goal-new' },
    h('div', { class: 'goal-new__top' }, h('span', { class: 'caps goal-new__label' }, t('goals.addHint')), badge),
    h('div', { class: 'goal-new__head' }, input, save),
    media.node,
    h('p', { class: 'goal-new__hint faint' }, t('goals.composeHint')),
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cur = draft();
    if (!input.value.trim()) { input.focus(); return; }
    await media.close(); // идёт запись — сохранить её в цель
    const goal = goals.add(input.value, new Date(), { id: cur.id, photos: cur.photos });
    if (!goal) { input.focus(); return; }
    boxOpen = true;
    resetDraft();
    composer = null;
    toast({ title: t('goals.saved') });
    syncNow(); // голос и фото — в копию сразу
  });
  paint();
  composer = { id: d.id, lang: getLang(), node: form, input, media };
  return composer;
}

export function render(view, ctx) {
  const tabs = segmented({
    label: t('goals.title'),
    options: ['mine', 'pair', 'family'].map((k) => ({ value: k, label: t(`us.goals.${k}`) })),
    value: tab,
    onChange: (v) => { tab = v; ctx.rerender(); },
  });
  if (tab !== 'mine') {
    // Фото цели пары / семьи — лентой во всю ширину (js/photos/: goals.pair, goals.family)
    add(view, h('h1', { class: 'screen-title' }, t('goals.title')), tabs, photoOf(`goals.${tab}`, 'photo--hero'), circleGoals(tab));
    return;
  }
  const list = goals.all();
  const open = list.filter((g) => !g.done);
  const done = list.filter((g) => g.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));

  const { node: form, input } = goalComposer();

  add(view,
    h('h1', { class: 'screen-title' }, t('goals.title')),
    tabs,
    h('p', { class: 'screen-lead' }, t('goals.lead')),
    photoOf('goals.mine', 'photo--hero'), // мечта вместе: лайнер, дом на колёсах, доска мечты, купола — лентой (js/photos/)
    goalsBox({ list, open, done, form, input }),
    redFlagPlate(),
    meetPlate(ctx),
    // «Вопросы» — двумя разделами (с 177, владелец 23.11.2026): первое свидание и для пары
    helpPlate('date'),
    helpPlate('pair'),
    // «Анкеты» — свой раздел рядом с «Вопросами» (с 176, владелец 22.11.2026: «вопросы отдельно, для обсуждения, а
    // анкеты — отдельный пункт… и вынести в артефакты»); раскрывается прямо здесь
    surveysPlate(ctx),
    complimentsPlate(ctx),
    libraryPlate(),
    // «Карты рождения» (#/charts, 26.11.2026): Пифагор, Матрица Ладини, Human Design — для себя, партнёра, детей
    plateLink({ href: '#/charts', icon: icons.sparkle, title: 'Карты рождения', lead: 'Пифагор, Матрица Ладини, Human Design — для тебя, партнёра, бизнеса, детей' }),
    // «Секретные материалы» — главы книги о чакрах (js/secret/): с 172 здесь, а не в «Тайном архиве» (владелец 22.11.2026:
    // «две книжки одинаковых в одном разделе — нелогично»; целиком книга — в архиве)
    secretPlate(ctx),
    // «Если постучишь в мою тайную дверь» — раздел 18+ (#/intim): с 161 здесь, под «Библиотекой» (владелец 22.11.2026)
    intimLink(ctx.lang),
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

/* «АРТЕФАКТЫ» (было «Цели», владелец 15.11.2026: «у нас всё как игра — артефакты»). Порядок: «Мои цели» →
   «Красный флаг — Оценивать запрещено» (кружок как у всех, флаг красный, запрет — красным через черточку) →
   «Первое свидание» → «Вопросы» (бывшая «Помощь») → «Комплименты» (раскрываются на месте) → «Библиотека» → письмо. */
function redFlagPlate() {
  return plateLink({
    href: '#/redflag',
    cls: 'plate--red',
    icon: icons.flag,
    title: [t('redflag.title'), h('span', { class: 'plate__ban' }, ` — ${t('redflag.ban')}`)],
  });
}

function meetPlate(ctx) {
  return plateLink({ href: '#/meet', icon: icons.rings, title: t('help.meetTitle'), lead: help.content(ctx.lang)?.meetLead });
}

function helpPlate(scene) {
  return plateLink({ href: `#/help?${scene}`, icon: icons.chat, title: t(`help.${scene}Title`), lead: t(`help.${scene}Lead`) });
}

// Комплименты — те же, что были в «Помощи»; плашка раскрывается прямо здесь (itemPlate из screens/help/)
function complimentsPlate(ctx) {
  const item = help.content(ctx.lang)?.items.find((i) => i.key === 'compliments');
  return item ? itemPlate({ ...item, lead: t('complimentsPlate.lead') }, ctx, null) : null;
}

function surveysPlate(ctx) {
  const item = help.content(ctx.lang)?.items.find((i) => i.key === 'surveys');
  // «Пять языков любви» — ссылкой (владелец 23.11.2026): анкеты живут на своём экране, там же сохраняется итог у каждого
  const love = h('a', { class: 'help__folder surveys__link', href: '#/love' },
    h('span', { class: 'help__folder-summary' }, svg(icons.heart, 'help__chevron'), h('span', { class: 'help__folder-title' }, t('help.loveLink')), svg(icons.chevronRight, 'surveys__arrow')));
  // «Единая анкета партнёра» — первой (владелец 26.11.2026: «в артефакты, в раздел анкеты 100%»); свой экран #/anketa
  const anketa = h('a', { class: 'help__folder surveys__link', href: '#/anketa' },
    h('span', { class: 'help__folder-summary' }, svg(icons.check, 'help__chevron'), h('span', { class: 'help__folder-title' }, at('plateTitle')), svg(icons.chevronRight, 'surveys__arrow')));
  return item ? itemPlate(item, ctx, null, { photo: photo(fixed('surveys', 0)), before: [anketa], extra: [love], extraCount: 3 }) : null;
}

function libraryPlate() {
  return plateLink({ href: '#/library', icon: icons.journal, title: t('library.title'), lead: t('library.lead') });
}

function lettersPlate(ctx) {
  const node = platePanel({
    icon: icons.mail,
    title: lt('title'),
    open: lettersOpen,
    // Фото «пишет в блокноте» слева, вступление обтекает (js/photos/: letters.<часть>)
    cls: 'has-photo',
    body: ((nodes) => [h('div', { class: 'has-photo' }, photoOf('letters'), nodes[0]), ...nodes.slice(1)])(
      lettersBody(ownBox, { rerender: () => { lettersOpen = true; ctx.rerender(); } })),
  });
  node.addEventListener('toggle', () => { lettersOpen = node.open; });
  return node;
}
