import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { content, myLanguage } from '../love/love.js';
import { foldCard } from '../ui/fold.js';
import { deedMark } from '../love/cards.js';
import * as deeds from '../score/deeds.js';
import { photoOf } from '../photos/photos.js';
import * as circles from '../circles/circles.js';
import { setDraft } from '../circles/chat-view.js';
import { eveningOf } from '../evening/evening.js';
import { langData } from '../program/source.js';

/* «Я-СООБЩЕНИЕ» на экране «Сегодня» — КАЖДЫЙ ДЕНЬ (владелец 13.11.2026; до 40 — дни 4–6). Какой пример в какой
   день — program/index.js → imsgOf; в дни 4–6 он связан с заданием дня 1, 2 или 3 этой недели: ситуация,
   как обычно говорят и как сказать по-новому через «я». Ниже — формула и правило «после «я чувствую»
   только чувство». Если выбран свой язык любви — как сказать о нём мужчине и как поблагодарить его;
   нет — приглашение пройти анкету. */
function toChat(ctx) {
  const pair = circles.pair();
  if (!pair || !circles.isComplete(pair)) return null;
  return h('button', {
    type: 'button', class: 'btn btn--block imsg__to-chat',
    onclick: () => { setDraft(pair.id, `${t('us.chat.starters.when')} `); ctx.go('us'); },
  }, svg(icons.chat), t('imsg.toChat'));
}

/** Я-сообщение вслух вдвоём — вечерний вопрос дней 4–6 (evening/). Владелец 18.11.2026: «две кнопки „Я-сообщение“ — объедини»:
    он больше не отдельная карточка, а блок внутри этой, со своей отметкой «Мы поговорили» (свой балл, deeds 'evening'). */
export function aloudOf(ctx, plan) {
  const q = eveningOf(plan, ctx.lang);
  return q?.imsg ? q : null;
}

/** aloud — показывать ли внутри «Я-сообщение вслух» (в настройках «Разделы дня» у него своя галочка). */
export function imsgCard(ctx, plan, { aloud = true } = {}) {
  const m = plan.imsg;
  if (!m) return null;
  const mine = myLanguage(plan.day, ctx.lang);
  const q = aloud ? aloudOf(ctx, plan) : null;
  const e = q ? langData(ctx.lang)?.evening : null;

  // Сворачивается стрелкой, как все карточки дня (владелец 14.11.2026); свёрнута — ситуация дня одной строкой
  return foldCard({
    id: 'imsg',
    cls: 'imsg',
    icon: icons.sparkle,
    title: t('imsg.title'),
    lead: m.title,
    points: (deeds.isDone(ctx.todayIso, 'imsg') ? 1 : 0) + (q && deeds.isDone(ctx.todayIso, 'evening') ? 1 : 0),
    body: [
    // Фото разговора (js/photos/: imsg) слева; напоминание и пример его обтекают
    h('div', { class: 'has-photo imsg__top' },
    photoOf('imsg'),
    h('p', { class: 'imsg__remind' }, t('imsg.remind')),
    h('div', { class: 'imsg__example' },
      h('p', { class: 'imsg__situation' }, m.title),
      h('div', { class: 'imsg__line imsg__line--old' },
        h('span', { class: 'imsg__tag' }, t('imsg.usual')),
        h('q', { class: 'imsg__text' }, m.old),
      ),
      h('div', { class: 'imsg__line imsg__line--new' },
        h('span', { class: 'imsg__tag' }, t('imsg.fresh')),
        h('q', { class: 'imsg__text' }, m.say),
      ),
    ),
    ),
    h('p', { class: 'imsg__formula' }, t('imsg.formula')),
    h('p', { class: 'imsg__rule' }, t('imsg.rule')),
    // В чат пары — своими словами: начало фразы уже в поле, «за что» человек дописывает сам (владелец 17.11.2026)
    toChat(ctx),
    mine
      ? h('div', { class: 'imsg__love' },
        h('p', { class: 'imsg__love-title' }, svg(icons.heart, 'imsg__heart'), t('imsg.myLang', { name: mine.name })),
        h('div', { class: 'imsg__line imsg__line--new' }, h('span', { class: 'imsg__tag' }, t('imsg.tell')), h('q', { class: 'imsg__text' }, mine.tell)),
        h('div', { class: 'imsg__line imsg__line--new' }, h('span', { class: 'imsg__tag' }, t('imsg.thanks')), h('q', { class: 'imsg__text' }, mine.thanks)),
      )
      : content(ctx.lang)
        ? h('div', { class: 'imsg__love' },
          h('p', { class: 'card__text' }, t('imsg.loveInvite')),
          h('a', { class: 'love-card__link', href: '#/love' }, t('imsg.loveBtn'), svg(icons.chevronRight, 'love-card__chevron')),
        )
        : null,
    deedMark(ctx, 'imsg'),
    // Вслух вдвоём — продолжение той же темы (вечерний вопрос пары, дни 4–6)
    q ? h('div', { class: 'imsg__aloud' },
      h('p', { class: 'imsg__love-title' }, svg(icons.chat, 'imsg__heart'), e?.imsgLabel || ''),
      e?.imsgLead ? h('p', { class: 'card__text faint' }, e.imsgLead) : null,
      h('h2', { class: 'card__title talk__theme' }, q.text),
      q.by ? h('p', { class: 'faint evening__by' }, `— ${q.by}`) : null,
      deedMark(ctx, 'evening'),
    ) : null,
    ],
  }).node;
}
