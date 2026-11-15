import { h } from '../core/dom.js';
import { read, write } from '../core/store.js';
import { formatDate } from '../core/i18n.js';
import { current, request } from '../account/session.js';
import { openSheet, closeSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import * as goals from '../goals/goals.js';
import * as side from '../side/side.js';
import { now as syncNow } from '../sync/sync.js';
import { buildArchive, parseArchive, restoreArchive } from './archive.js';
import { deliver } from './deliver.js';
import { bt } from './texts.js';

/* КОПИЯ НА ПОЧТУ ЧЕЛОВЕКА (владелец 15.11.2026: «запрашивать, хотите ли сохранить на свою почту; пока пусть будет
   как есть, но почту сделай, и чтобы запрос был»). Подробно — README.md рядом.

   - backupCard() — раздел в настройках: «Сохранить на почту», «Вернуть из файла», дата последней копии.
   - maybeAsk() — вопрос «Сохранить копию всего на свою почту?» листом снизу: раз в 30 дней после последней копии,
     «Позже» — спросит снова через 7 дней. Только когда есть что сохранять (цели или записи).
   Почта — та, что указана при регистрации (/api/me). */

const KEY = 'backup'; // { savedAt, askedAt } — ISO
const DAY = 86_400_000;
const ASK_AFTER_SAVE = 30 * DAY;
const ASK_AGAIN = 7 * DAY;

let email = null; // почта человека — спрашивается у сервера один раз
let busy = false;

const state = () => {
  const s = read(KEY, {});
  return { savedAt: typeof s?.savedAt === 'string' ? s.savedAt : null, askedAt: typeof s?.askedAt === 'string' ? s.askedAt : null };
};

async function myEmail() {
  if (email) return email;
  try {
    email = (await request('/api/me?app=gsl'))?.email || '';
  } catch {
    email = '';
  }
  return email;
}

/** Собрать файл и отдать почте. */
export async function saveToMail() {
  if (busy) return;
  busy = true;
  toast({ title: bt('making') });
  try {
    const now = new Date();
    const date = formatDate(now.toISOString().slice(0, 10), { day: 'numeric', month: 'long', year: 'numeric' });
    const { blob, name } = await buildArchive({ side: side.get(), now });
    const how = await deliver({ blob, name, email: await myEmail(), subject: bt('subject', { date }), text: bt('body', { date }) });
    if (how === 'cancelled') return;
    write(KEY, { ...state(), savedAt: now.toISOString() });
    toast({ title: bt(how === 'downloaded' ? 'downloaded' : 'sent') });
  } catch {
    toast({ title: bt('failed') });
  } finally {
    busy = false;
  }
}

/** Выбрать файл копии и дополнить им телефон. */
export function restoreFromFile() {
  const input = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    let archive;
    try {
      archive = parseArchive(await file.text());
    } catch {
      toast({ title: bt('badFile') });
      return;
    }
    if (!confirm(bt('restoreAsk'))) return;
    try {
      const n = await restoreArchive(archive);
      toast({ title: n ? bt('restored', { n }) : bt('restoredNothing') });
      if (n) syncNow();
    } catch {
      toast({ title: bt('failed') });
    }
  });
  document.body.append(input);
  input.click();
}

/** Раздел настроек «Копия на твою почту». */
export function backupCard() {
  const s = state();
  const to = h('p', { class: 'backup__to faint', hidden: true });
  myEmail().then((m) => { if (m) { to.textContent = bt('to', { email: m }); to.hidden = false; } });
  const last = s.savedAt
    ? bt('last', { date: formatDate(s.savedAt.slice(0, 10), { day: 'numeric', month: 'long', year: 'numeric' }) })
    : bt('first');
  return h('section', { class: 'card settings__section backup' },
    h('h2', { class: 'caps settings__heading' }, bt('title')),
    h('p', { class: 'card__text' }, bt('lead')),
    to,
    h('p', { class: 'backup__last faint' }, last),
    h('button', { type: 'button', class: 'btn btn--gold btn--block', onclick: saveToMail }, bt('save')),
    h('button', { type: 'button', class: 'btn btn--ghost btn--block', onclick: restoreFromFile }, bt('restore')),
  );
}

/** Пора ли спросить: вошли, есть что сохранять, копия старше 30 дней, «Позже» — больше 7 дней назад. */
export function shouldAsk(now = Date.now()) {
  if (!current()?.token) return false;
  if (!goals.all().length && !(read('entries', []) || []).length) return false;
  const s = state();
  if (s.savedAt && now - Date.parse(s.savedAt) < ASK_AFTER_SAVE) return false;
  if (s.askedAt && now - Date.parse(s.askedAt) < ASK_AGAIN) return false;
  return true;
}

/** Спросить, если пора (main.js — после запуска, на «Сегодня»). */
export async function maybeAsk() {
  if (!shouldAsk() || document.querySelector('.sheet')) return;
  write(KEY, { ...state(), askedAt: new Date().toISOString() });
  const m = await myEmail();
  const yes = h('button', { type: 'button', class: 'btn btn--gold btn--block' }, bt('save'));
  yes.addEventListener('click', () => { closeSheet(); saveToMail(); });
  const later = h('button', { type: 'button', class: 'btn btn--ghost btn--block', onclick: () => closeSheet() }, bt('later'));
  openSheet({
    title: bt('ask'),
    content: h('div', { class: 'stack' },
      h('p', { class: 'card__text' }, bt('lead')),
      m ? h('p', { class: 'faint' }, bt('to', { email: m })) : null,
      yes,
      later,
    ),
  });
}
