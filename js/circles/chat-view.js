import { h, svg } from '../core/dom.js';
import { t, formatDate } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import { familyApi } from '../kids/family-api.js';
import { taskCard, taskComposer } from '../kids/tasks-view.js';
import { awardCard } from '../kids/family-dream.js';
import { kt } from '../kids/texts.js';
import { canRecord, startRecording, preparePhoto, newMediaId, MAX_RECORD_MS } from './media.js';
import { reactionsRow, quickReplies, thanksMeter, councilCard } from './chat-extras.js';

/* ЧАТ ПАРЫ И СЕМЕЙНЫЙ ЧАТ (владелец 13.11.2026: «отдельный чат, где люди понимают, что это написал их самый близкий
   человек или ребёнок; всё по делу»; ТЗ раздел 4). Сверху — быстрые сигналы (помощь, поддержка, срочно, спасибо,
   идея), ниже — переписка по дням, внизу — поле, фото, микрофон и «Отправить». Сообщение — запись msg { text,
   signal, at, audio?: { id, ms }, photo?: { id, w, h } }.

   Голосовые и фото (владелец 14.11.2026: «везде, где можно написать, — микрофон и фото; видит вся семья»):
   файл уходит на сервер семьи (circles/media.js), сообщение ссылается на него. Микрофон: нажал — пошла запись
   (до 2 минут), «Отправить» или «Отмена». Фото: выбрал из галереи или снял — ужимается и уходит.

   Экран перерисовывается, когда приходит новое: набранный текст, фокус поля, идущая запись и играющее голосовое
   переживают перерисовку (состояние — здесь, вне отрисовки). */

export const SIGNALS = ['help', 'support', 'urgent', 'thanks', 'idea'];
const SIGNAL_ICON = { help: icons.bell, support: icons.heart, urgent: icons.bell, thanks: icons.sparkle, idea: icons.sun };
const MAX = 1000;

const drafts = {};

/** Положить начало фразы в поле чата (карточка я-сообщения на «Сегодня»): человек дописывает сам. */
export function setDraft(circleId, text) { drafts[circleId] = text; }

/* Начала тёплых фраз (владелец 17.11.2026: «начало отправляется автоматически, а остальное дописывает человек —
   чтобы каждый раз было своё»): нажал — начало встало в поле, дописал «за что» — отправил. */
const STARTERS = ['thanks', 'when', 'glad'];
let focused = null;

// Идущая запись голосового: { circleId, handle, timer } — одна на приложение
let rec = null;
// Играющее голосовое: { id, audio }
let playing = null;

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

/** Отправить файл и сообщение со ссылкой на него. Связи нет — сказать прямо. */
async function sendMedia(api, kind, blob, meta) {
  const id = newMediaId();
  try {
    await api.media.upload(id, blob, { kind, ...meta });
  } catch {
    toast({ title: t('us.chat.uploadFail') });
    return false;
  }
  const data = kind === 'audio' ? { audio: { id, ms: meta.ms } } : { photo: { id, w: meta.w, h: meta.h } };
  api.put('msg', api.newId('m'), { text: '', signal: null, at: new Date().toISOString(), ...data });
  return true;
}

const mmss = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Голосовое в ленте: кнопка ▶ / ❚❚ и длительность; файл качается при первом нажатии. */
function voiceNote(api, audio) {
  const isOn = () => playing?.id === audio.id && !playing.audio.paused;
  const btn = h('button', { type: 'button', class: 'chat__voice-btn', 'aria-label': t('us.chat.play') });
  const label = h('span', { class: 'chat__voice-time' }, mmss(audio.ms || 0));
  const paint = () => {
    const on = isOn();
    btn.replaceChildren(svg(on ? icons.pause : icons.play));
    btn.classList.toggle('is-on', on);
  };
  paint();
  btn.addEventListener('click', async () => {
    if (isOn()) {
      playing.audio.pause();
      paint();
      return;
    }
    if (playing) playing.audio.pause();
    try {
      const url = await api.media.url(audio.id);
      const a = new Audio(url);
      playing = { id: audio.id, audio: a };
      a.addEventListener('ended', paint);
      a.addEventListener('pause', paint);
      await a.play();
      paint();
    } catch {
      toast({ title: t('us.chat.loadFail') });
    }
  });
  return h('span', { class: 'chat__voice' }, svg(icons.mic, 'chat__voice-icon'), btn, label);
}

/** Фото в ленте: качается сразу; нажатие — во весь экран. */
function photoNote(api, photo) {
  // Подпись — после загрузки: пока файла нет (связь), видна пустая рамка, а не значок битой картинки
  const img = h('img', { class: 'chat__photo', alt: '', loading: 'lazy' });
  img.addEventListener('load', () => { img.alt = t('us.chat.photoAlt'); });
  if (photo.w && photo.h) img.style.aspectRatio = `${photo.w} / ${photo.h}`;
  const cached = api.media.cached(photo.id);
  if (cached) img.src = cached;
  else api.media.url(photo.id).then((u) => { img.src = u; }).catch(() => img.classList.add('is-missing'));
  img.addEventListener('click', () => img.src && openPhoto(img.src));
  return img;
}

function openPhoto(src) {
  const close = h('button', { type: 'button', class: 'viewer__close', 'aria-label': t('common.close') }, svg(icons.close));
  const root = h('div', { class: 'viewer', role: 'dialog', 'aria-modal': 'true', tabindex: '-1' }, h('img', { class: 'viewer__img', src, alt: '' }), close);
  const shut = () => { root.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') shut(); };
  close.addEventListener('click', shut);
  root.addEventListener('click', (e) => { if (e.target === root) shut(); });
  document.addEventListener('keydown', onKey);
  document.body.append(root);
  root.focus();
}

const atOf = (x) => x.data?.at || x.updatedAt;
let composing = false;

function bubble(circle, m, api) {
  const mine = m.author === circle.me;
  const d = m.data || {};
  const time = new Date(d.at || m.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return h('li', { class: `chat__msg ${mine ? 'is-mine' : 'is-theirs'} ${sideClass(circle, m.author)}${d.signal ? ` is-signal is-${d.signal}` : ''}${d.photo ? ' has-photo' : ''}` },
    mine ? null : h('span', { class: 'chat__who' }, api.name(m.author)),
    d.signal ? h('span', { class: 'chat__signal' }, svg(SIGNAL_ICON[d.signal] || icons.sparkle, 'chat__signal-icon'), t(`us.chat.signals.${d.signal}`)) : null,
    d.photo && api.media ? photoNote(api, d.photo) : null,
    d.audio && api.media ? voiceNote(api, d.audio) : null,
    d.text ? h('span', { class: 'chat__text' }, d.text) : null,
    h('span', { class: 'chat__time' }, time),
    // Сердечки и смайлики под сообщением (chat-extras.js)
    reactionsRow(api, m),
  );
}

/** Строка записи голосового: красная точка, время, «Отмена» и «Отправить». */
function recordingBar(api, circle, rerender) {
  const time = h('span', { class: 'chat__rec-time' }, mmss(Date.now() - rec.handle.startedAt));
  const tick = setInterval(() => {
    if (!rec || !time.isConnected) { clearInterval(tick); return; }
    time.textContent = mmss(Date.now() - rec.handle.startedAt);
  }, 500);
  const cancel = h('button', { type: 'button', class: 'btn btn--ghost chat__rec-cancel' }, t('us.chat.cancel'));
  cancel.addEventListener('click', () => {
    clearTimeout(rec.timer);
    rec.handle.cancel();
    rec = null;
    rerender();
  });
  const done = h('button', { type: 'button', class: 'btn btn--gold chat__rec-send' }, svg(icons.send), t('us.chat.sendVoice'));
  done.addEventListener('click', () => finishRecording(api, rerender));
  return h('div', { class: 'chat__compose chat__rec' },
    h('span', { class: 'chat__rec-dot', 'aria-hidden': 'true' }),
    h('span', { class: 'chat__rec-label' }, t('us.chat.recording')),
    time, cancel, done);
}

async function finishRecording(api, rerender) {
  if (!rec) return;
  const { handle, timer } = rec;
  clearTimeout(timer);
  rec = null;
  rerender();
  const { blob, ms } = await handle.stop();
  if (blob.size) await sendMedia(api, 'audio', blob, { ms });
}

/* api — чьими руками читать и писать: кабинет родителя (по умолчанию, circles/) или телефон ребёнка (kids/kid-store.js).
   В семейном чате вместе с сообщениями идут дела семьи (kids/tasks-view.js): «＋ Дело», «Беру», звёзды. */
export function chatView(circle, api = familyApi(circle)) {
  const family = circle.kind === 'family';
  const list = [...api.items('msg'), ...(family ? [...api.items('task'), ...api.items('award')] : [])].sort((a, b) => atOf(a).localeCompare(atOf(b)));
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
    feed.append(m.kind === 'task' ? taskCard(api, m) : m.kind === 'award' ? awardCard(api, m) : bubble(circle, m, api));
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

  // Перерисовать только строку ввода (запись началась / закончилась) — без перерисовки всего экрана
  let composeNode = null;
  const recompose = () => {
    const next = compose();
    composeNode.replaceWith(next);
    composeNode = next;
  };

  function compose() {
    if (rec && rec.circleId === circle.id && api.media) return recordingBar(api, circle, recompose);
    const tools = [];
    if (api.media) {
      // Фото: галерея или камера — выбирает телефон
      const file = h('input', { type: 'file', accept: 'image/*', class: 'chat__file', hidden: true });
      file.addEventListener('change', async () => {
        const f = file.files?.[0];
        file.value = '';
        if (!f) return;
        try {
          const { blob, w, h: hh } = await preparePhoto(f);
          await sendMedia(api, 'photo', blob, { w, h: hh });
        } catch {
          toast({ title: t('us.chat.uploadFail') });
        }
      });
      tools.push(file, h('button', { type: 'button', class: 'chat__tool', 'aria-label': t('us.chat.photo'), title: t('us.chat.photo'), onclick: () => file.click() }, svg(icons.camera)));
      if (canRecord()) {
        tools.push(h('button', {
          type: 'button', class: 'chat__tool chat__mic', 'aria-label': t('us.chat.mic'), title: t('us.chat.mic'),
          onclick: async () => {
            if (rec) return;
            try {
              const handle = await startRecording();
              // Две минуты — и голосовое уходит само
              const timer = setTimeout(() => finishRecording(api, recompose), MAX_RECORD_MS);
              rec = { circleId: circle.id, handle, timer };
              recompose();
            } catch {
              toast({ title: t('us.chat.micDenied') });
            }
          },
        }, svg(icons.mic)));
      }
    }
    return h('div', { class: 'chat__compose' },
      input,
      h('div', { class: 'chat__tools' },
        ...tools,
        h('button', { type: 'button', class: 'chat__send', 'aria-label': t('us.chat.send'), onclick: submit }, svg(icons.send)),
      ),
    );
  }
  composeNode = compose();

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
    // Семейный совет недели — только в семье (chat-extras.js)
    family && api.role !== 'child' ? councilCard(api) : null,
    feed,
    api.role === 'child' ? null : thanksMeter(api),
    quickReplies((text) => send(api, text)),
    api.role === 'child' ? null : h('div', { class: 'chat__starters', role: 'group', 'aria-label': t('us.chat.startersTitle') },
      ...STARTERS.map((k) => h('button', {
        type: 'button', class: 'chat__starter',
        onclick: () => { input.value = `${t(`us.chat.starters.${k}`)} `; drafts[circle.id] = input.value; input.focus(); input.setSelectionRange(input.value.length, input.value.length); },
      }, t(`us.chat.starters.${k}`), '…'))),
    composeNode,
  );
  // Последнее — внизу на виду; поле в фокусе — вернуть фокус после перерисовки
  requestAnimationFrame(() => {
    feed.scrollTop = feed.scrollHeight;
    if (focused === circle.id && input.isConnected) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });
  return node;
}
