import { read, writeQuiet } from '../core/store.js';
import { request } from '../account/session.js';
import { langData } from '../program/source.js';
import { choices as loveChoices } from '../love/love.js';
import { myMarks, KEY_NAME as INTIM_KEY } from '../intim/map.js';
import { anketaLang } from './texts.js';

/* ДАННЫЕ «ЕДИНОЙ АНКЕТЫ ПАРТНЁРА» в приложении (README.md). Ответы — на телефоне (ключ anketa: { answers, at }) и
   копия на сервере (POST /api/gsl/anketa): итог считает сервер, у второго человека — свой телефон. Пишется тихо
   (writeQuiet): анкета не перерисовывает экран на каждое нажатие. Без сети ответы ждут на телефоне (sent: false) и
   уходят при следующем открытии анкеты.

   Без повторов (владелец 26.11.2026): языки любви — два главных из «Пяти языков любви» (love/), интим — отметки «Карты
   желаний» (intim/map.js). На сервер они уходят вместе с ответами. */

const KEY = 'anketa';
const SEND_DELAY = 1500;

/** Анкета своей части с сервера (поле anketa программы); программа ещё не пришла — null. */
export const formOf = (lang) => langData(lang)?.anketa || null;

function local() {
  const v = read(KEY, null);
  return { answers: v?.answers && typeof v.answers === 'object' ? v.answers : {}, sent: v?.sent !== false, link: v?.link || null };
}
const saveLocal = (next) => writeQuiet(KEY, next);

export const get = (key) => local().answers[key];

/** Два главных языка любви из «Пяти языков любви» или null. */
export function loveAuto() {
  const c = loveChoices();
  const list = [c.me, c.me2].filter(Boolean);
  return list.length ? list : null;
}

export const intimCount = () => Object.keys(myMarks()).length;

/** Что уходит на сервер: свои ответы + языки любви + отметки карты. */
export function payload() {
  const answers = { ...local().answers };
  const love = loveAuto();
  if (love) answers['life.love'] = love;
  // Карты на этом телефоне ещё нет (новый телефон, копия не пришла) — отметки не шлём: сервер оставит прежние
  return read(INTIM_KEY, null) === null ? { answers } : { answers, intim: myMarks() };
}

let timer = null;
export function set(key, value) {
  const s = local();
  const answers = { ...s.answers };
  if (value === undefined) delete answers[key];
  else answers[key] = value;
  saveLocal({ ...s, answers, sent: false });
  clearTimeout(timer);
  timer = setTimeout(() => { send().catch(() => {}); }, SEND_DELAY);
  timer?.unref?.(); // в проверках (node) таймер не держит процесс
}

/** Отправить ответы на сервер (если есть неотправленное или force). */
export async function send(force = false) {
  const s = local();
  if (s.sent && !force) return;
  await request('/api/gsl/anketa', { body: payload() });
  saveLocal({ ...local(), sent: true });
}

/** Свериться с сервером: на телефоне пусто, а на сервере есть (другой телефон или анкета по ссылке до регистрации) —
    взять с сервера; неотправленное — отправить. Вернёт true, если ответы сменились. */
export async function pull() {
  const s = local();
  const remote = await request('/api/gsl/anketa');
  if (remote?.link && remote.link !== s.link) saveLocal({ ...local(), link: remote.link });
  if (!s.sent) { await send(); return false; }
  const mine = Object.keys(s.answers).length;
  const theirs = remote?.answers?.answers || {};
  if (!mine && Object.keys(theirs).length) {
    saveLocal({ ...local(), answers: theirs, sent: true });
    return true;
  }
  // Карта и языки любви могли измениться в своих разделах — сервер должен видеть свежие
  // Карты на телефоне ещё нет (не пришла из копии, sync/) — не шлём: иначе стёрли бы отметки на сервере
  const marks = myMarks();
  const intimDiffers = read(INTIM_KEY, null) !== null && JSON.stringify(remote?.answers?.intim || {}) !== JSON.stringify(marks);
  if (intimDiffers || (loveAuto() && JSON.stringify(theirs['life.love']) !== JSON.stringify(loveAuto()))) await send(true);
  return false;
}

/** Адрес страницы гостя: всегда сайт GSL (из APK и с ПК ссылка та же); на своём стенде (localhost) — этот же сайт. */
const SITE = 'https://presidenta.github.io/gsl-woman/';
const base = () => {
  const here = globalThis.location;
  return /^(localhost|127\.0\.0\.1)$/.test(here?.hostname || '') ? here.href.split('#')[0] : SITE;
};
export const linkUrl = (token) => new URL(`anketa.html#${token}`, base()).href;

/** Моя постоянная ссылка-приглашение. */
export async function link() {
  const s = local();
  if (s.link) return linkUrl(s.link);
  const { token } = await request('/api/gsl/anketa/link', { body: {} });
  saveLocal({ ...local(), link: token });
  return linkUrl(token);
}

// Подписи итога — на языке приложения (сервер: ?lang=, 26.11.2026)
export const results = () => request(`/api/gsl/anketa/results?lang=${anketaLang()}`);
export const hide = (id) => request(`/api/gsl/anketa/guests/${id}/hide`, { body: {} });
export const KEY_NAME = KEY;
