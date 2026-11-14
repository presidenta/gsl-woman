import { h, mount } from '../core/dom.js';
import { subscribe } from '../core/store.js';
import { setLang, setSide } from '../core/i18n.js';
import { isoDate, addDays } from '../core/dates.js';
import { toast } from '../ui/toast.js';
import { t } from '../core/i18n.js';
import { register as registerWorker } from '../core/updates.js';
import { chatView } from '../circles/chat-view.js';
import * as store from './kid-store.js';
import * as play from './nophone.js';
import { kt } from './texts.js';
import { SKILL_SECTIONS, SKILLS, GAMES, GAME_BY_ID, DREAM_CATEGORIES } from './catalog.js';
import { levelOf, starsOf, skillCount, skillStep, okMap, familyScore, gamesOf } from './stars.js';

/* ДЕТСКИЙ КАБИНЕТ НА ТЕЛЕФОНЕ РЕБЁНКА (владелец 14.11.2026, ТЗ — docs/TZ-deti.md). Своё приложение внутри GSL:
   js/boot.js открывает его вместо взрослого, когда на телефоне вход ребёнка или пришла ссылка #kid=КОД.

   Ворота: вход (код из ссылки + пароль от родителя) → «Ждём маму или папу» (телефон подтверждает родитель) →
   кабинет. Кабинет закрыт у родителей — «Кабинет отдыхает».
   Разделы: Сегодня (ступень, звёзды, задания на день, «Я помогаю!», звёзды семьи) · Дела (семейный чат с делами) ·
   Навыки · Игры (живые игры, «Играем вживую», друзья) · Мечты. Денег здесь нет и не будет — только звёзды. */

const TABS = ['today', 'deeds', 'skills', 'games', 'dreams'];
const TAB_ICON = { today: '☀️', deeds: '🧹', skills: '🛠️', games: '🤸', dreams: '🌟' };

let root = null;
let tab = 'today';
let code = '';
let loginMsg = '';
let starting = null; // id игры, для которой выбираем друзей; 'own' — своя игра
let chosen = new Set();
let result = null; // итог последней живой игры
let pending = false;

const short = (id) => String(id || '').replace(/-/g, '').slice(0, 8);
const compact = (iso) => iso.replace(/-/g, '');
const planId = (me, iso = isoDate()) => `${short(me)}.${compact(iso)}`;

function weekStart(iso = isoDate()) {
  const d = new Date(`${iso}T12:00:00`);
  return addDays(iso, -((d.getDay() + 6) % 7));
}

function data(api) {
  return { deeds: api.items('deed'), oks: api.items('ok'), tasks: api.items('task') };
}

/* ---------- Ворота ---------- */

function loginScreen() {
  const codeInput = h('input', { class: 'input kid-code', maxlength: '8', autocomplete: 'off', autocapitalize: 'characters', placeholder: kt('login.codePh'), value: code, 'aria-label': kt('login.code') });
  const pass = h('input', { class: 'input', type: 'password', maxlength: '64', autocomplete: 'current-password', 'aria-label': kt('login.password') });
  const btn = h('button', { type: 'submit', class: 'btn btn--gold btn--block' }, kt('login.enter'));
  const form = h('form', { class: 'card card--hero kid-gate' },
    h('div', { class: 'kid-gate__icon', 'aria-hidden': 'true' }, '🌱'),
    h('h1', { class: 'card__title' }, kt('login.title')),
    h('p', { class: 'card__text' }, kt('login.lead')),
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, kt('login.code')), codeInput),
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, kt('login.password')), pass),
    loginMsg ? h('p', { class: 'kid-gate__err' }, loginMsg) : null,
    btn,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    code = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    btn.disabled = true;
    try {
      await store.login(code, pass.value);
      loginMsg = '';
      store.refresh().catch(() => {});
    } catch (err) {
      const text = kt(`login.err.${err.code}`);
      loginMsg = text.startsWith('login.') ? kt('login.err.other') : text;
    }
    btn.disabled = false;
    draw();
  });
  if (!code) queueMicrotask(() => codeInput.focus());
  else queueMicrotask(() => pass.focus());
  return h('main', { class: 'app kid-app kid-app--gate' }, form);
}

function waitScreen(s) {
  const check = h('button', {
    type: 'button', class: 'btn btn--gold btn--block',
    onclick: async () => {
      await store.refresh().catch(() => {});
      if (store.session()?.status !== 'active') toast({ title: kt('wait.still') });
    },
  }, kt('wait.check'));
  return h('main', { class: 'app kid-app kid-app--gate' },
    h('section', { class: 'card card--hero kid-gate' },
      h('div', { class: 'kid-gate__icon kid-gate__icon--wait', 'aria-hidden': 'true' }, '⏳'),
      h('h1', { class: 'card__title' }, kt('wait.title')),
      h('p', { class: 'kid-gate__name' }, s.name),
      h('p', { class: 'card__text' }, kt('wait.text')),
      check,
      h('button', { type: 'button', class: 'btn btn--ghost btn--block', onclick: () => { store.logout(); draw(); } }, kt('wait.other')),
    ));
}

function closedScreen() {
  return h('main', { class: 'app kid-app kid-app--gate' },
    h('section', { class: 'card card--hero kid-gate' },
      h('div', { class: 'kid-gate__icon', 'aria-hidden': 'true' }, '🌙'),
      h('h1', { class: 'card__title' }, kt('closed.title')),
      h('p', { class: 'card__text' }, kt('closed.text')),
      h('button', { type: 'button', class: 'btn btn--gold btn--block', onclick: () => store.refresh().catch(() => draw()) }, kt('closed.check')),
    ));
}

/* ---------- Сегодня ---------- */

function levelCard(api) {
  const total = starsOf(api.me, data(api));
  const { level, next, toNext, progress } = levelOf(total);
  return h('section', { class: 'card card--hero kid-level' },
    h('p', { class: 'caps' }, kt('today.hello', { name: store.session()?.name || '' })),
    h('div', { class: 'kid-level__tree', 'aria-hidden': 'true' }, level.icon),
    h('h2', { class: 'card__title' }, level.title),
    h('p', { class: 'kid-level__stars gold-text' }, kt('today.stars', { n: total })),
    h('div', { class: 'kid-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(progress * 100)) },
      h('span', { class: 'kid-bar__fill', style: { width: `${Math.round(progress * 100)}%` } })),
    h('p', { class: 'faint' }, next ? kt('today.toNext', { title: next.title, n: toNext }) : kt('today.top')),
  );
}

function plan(api) {
  return store.item('plan', planId(api.me))?.data?.list || [];
}

function togglePlan(api, type, ref) {
  const list = plan(api);
  const has = list.some((x) => x.type === type && x.ref === ref);
  const next = has ? list.filter((x) => !(x.type === type && x.ref === ref)) : [...list, { type, ref }];
  api.put('plan', planId(api.me), { member: api.me, day: isoDate(), list: next });
}

const inPlan = (api, type, ref) => plan(api).some((x) => x.type === type && x.ref === ref);

/** Дело ребёнка за сегодня по этому заданию — и его подтверждение. */
function todayDeed(api, type, ref) {
  const day = isoDate();
  const deeds = api.items('deed').filter((d) => d.author === api.me && d.data.type === type && d.data.ref === ref && d.data.day === day);
  return deeds.sort((a, b) => String(b.data.at).localeCompare(String(a.data.at)))[0] || null;
}

function deedState(api, deed) {
  const ok = okMap(api.items('ok')).get(deed.id);
  if (!ok) return h('span', { class: 'kid-badge is-wait' }, kt('today.waiting'));
  if (ok.data.again) return h('span', { class: 'kid-badge' }, kt('today.again'));
  return h('span', { class: 'kid-badge is-ok' }, kt('today.got', { n: ok.data.stars }));
}

function planCard(api) {
  const list = plan(api);
  const rows = list.map((x) => {
    const deed = todayDeed(api, x.type, x.ref);
    const title = x.type === 'skill' ? SKILLS[x.ref]?.title : GAME_BY_ID[x.ref]?.title;
    const icon = x.type === 'skill' ? SKILLS[x.ref]?.icon : GAME_BY_ID[x.ref]?.icon;
    if (!title) return null;
    let action;
    if (deed) action = deedState(api, deed);
    else if (x.type === 'skill') {
      action = h('button', {
        type: 'button', class: 'btn btn--gold kid-row__btn',
        onclick: () => api.put('deed', api.newId('d'), { type: 'skill', ref: x.ref, text: title, at: new Date().toISOString(), day: isoDate() }),
      }, kt('today.done'));
    } else {
      action = h('button', { type: 'button', class: 'btn btn--gold kid-row__btn', onclick: () => { tab = 'games'; starting = x.ref; chosen = new Set(); draw(); } }, kt('games.start'));
    }
    return h('li', { class: 'kid-row' }, h('span', { class: 'kid-row__icon', 'aria-hidden': 'true' }, icon), h('span', { class: 'kid-row__title' }, title), action);
  }).filter(Boolean);
  return h('section', { class: 'card' },
    h('h2', { class: 'card__title' }, kt('today.plan')),
    rows.length ? h('ul', { class: 'kid-rows' }, ...rows) : h('p', { class: 'card__text faint' }, kt('today.planEmpty')),
    h('div', { class: 'card__actions' },
      h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => { tab = 'skills'; draw(); } }, `${TAB_ICON.skills} ${kt('nav.skills')}`),
      h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => { tab = 'games'; draw(); } }, `${TAB_ICON.games} ${kt('nav.games')}`),
    ),
  );
}

function helpCard(api) {
  const input = h('input', { class: 'input', maxlength: '120', placeholder: kt('today.helpPh'), 'aria-label': kt('today.help') });
  const form = h('form', { class: 'card kid-help' },
    h('h2', { class: 'card__title' }, `💛 ${kt('today.help')}`),
    h('p', { class: 'card__text faint' }, kt('today.helpLead')),
    h('div', { class: 'steps__row' }, input, h('button', { type: 'submit', class: 'btn btn--gold' }, kt('today.helpSend'))),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim().slice(0, 120);
    if (!text) return;
    api.put('deed', api.newId('d'), { type: 'help', ref: 'help', text, at: new Date().toISOString(), day: isoDate() });
    toast({ title: kt('play.sent') });
  });
  return form;
}

function familyCard(api) {
  const since = `${weekStart()}T00:00:00`;
  const rows = familyScore(api.circle, data(api), since);
  const waitingN = api.items('deed').filter((d) => d.author === api.me && !okMap(api.items('ok')).has(d.id)).length;
  return h('section', { class: 'card' },
    h('h2', { class: 'card__title' }, kt('today.family')),
    h('p', { class: 'card__text faint' }, kt('today.familyLead')),
    h('ul', { class: 'kid-score' }, ...rows.map((r) => h('li', { class: `kid-score__row is-${r.role}${r.id === api.me ? ' is-me' : ''}` },
      h('span', {}, r.name), h('span', { class: 'gold-text' }, `${r.stars} ⭐`)))),
    waitingN ? h('p', { class: 'faint' }, kt('today.waitingCount', { n: waitingN })) : null,
  );
}

function todayView(api) {
  return [levelCard(api), planCard(api), helpCard(api), familyCard(api)];
}

/* ---------- Навыки ---------- */

function skillsView(api) {
  const deeds = api.items('deed');
  const oks = api.items('ok');
  return [
    h('h1', { class: 'screen-title' }, kt('skills.title')),
    h('p', { class: 'card__text faint kid-lead' }, kt('skills.lead')),
    ...SKILL_SECTIONS.map((sec) => h('section', { class: 'card' },
      h('h2', { class: 'card__title' }, `${sec.icon} ${sec.title}`),
      h('ul', { class: 'kid-rows' }, ...sec.skills.map(([id, title]) => {
        const n = skillCount(api.me, id, deeds, oks);
        const { step, next } = skillStep(n);
        const planned = inPlan(api, 'skill', id);
        return h('li', { class: 'kid-row kid-row--skill' },
          h('div', { class: 'kid-row__main' },
            h('span', { class: 'kid-row__title' }, title),
            h('span', { class: 'kid-row__meta faint' },
              step ? h('span', { class: 'kid-badge is-ok' }, step.title) : null,
              n ? ` ${kt('skills.count', { n })}` : '',
              next && n ? ` · ${kt('skills.next', { title: next.title, n: next.at - n })}` : '')),
          h('div', { class: 'kid-row__actions' },
            h('button', { type: 'button', class: `btn ${planned ? 'btn--gold' : 'btn--ghost'} kid-row__btn`, 'aria-pressed': String(planned), onclick: () => togglePlan(api, 'skill', id) },
              planned ? kt('skills.inPlan') : kt('skills.plan')),
            h('button', {
              type: 'button', class: 'btn btn--ghost kid-row__btn',
              onclick: () => {
                api.put('msg', api.newId('m'), { text: kt('skills.learnMsg', { title }), signal: 'help', at: new Date().toISOString() });
                toast({ title: kt('skills.sent') });
              },
            }, kt('skills.learn')),
          ),
        );
      })),
    )),
  ];
}

/* ---------- Игры ---------- */

function friendsOf(api) {
  return api.items('friend').filter((f) => f.data.member === api.me).map((f) => f.data.name);
}

function addFriend(api, name) {
  const clean = String(name || '').trim().slice(0, 40);
  if (!clean || friendsOf(api).some((n) => n.toLowerCase() === clean.toLowerCase())) return;
  api.put('friend', api.newId('f'), { member: api.me, name: clean, at: new Date().toISOString() });
}

function startBox(api, game) {
  const friends = friendsOf(api);
  const own = game.id === 'own' ? h('input', { class: 'input', maxlength: '60', placeholder: kt('games.ownPh'), 'aria-label': kt('games.own') }) : null;
  const extra = h('input', { class: 'input', maxlength: '40', placeholder: kt('games.friendPh'), 'aria-label': kt('games.friendPh') });
  return h('div', { class: 'kid-start' },
    own,
    h('p', { class: 'field__label' }, kt('games.who')),
    h('p', { class: 'field__hint' }, kt('games.whoHint')),
    h('div', { class: 'kid-chips' }, ...friends.map((n) => h('button', {
      type: 'button', class: `kid-chip${chosen.has(n) ? ' is-on' : ''}`, 'aria-pressed': String(chosen.has(n)),
      onclick: (e) => { if (chosen.has(n)) chosen.delete(n); else chosen.add(n); e.currentTarget.classList.toggle('is-on'); e.currentTarget.setAttribute('aria-pressed', String(chosen.has(n))); },
    }, n))),
    extra,
    h('button', {
      type: 'button', class: 'btn btn--gold btn--block',
      onclick: () => {
        const title = game.id === 'own' ? (own.value.trim().slice(0, 60) || kt('games.own')) : game.title;
        const names = [...chosen];
        for (const n of extra.value.split(',').map((x) => x.trim()).filter(Boolean)) names.push(n.slice(0, 40));
        starting = null;
        chosen = new Set();
        play.begin({ game: game.id, title, icon: game.icon, friends: [...new Set(names)] });
        draw();
      },
    }, `▶ ${kt('games.start')}`),
  );
}

function resultCard() {
  const r = result;
  return h('section', { class: 'card card--hero kid-result' },
    h('div', { class: 'kid-gate__icon', 'aria-hidden': 'true' }, r.opens ? '👏' : '🏆'),
    h('h2', { class: 'card__title' }, kt('play.result', { m: r.minutes })),
    h('p', { class: 'card__text' }, r.opens ? kt('play.resultOpens', { n: r.opens }) : kt('play.resultClean')),
    h('p', { class: 'faint' }, kt('play.sent')),
    h('button', { type: 'button', class: 'btn btn--gold btn--block', onclick: () => { result = null; draw(); } }, kt('play.ok')),
  );
}

function gamesView(api) {
  const played = gamesOf(api.me, api.items('deed'));
  const minutes = played.reduce((s, d) => s + (Number(d.data.minutes) || 0), 0);
  const friendInput = h('input', { class: 'input', maxlength: '40', placeholder: kt('games.friendPh'), 'aria-label': kt('games.friendPh') });
  const friendForm = h('form', { class: 'steps__row' }, friendInput, h('button', { type: 'submit', class: 'btn btn--gold' }, kt('games.friendAdd')));
  friendForm.addEventListener('submit', (e) => { e.preventDefault(); addFriend(api, friendInput.value); });
  const own = { id: 'own', title: kt('games.own'), icon: '🎲' };
  return [
    h('h1', { class: 'screen-title' }, kt('games.title')),
    h('p', { class: 'card__text faint kid-lead' }, kt('games.lead')),
    result ? resultCard() : null,
    h('section', { class: 'card' },
      h('h2', { class: 'card__title' }, `🤝 ${kt('games.friends')}`),
      h('p', { class: 'card__text faint' }, kt('games.friendsLead')),
      h('div', { class: 'kid-chips' }, ...friendsOf(api).map((n) => h('span', { class: 'kid-chip is-static' }, n))),
      friendForm,
      h('p', { class: 'faint' }, kt('games.played', { n: played.length, m: minutes })),
    ),
    h('section', { class: 'card kid-game' },
      h('h2', { class: 'card__title' }, `${own.icon} ${own.title}`),
      starting === 'own' ? startBox(api, own) : h('button', { type: 'button', class: 'btn btn--gold', onclick: () => { starting = 'own'; chosen = new Set(); draw(); } }, `▶ ${kt('games.start')}`),
    ),
    ...GAMES.map((g) => {
      const planned = inPlan(api, 'game', g.id);
      return h('section', { class: 'card kid-game' },
        h('h2', { class: 'card__title' }, `${g.icon} ${g.title}`),
        h('p', { class: 'kid-game__meta faint' }, `${kt('games.players', { n: g.players })} · ${kt('games.place', { place: g.place })}`),
        h('p', { class: 'kid-game__grows' }, kt('games.grows', { list: g.grows.join(', ') })),
        h('details', { class: 'kid-game__rules' },
          h('summary', {}, kt('games.rules')),
          h('p', {}, g.rules),
          h('p', { class: 'faint' }, kt('games.need', { need: g.need }))),
        starting === g.id ? startBox(api, g) : h('div', { class: 'card__actions' },
          h('button', { type: 'button', class: 'btn btn--gold', onclick: () => { starting = g.id; chosen = new Set(); draw(); } }, `▶ ${kt('games.start')}`),
          h('button', { type: 'button', class: `btn ${planned ? 'btn--gold' : 'btn--ghost'}`, 'aria-pressed': String(planned), onclick: () => togglePlan(api, 'game', g.id) },
            planned ? kt('games.inPlan') : kt('games.plan')),
        ),
      );
    }),
  ];
}

function gameEnded(api, r) {
  if (!r) return;
  for (const n of r.friends || []) addFriend(api, n);
  api.put('deed', api.newId('d'), {
    type: 'game', ref: r.game, text: r.title, minutes: r.minutes, opens: r.opens, friends: r.friends || [],
    at: new Date().toISOString(), day: isoDate(),
  });
  result = r;
  tab = 'games';
  draw();
}

/* ---------- Мечты ---------- */

function dreamsView(api) {
  let cat = DREAM_CATEGORIES[0][0];
  let month = false;
  const input = h('input', { class: 'input', maxlength: '160', placeholder: kt('dreams.ph'), 'aria-label': kt('dreams.ph') });
  const cats = h('div', { class: 'kid-chips', role: 'radiogroup' }, ...DREAM_CATEGORIES.map(([id, icon, title]) => h('button', {
    type: 'button', class: `kid-chip${id === cat ? ' is-on' : ''}`, role: 'radio', 'aria-checked': String(id === cat),
    onclick: (e) => {
      cat = id;
      for (const b of cats.children) { b.classList.remove('is-on'); b.setAttribute('aria-checked', 'false'); }
      e.currentTarget.classList.add('is-on');
      e.currentTarget.setAttribute('aria-checked', 'true');
    },
  }, `${icon} ${title}`)));
  const monthBtn = h('button', {
    type: 'button', class: 'kid-chip', 'aria-pressed': 'false',
    onclick: (e) => { month = !month; e.currentTarget.classList.toggle('is-on', month); e.currentTarget.setAttribute('aria-pressed', String(month)); },
  }, kt('dreams.month'));
  const form = h('form', { class: 'card kid-dream-new' },
    h('h2', { class: 'card__title' }, `🌟 ${kt('dreams.title')}`),
    h('p', { class: 'card__text faint' }, kt('dreams.lead')),
    cats, input, monthBtn,
    h('button', { type: 'submit', class: 'btn btn--gold btn--block' }, kt('dreams.add')),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim().slice(0, 160);
    if (!text) return;
    // Мечта месяца — одна: прежняя снимается
    if (month) for (const d of api.items('dream')) if (d.data.child === api.me && d.data.month) api.put('dream', d.id, { ...d.data, month: false });
    api.put('dream', api.newId('d'), { child: api.me, type: 'dream', cat, text, month, done: false, status: null, at: new Date().toISOString() });
  });
  const mine = api.items('dream').filter((d) => d.data.child === api.me)
    .sort((a, b) => Number(!!b.data.month) - Number(!!a.data.month) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const icon = Object.fromEntries(DREAM_CATEGORIES.map(([id, i]) => [id, i]));
  return [
    form,
    h('section', { class: 'card' },
      mine.length ? h('ul', { class: 'kid-rows' }, ...mine.map((d) => {
        const status = d.data.status || (d.data.done ? 'bought' : null);
        return h('li', { class: `kid-row kid-dream${d.data.month ? ' is-month' : ''}${status === 'bought' ? ' is-done' : ''}` },
          h('span', { class: 'kid-row__icon', 'aria-hidden': 'true' }, icon[d.data.cat] || '🌟'),
          h('div', { class: 'kid-row__main' },
            h('span', { class: 'kid-row__title' }, d.data.text),
            d.data.month ? h('span', { class: 'kid-badge is-ok' }, kt('dreams.month')) : null,
            status ? h('span', { class: `kid-badge is-${status}` }, kt(`dreams.status.${status}`)) : null,
            d.data.note ? h('span', { class: 'kid-dream__note' }, kt('dreams.from', { name: api.name(d.data.noteBy), note: d.data.note })) : null),
          d.author === api.me && !status ? h('button', { type: 'button', class: 'btn btn--ghost kid-row__btn', onclick: () => api.drop('dream', d.id) }, kt('dreams.remove')) : null,
        );
      })) : h('p', { class: 'card__text faint' }, kt('dreams.empty')),
    ),
  ];
}

/* ---------- Каркас ---------- */

function shellView(api) {
  const total = starsOf(api.me, data(api));
  const { level } = levelOf(total);
  const view = h('div', { class: 'app-view kid-view' });
  const screens = { today: todayView, deeds: (a) => [h('h1', { class: 'screen-title' }, kt('nav.deeds')), chatView(a.circle, a)], skills: skillsView, games: gamesView, dreams: dreamsView };
  view.append(...[screens[tab](api)].flat().filter(Boolean));
  if (tab === 'today') {
    view.append(h('button', {
      type: 'button', class: 'btn btn--ghost btn--block kid-logout',
      onclick: () => { if (confirm(kt('logoutAsk'))) { store.logout(); draw(); } },
    }, kt('logout')));
  }
  const nav = h('nav', { class: 'app-nav kid-nav', 'aria-label': kt('app.title') }, ...TABS.map((k) => h('button', {
    type: 'button', class: 'app-nav__item', 'aria-current': k === tab ? 'page' : null,
    onclick: () => { tab = k; starting = null; draw(); scrollTo({ top: 0 }); },
  }, h('span', { class: 'kid-nav__icon', 'aria-hidden': 'true' }, TAB_ICON[k]), h('span', {}, kt(`nav.${k}`)))));
  return h('div', { class: 'app kid-app' },
    h('header', { class: 'app-header kid-header' },
      h('span', { class: 'kid-header__level', 'aria-hidden': 'true' }, level.icon),
      h('span', { class: 'kid-header__name' }, store.session()?.name || ''),
      h('span', { class: 'spacer' }),
      h('span', { class: 'kid-header__stars gold-text' }, `${total} ⭐`),
      h('span', { class: 'kid-header__brand gold-text' }, kt('app.brand'))),
    view,
    nav,
  );
}

export function draw() {
  pending = false;
  if (play.current()) {
    play.render(root, (r) => gameEnded(store.adapter(), r));
    return;
  }
  const s = store.session();
  if (!s) return mount(root, loginScreen());
  if (s.closed) return mount(root, closedScreen());
  if (s.status !== 'active' || !store.family()) return mount(root, waitScreen(s));
  mount(root, shellView(store.adapter()));
}

function scheduleDraw() {
  if (pending) return;
  // Пока ребёнок печатает — перерисовка подождёт: поле ввода не должно сбрасываться
  const el = document.activeElement;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && root.contains(el) && tab !== 'deeds') {
    el.addEventListener('blur', () => scheduleDraw(), { once: true });
    return;
  }
  pending = true;
  requestAnimationFrame(draw);
}

/** Запуск кабинета ребёнка вместо взрослого приложения (js/boot.js). */
export function start(el, linkCode = '') {
  root = el;
  code = linkCode || '';
  document.documentElement.dataset.side = 'kid';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0d1430');
  document.title = kt('app.title');
  setSide('woman');
  setLang('ru');
  subscribe((key) => {
    // Игра пишет своё состояние сама; экран игры обновляет таймер без перерисовки
    if (key === 'kid-play' && play.current()) return;
    if (key.startsWith('kid')) scheduleDraw();
  });
  store.start();
  // Телефон ждёт родителя — спрашивать чаще, чтобы кабинет открылся сам
  setInterval(() => {
    const s = store.session();
    if (s && s.status !== 'active' && document.visibilityState !== 'hidden') store.refresh().catch(() => {});
  }, 8000);
  draw();
  // Как у взрослых: без сети открывается, новая сборка — подсказка (core/updates.js)
  registerWorker({ onUpdated: () => toast({ title: t('update.ready') }) });
}
