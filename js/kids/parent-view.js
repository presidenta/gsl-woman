import { h } from '../core/dom.js';
import { request, ApiError } from '../account/session.js';
import { toast } from '../ui/toast.js';
import { kt } from './texts.js';
import { familyApi } from './family-api.js';
import { confirmBox } from './tasks-view.js';
import { SKILLS, DREAM_STATUS, DREAM_CATEGORIES } from './catalog.js';
import { levelOf, starsOf, waiting, skillCount, skillStep, gamesOf } from './stars.js';
import { chosenOf, progressOf } from './careers.js';
import { PROF_BY_ID } from './dreams-catalog.js';
import { isSealed } from '../letters/letters.js';
import { gamesFor, gameForm, minusButton, hiddenBlock } from './games-list.js';

/* «СЕМЬЯ» → «ДЕТИ» — КАБИНЕТ РЕБЁНКА ГЛАЗАМИ РОДИТЕЛЯ (владелец 14.11.2026: «в кабинете родителя всё должно
   отображаться»; ТЗ — docs/TZ-deti.md).

   У каждого ребёнка: ступень и звёзды; вход (пароль задаёт родитель → ссылка для телефона ребёнка; новый телефон —
   «Подтвердить / Отклонить»); дела, которые ждут подтверждения (звёзды — 1, за большое дело больше); навыки;
   живые игры (минуты и сколько раз брали телефон); мечты с отметками «Запланировано / Исполнено / Пока позже».

   Входы и телефоны — с сервера (/api/gsl/kids/:семья), всё остальное — общие записи семьи (circles/). */

const APP_URL = 'https://presidenta.github.io/gsl-woman/';
const POLL_MS = 10_000;
// Проверка на компьютере (http://localhost) — ссылка на этот же стенд; иначе — сайт приложения (и из APK тоже)
const appUrl = () => (globalThis.location?.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(location.hostname)
  ? location.origin + location.pathname : APP_URL);
const BASE = '/api/gsl/kids';

let info = {}; // { [circleId]: { list, at } }
let loading = null;
let passOpen = {}; // { [childId]: true } — открыта форма пароля
let gameOpen = {}; // { [childId]: true } — открыта форма новой игры
let watching = null; // { circleId, rerender } — вкладка «Дети» на экране: новый телефон ребёнка появится сам
let timer = null;

/* Пока вкладка «Дети» на экране — спрашивать сервер раз в 10 секунд: ребёнок вошёл с нового телефона — кнопка
   «Подтвердить» появляется сама, без перезахода. */
function watch(circleId, rerender) {
  watching = { circleId, rerender };
  if (timer) return;
  timer = setInterval(() => {
    if (!document.querySelector('.kid-parent')) { clearInterval(timer); timer = null; watching = null; return; }
    if (document.visibilityState !== 'hidden') load(watching.circleId, watching.rerender, true);
  }, POLL_MS);
}

function errText(err) {
  if (err instanceof ApiError) {
    const text = kt(`parent.err.${err.code}`);
    if (!text.startsWith('parent.')) return text;
  }
  return kt('parent.err.other');
}

/** Входы детей с сервера; rerender — когда пришли. Не чаще раза в 20 секунд, если не просят сразу. */
export function load(circleId, rerender, force = false) {
  const had = info[circleId];
  if (loading || (!force && had && Date.now() - had.at < 20_000)) return;
  loading = request(`${BASE}/${circleId}`)
    .then((list) => {
      const prev = JSON.stringify(info[circleId]?.list);
      info[circleId] = { list: Array.isArray(list) ? list : [], at: Date.now() };
      if (prev !== JSON.stringify(info[circleId].list)) rerender?.();
    })
    .catch(() => {})
    .finally(() => { loading = null; });
}

/** Сколько телефонов детей ждёт подтверждения — для точки на «Мы» и карточки. */
export function pendingDevices(circleId) {
  return (info[circleId]?.list || []).reduce((n, l) => n + l.devices.filter((d) => d.status === 'pending').length, 0);
}

const linkOf = (code) => `${appUrl()}#kid=${code}`;

function loginBlock(ctx, circle, kid) {
  const login = (info[circle.id]?.list || []).find((l) => l.child === kid.id);
  const refresh = () => load(circle.id, ctx.rerender, true);
  const pass = h('input', { class: 'input', type: 'text', minlength: '4', maxlength: '64', autocomplete: 'off', placeholder: kt('parent.passwordPh'), 'aria-label': kt('parent.passwordPh') });
  const passForm = h('form', { class: 'kid-pass' },
    h('p', { class: 'field__hint' }, login ? kt('parent.changeHint') : kt('parent.loginLead')),
    h('div', { class: 'steps__row' }, pass, h('button', { type: 'submit', class: 'btn btn--gold' }, login ? kt('parent.change') : kt('parent.give'))),
  );
  passForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await request(`${BASE}/${circle.id}/${kid.id}/password`, { body: { password: pass.value } });
      passOpen[kid.id] = false;
      refresh();
    } catch (err) {
      toast({ title: errText(err) });
    }
  });

  const decide = async (device, approve) => {
    try {
      await request(`${BASE}/${circle.id}/devices/${device}`, { body: { approve } });
      refresh();
    } catch (err) {
      toast({ title: errText(err) });
    }
  };

  if (!login) {
    return h('div', { class: 'kid-login' },
      h('h4', { class: 'kid-sub' }, kt('parent.login')),
      passForm);
  }
  const link = linkOf(login.code);
  return h('div', { class: 'kid-login' },
    h('h4', { class: 'kid-sub' }, kt('parent.login')),
    ...login.devices.filter((d) => d.status === 'pending').map((d) => h('div', { class: 'kid-device is-pending' },
      h('p', {}, `📱 ${kt('parent.newDevice', { name: kid.name })}`),
      h('p', { class: 'faint' }, d.device),
      h('div', { class: 'card__actions' },
        h('button', { type: 'button', class: 'btn btn--gold', onclick: () => decide(d.id, true) }, kt('parent.approve')),
        h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => decide(d.id, false) }, kt('parent.reject'))))),
    h('p', { class: 'field__label' }, kt('parent.link')),
    h('p', { class: 'kid-link' }, link),
    h('p', { class: 'faint' }, kt('parent.code', { code: `${login.code.slice(0, 4)} ${login.code.slice(4)}` })),
    h('div', { class: 'card__actions' },
      h('button', {
        type: 'button', class: 'btn btn--gold',
        onclick: async () => {
          try { await navigator.clipboard.writeText(link); toast({ title: kt('parent.copied') }); } catch { /* ссылка видна на экране */ }
        },
      }, kt('parent.copy')),
      h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => { passOpen[kid.id] = !passOpen[kid.id]; ctx.rerender(); } }, kt('parent.change'))),
    passOpen[kid.id] ? passForm : null,
    login.devices.some((d) => d.status === 'active') ? h('p', { class: 'field__label' }, kt('parent.devices')) : null,
    ...login.devices.filter((d) => d.status === 'active').map((d) => h('div', { class: 'kid-device' },
      h('span', {}, `📱 ${kt('parent.active', { device: d.device || '—' })}`),
      h('button', { type: 'button', class: 'btn btn--ghost kid-row__btn', onclick: () => decide(d.id, false) }, kt('parent.removeDevice')))),
    h('button', {
      type: 'button', class: 'btn btn--danger btn--block kid-close',
      onclick: async () => {
        if (!confirm(kt('parent.closeAsk'))) return;
        try {
          await request(`${BASE}/${circle.id}/${kid.id}/close`, { body: {} });
        } catch (err) {
          toast({ title: errText(err) });
        }
        refresh();
      },
    }, kt('parent.close')),
  );
}

function deedLine(d) {
  const x = d.data;
  if (x.type === 'game') return kt('parent.deed.game', { text: x.text, m: x.minutes || 0, n: x.opens || 0 });
  return kt(`parent.deed.${x.type}`, { text: x.text });
}

function waitingBlock(api, kid) {
  const list = waiting(api.items('deed'), api.items('ok')).filter((d) => d.author === kid.id);
  return h('div', {},
    h('h4', { class: 'kid-sub' }, `${kt('parent.waitingTitle')}${list.length ? ` · ${list.length}` : ''}`),
    list.length ? h('ul', { class: 'kid-rows' }, ...list.map((d) => h('li', { class: 'kid-row kid-row--wait' },
      h('div', { class: 'kid-row__main' },
        h('span', { class: 'kid-row__title' }, deedLine(d)),
        d.data.friends?.length ? h('span', { class: 'faint' }, kt('parent.friends', { list: d.data.friends.join(', ') })) : null),
      confirmBox(api, d.id, d.data.stars || 1)))) : h('p', { class: 'faint' }, kt('parent.waitingEmpty')),
  );
}

function skillsBlock(api, kid) {
  const deeds = api.items('deed');
  const oks = api.items('ok');
  const ids = [...new Set(deeds.filter((d) => d.author === kid.id && d.data.type === 'skill').map((d) => d.data.ref))];
  const rows = ids.map((id) => ({ id, n: skillCount(kid.id, id, deeds, oks) })).filter((r) => r.n > 0 && SKILLS[r.id]);
  return h('div', {},
    h('h4', { class: 'kid-sub' }, kt('parent.skills')),
    rows.length ? h('ul', { class: 'kid-rows' }, ...rows.map((r) => h('li', { class: 'kid-row' },
      h('span', { class: 'kid-row__icon', 'aria-hidden': 'true' }, SKILLS[r.id].icon),
      h('span', { class: 'kid-row__title' }, SKILLS[r.id].title),
      h('span', { class: 'kid-badge is-ok' }, `${skillStep(r.n).step.title} · ${r.n}`)))) : h('p', { class: 'faint' }, kt('parent.skillsEmpty')),
  );
}

function gamesBlock(api, kid) {
  const list = gamesOf(kid.id, api.items('deed')).sort((a, b) => String(b.data.at).localeCompare(String(a.data.at))).slice(0, 10);
  return h('div', {},
    h('h4', { class: 'kid-sub' }, kt('parent.games')),
    list.length ? h('ul', { class: 'kid-rows' }, ...list.map((d) => h('li', { class: 'kid-row' },
      h('span', { class: 'kid-row__title' }, deedLine(d))))) : h('p', { class: 'faint' }, kt('parent.gamesEmpty')),
  );
}

function dreamsBlock(api, kid) {
  const list = api.items('dream').filter((d) => d.data.child === kid.id);
  const icon = Object.fromEntries(DREAM_CATEGORIES.map(([id, i]) => [id, i]));
  return h('div', {},
    h('h4', { class: 'kid-sub' }, kt('parent.dreams')),
    list.length ? h('ul', { class: 'kid-rows' }, ...list.map((d) => {
      const status = d.data.status || (d.data.done ? 'bought' : null);
      const note = h('input', { class: 'input', maxlength: '120', value: d.data.note || '', placeholder: kt('parent.notePh'), 'aria-label': kt('parent.notePh') });
      const save = (patch) => api.put('dream', d.id, { ...d.data, ...patch });
      return h('li', { class: `kid-row kid-dream kid-dream--parent${d.data.month ? ' is-month' : ''}` },
        h('div', { class: 'kid-row__main' },
          h('span', { class: 'kid-row__title' }, `${icon[d.data.cat] || '🌟'} ${d.data.text}`),
          d.data.month ? h('span', { class: 'kid-badge is-ok' }, kt('dreams.month')) : null,
          h('div', { class: 'kid-chips' }, ...DREAM_STATUS.map((s) => h('button', {
            type: 'button', class: `kid-chip${status === s ? ' is-on' : ''}`, 'aria-pressed': String(status === s),
            onclick: () => save({ status: status === s ? null : s, done: s === 'bought' && status !== s }),
          }, kt(`dreams.status.${s}`)))),
          h('form', { class: 'steps__row', onsubmit: (e) => { e.preventDefault(); save({ note: note.value.trim().slice(0, 120), noteBy: api.me }); } },
            note, h('button', { type: 'submit', class: 'btn btn--ghost' }, kt('parent.noteSave')))));
    })) : h('p', { class: 'faint' }, kt('parent.dreamsEmpty')),
  );
}

function careersBlock(api, kid) {
  const list = chosenOf(api, kid.id);
  if (!list.length) return null;
  return h('div', {},
    h('h4', { class: 'kid-sub' }, kt('parent.careers')),
    h('ul', { class: 'kid-rows' }, ...list.map((c) => {
      const p = PROF_BY_ID[c.data.prof];
      const { done, all } = progressOf(api, kid.id, p.id);
      return h('li', { class: 'kid-row' },
        h('span', { class: 'kid-row__icon', 'aria-hidden': 'true' }, p.icon),
        h('span', { class: 'kid-row__title' }, p.title),
        h('span', { class: 'kid-badge is-ok' }, kt('career.route', { done, all })));
    })));
}

/* Список живых игр ребёнка (владелец: «родитель сам может вписывать игры, которые ребёнок может выбирать»):
   «＋ Добавить игру», весь список с «−», убранные — «Вернуть». */
function gameListBlock(ctx, api, kid) {
  const list = gamesFor(api, kid.id);
  return h('div', {},
    h('h4', { class: 'kid-sub' }, kt('parent.gameList')),
    h('p', { class: 'faint' }, kt('parent.gameListLead')),
    gameOpen[kid.id]
      ? gameForm(api, kid.id, () => { gameOpen[kid.id] = false; ctx.rerender(); })
      : h('button', { type: 'button', class: 'btn btn--gold', onclick: () => { gameOpen[kid.id] = true; ctx.rerender(); } }, kt('games.add')),
    h('details', { class: 'kid-gamelist' },
      h('summary', {}, kt('parent.gameListAll', { n: list.length })),
      h('ul', { class: 'kid-rows' }, ...list.map((g) => h('li', { class: 'kid-row' },
        h('span', { class: 'kid-row__icon', 'aria-hidden': 'true' }, g.icon),
        h('span', { class: 'kid-row__title' }, g.title),
        minusButton(api, kid.id, g, ctx.rerender))))),
    hiddenBlock(api, kid.id, ctx.rerender),
  );
}

/* Письма ребёнка себе: родитель видит, что письмо есть и когда откроется; текст запечатан и для него. */
function lettersBlock(api, kid) {
  const list = api.items('letter').filter((x) => x.data.member === kid.id).sort((a, b) => a.data.openAt.localeCompare(b.data.openAt));
  if (!list.length) return null;
  const fmt = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString();
  return h('div', {},
    h('h4', { class: 'kid-sub' }, kt('parent.letters')),
    h('ul', { class: 'kid-rows' }, ...list.map((x) => h('li', { class: 'kid-row' },
      h('span', { class: 'kid-row__title' }, isSealed(x.data) ? kt('parent.letterSealed', { date: fmt(x.data.openAt) }) : kt('parent.letterOpen', { date: fmt(x.data.openAt) })),
      x.data.together ? h('span', { class: 'kid-badge' }, '👨‍👩‍👧') : null))));
}

/** Вкладка «Дети» в «Семье». */
export function kidsView(ctx, circle) {
  const kids = circle.members.filter((m) => m.role === 'child');
  load(circle.id, ctx.rerender, Date.now() - (info[circle.id]?.at || 0) > POLL_MS);
  watch(circle.id, ctx.rerender);
  if (!kids.length) return h('section', { class: 'card' }, h('p', { class: 'card__text faint' }, kt('parent.noKids')));
  const api = familyApi(circle);
  const data = { deeds: api.items('deed'), oks: api.items('ok'), tasks: api.items('task'), awards: api.items('award') };
  const d = new Date();
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).toISOString();
  return h('div', { class: 'kid-parent' },
    h('p', { class: 'card__text faint' }, kt('parent.lead')),
    ...kids.map((kid) => {
      const total = starsOf(kid.id, data);
      const { level } = levelOf(total);
      return h('section', { class: 'card kid-card' },
        h('h3', { class: 'card__title kid-card__name' }, `${level.icon} ${kid.name}`),
        h('p', { class: 'gold-text' }, `${level.title} · ${kt('parent.stars', { n: total, w: starsOf(kid.id, data, monday) })}`),
        loginBlock(ctx, circle, kid),
        waitingBlock(api, kid),
        skillsBlock(api, kid),
        gamesBlock(api, kid),
        gameListBlock(ctx, api, kid),
        careersBlock(api, kid),
        dreamsBlock(api, kid),
        lettersBlock(api, kid),
      );
    }),
  );
}
