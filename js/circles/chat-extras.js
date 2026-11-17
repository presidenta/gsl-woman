import { h } from '../core/dom.js';
import { t, list } from '../core/i18n.js';
import { isoDate, addDays } from '../core/dates.js';

/* ЧАТ ПАРЫ И СЕМЬИ — ЖИВЫЕ МЕЛОЧИ (владелец 17.11.2026: «это не Telegram… но сердечки, смайлики, оценка сообщений —
   прикольно; быстрые ответы; „спасибо“ 2–3 раза в неделю; семейный совет раз в неделю с вопросами»).

   - Реакции: под сообщением — сердечко или смайлик. Одна реакция от человека на сообщение; та же ещё раз — снять.
     Запись react: id «r.<сообщение>.<кто>», { msg, emoji } — правит только автор (сервер: OWN_KINDS).
   - Быстрые ответы: короткие тёплые фразы одним нажатием — уходят сразу.
   - «Спасибо за неделю»: сколько раз человек поблагодарил в этом чате с понедельника; цель — 3. Без упрёков.
   - Семейный совет (только в семье): раз в неделю карточка с тремя вопросами; «Начать совет» — вопросы уходят в чат,
     каждый отвечает сообщением. Отметка недели — поле council у сообщения. */

export const EMOJI = ['❤️', '😍', '😂', '👍', '🙏', '🔥'];
const THANKS_GOAL = 3;
const THANKS_RE = /спасиб|благодар|дякую|дяку|вдячн|thank/i;

const short = (id) => String(id || '').replace(/-/g, '').slice(0, 8);
const reactId = (msgId, member) => `r.${String(msgId).slice(-24)}.${short(member)}`;

/** Понедельник текущей недели. */
function monday(iso = isoDate()) {
  const d = new Date(`${iso}T12:00:00`);
  return addDays(iso, -((d.getDay() + 6) % 7));
}

/** Реакции под сообщением: собранные значки и кнопка «＋». */
export function reactionsRow(api, m) {
  const all = api.items('react').filter((r) => r.data.msg === m.id);
  const mine = all.find((r) => r.author === api.me);
  const counts = EMOJI.map((e) => [e, all.filter((r) => r.data.emoji === e).length]).filter(([, n]) => n);
  const set = (emoji) => {
    const id = reactId(m.id, api.me);
    if (mine?.data.emoji === emoji) api.drop('react', mine.id);
    else api.put('react', id, { msg: m.id, emoji, at: new Date().toISOString() });
  };
  const palette = h('span', { class: 'chat__palette', hidden: true },
    ...EMOJI.map((e) => h('button', { type: 'button', class: `chat__emoji${mine?.data.emoji === e ? ' is-mine' : ''}`, 'aria-label': e, onclick: () => set(e) }, e)));
  return h('span', { class: 'chat__reacts' },
    ...counts.map(([e, n]) => h('button', {
      type: 'button', class: `chat__react${mine?.data.emoji === e ? ' is-mine' : ''}`, onclick: () => set(e),
    }, n > 1 ? `${e} ${n}` : e)),
    h('button', {
      type: 'button', class: 'chat__react-add', 'aria-label': t('us.chat.react'), title: t('us.chat.react'),
      onclick: () => { palette.hidden = !palette.hidden; },
    }, '☺︎'),
    palette,
  );
}

/** Быстрые ответы: нажал — фраза ушла. */
export function quickReplies(send) {
  const replies = list('us.chat.quickReplies');
  if (!replies.length) return null;
  return h('div', { class: 'chat__replies', role: 'group', 'aria-label': t('us.chat.repliesTitle') },
    ...replies.map((text) => h('button', { type: 'button', class: 'chat__reply', onclick: () => send(text) }, text)));
}

/** «Спасибо за неделю: 1 из 3» — свои благодарности в этом чате с понедельника. */
export function thanksMeter(api) {
  const from = monday();
  const n = api.items('msg').filter((m) => m.author === api.me && (m.data.at || m.updatedAt).slice(0, 10) >= from
    && (m.data.signal === 'thanks' || THANKS_RE.test(m.data.text || ''))).length;
  return h('p', { class: `chat__thanks faint${n >= THANKS_GOAL ? ' is-done' : ''}` },
    n >= THANKS_GOAL ? t('us.chat.thanksDone', { n }) : t('us.chat.thanksWeek', { n, goal: THANKS_GOAL }));
}

/** Семейный совет недели: три вопроса; «Начать совет» — вопросы в чат. Уже начат на этой неделе — ничего. */
export function councilCard(api) {
  const week = monday();
  if (api.items('msg').some((m) => m.data.council === week)) return null;
  const sets = list('us.chat.council.sets');
  if (!Array.isArray(sets) || !sets.length) return null;
  const n = Math.floor(new Date(`${week}T12:00:00`).getTime() / (7 * 864e5));
  const questions = sets[n % sets.length];
  return h('section', { class: 'chat__council' },
    h('p', { class: 'caps chat__council-title' }, `🫖 ${t('us.chat.council.title')}`),
    h('ol', { class: 'chat__council-list' }, ...questions.map((q) => h('li', {}, q))),
    h('button', {
      type: 'button', class: 'btn btn--gold btn--block',
      onclick: () => api.put('msg', api.newId('m'), {
        text: `🫖 ${t('us.chat.council.title')}\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`,
        council: week, at: new Date().toISOString(),
      }),
    }, t('us.chat.council.start')),
  );
}
