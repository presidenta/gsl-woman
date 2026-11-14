import { h, svg } from '../core/dom.js';
import { t, formatDate } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import * as circles from './circles.js';
import { familyApi } from '../kids/family-api.js';
import { taskCard, taskComposer } from '../kids/tasks-view.js';
import { kt } from '../kids/texts.js';

/* ЧАТ ПАРЫ И СЕМЕЙНЫЙ ЧАТ (владелец 13.11.2026: «отдельный чат, где люди понимают, что это написал их самый близкий
   человек или ребёнок; всё по делу»; ТЗ раздел 4). Сверху — быстрые сигналы (помощь, поддержка, срочно, спасибо,
   идея), ниже — переписка по дням, внизу — поле и «Отправить». Сообщение — запись msg { text, signal, at }.

   Экран перерисовывается, когда приходит новое: набранный текст и фокус поля переживают перерисовку (draft). */

export const SIGNALS = ['help', 'support', 'urgent', 'thanks', 'idea'];
const SIGNAL_ICON = { help: icons.bell, support: icons.heart, urgent: icons.bell, thanks: icons.sparkle, idea: icons.sun };
const MAX = 1000;

const drafts = {};
let focused = null;

const sideClass = (c, id) => {
  const m = c.members.find((x) => x.id === id);
  return m?.role === 'child' ? 'is-child' : m?.side === 'man' ? 'is-man' : 'is-woman';
};

function send(api, text, signal = null) {
  const clean = String(text || '').trim().slice(0, MAX);
  if (!clean && !signal) return false;
  api.put('msg', api.newId('m'), { text: clean, signal, at: new Date().toISOString() });
  return true;
}

const atOf = (x) => x.data?.at || x.updatedAt;
let composing = false;

function bubble(circle, m, api) {
  const mine = m.author === circle.me;
  const d = m.data || {};
  const time = new Date(d.at || m.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return h('li', { class: `chat__msg ${mine ? 'is-mine' : 'is-theirs'} ${sideClass(circle, m.author)}${d.signal ? ` is-signal is-${d.signal}` : ''}` },
    mine ? null : h('span', { class: 'chat__who' }, api.name(m.author)),
    d.signal ? h('span', { class: 'chat__signal' }, svg(SIGNAL_ICON[d.signal] || icons.sparkle, 'chat__signal-icon'), t(`us.chat.signals.${d.signal}`)) : null,
    d.text ? h('span', { class: 'chat__text' }, d.text) : null,
    h('span', { class: 'chat__time' }, time),
  );
}

/* api — чьими руками читать и писать: кабинет родителя (по умолчанию, circles/) или телефон ребёнка (kids/kid-store.js).
   В семейном чате вместе с сообщениями идут дела семьи (kids/tasks-view.js): «＋ Дело», «Беру», звёзды. */
export function chatView(circle, api = familyApi(circle)) {
  const family = circle.kind === 'family';
  const list = [...api.items('msg'), ...(family ? api.items('task') : [])].sort((a, b) => atOf(a).localeCompare(atOf(b)));
  // Прочитано — после отрисовки: запись в хранилище посреди отрисовки перерисовала бы экран ещё раз
  queueMicrotask(() => api.markSeen?.());

  const feed = h('ol', { class: 'chat__feed' });
  let day = null;
  for (const m of list.slice(-200)) {
    const d = (m.data?.at || m.updatedAt).slice(0, 10);
    if (d !== day) {
      day = d;
      feed.append(h('li', { class: 'chat__day caps' }, formatDate(d)));
    }
    feed.append(m.kind === 'task' ? taskCard(api, m) : bubble(circle, m, api));
  }
  if (!list.length) feed.append(h('li', { class: 'chat__empty faint' }, t('us.chat.empty')));

  const input = h('textarea', { class: 'textarea chat__input', rows: '2', maxlength: String(MAX), placeholder: t('us.chat.ph'), 'aria-label': t('us.chat.ph') });
  input.value = drafts[circle.id] || '';
  input.addEventListener('input', () => { drafts[circle.id] = input.value; });
  input.addEventListener('focus', () => { focused = circle.id; });
  input.addEventListener('blur', () => { setTimeout(() => { if (document.activeElement !== input) focused = null; }, 0); });
  const submit = () => {
    if (send(api, input.value)) {
      drafts[circle.id] = '';
      input.value = '';
    }
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); }
  });

  // «＋ Дело» — форма над лентой открывается и закрывается на месте, без перерисовки экрана
  const composer = family ? taskComposer(api, () => { composing = false; composer.hidden = true; }) : null;
  if (composer) composer.hidden = !composing;
  const quick = family ? h('button', {
    type: 'button', class: 'chat__quick kid-task-quick', 'aria-expanded': String(composing),
    onclick: (e) => { composing = !composing; composer.hidden = !composing; e.currentTarget.setAttribute('aria-expanded', String(composing)); },
  }, api.role === 'child' ? kt('task.proposeQuick') : kt('task.quick')) : null;

  const node = h('section', { class: 'card chat' },
    h('div', { class: 'chat__signals', role: 'group' },
      ...SIGNALS.map((s) => h('button', { type: 'button', class: `chat__quick is-${s}`, onclick: () => send(api, input.value, s) && (drafts[circle.id] = '') },
        svg(SIGNAL_ICON[s], 'chat__quick-icon'), t(`us.chat.signals.${s}`))),
      quick),
    composer,
    feed,
    h('div', { class: 'chat__compose' },
      input,
      h('button', { type: 'button', class: 'chat__send', 'aria-label': t('us.chat.send'), onclick: submit }, svg(icons.send)),
    ),
  );
  // Последнее — внизу на виду; поле в фокусе — вернуть фокус после перерисовки
  requestAnimationFrame(() => {
    feed.scrollTop = feed.scrollHeight;
    if (focused === circle.id) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });
  return node;
}
