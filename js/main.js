import { h, svg, mount } from './core/dom.js';
import { t, setLang } from './core/i18n.js';
import { subscribe } from './core/store.js';
import { isoDate, programDay } from './core/dates.js';
import * as router from './core/router.js';
import { register as registerWorker } from './core/updates.js';
import * as settings from './settings/settings.js';
import * as journal from './journal/journal.js';
import * as account from './account/session.js';
import * as program from './program/source.js';
import * as reminders from './reminders/local.js';
import { isOpen as sheetOpen } from './ui/sheet.js';
import { toast } from './ui/toast.js';
import { icons } from './ui/icons.js';
import * as today from './screens/today/today.js';
import * as week from './screens/week/week.js';
import * as journalScreen from './screens/journal/journal.js';
import * as path from './screens/path/path.js';
import * as settingsScreen from './screens/settings/settings.js';
import * as onboarding from './screens/onboarding/onboarding.js';
import * as login from './screens/login/login.js';
import * as goalsScreen from './screens/goals/goals.js';
import { identity } from './account/avatar.js';
import { brand as brandMark } from './ui/brand.js';
import * as install from './install/install.js';
import * as media from './media/photos.js';

/* ВХОД В ПРИЛОЖЕНИЕ: каркас (шапка, область экрана, нижняя панель), маршруты, перерисовка при
   изменениях, напоминания и работник. Экраны ничего не знают друг о друге: каждый получает ctx —
   свежие настройки, записи и день программы — и рисует себя в отведённое место.

   Порядок ворот: вход аккаунтом «Кванта» → программа с его сервера (один раз, потом с телефона) →
   первый вход (имя, старт, время) → экраны. Без входа приложение не показывает ничего из программы.

   Добавить экран: папка в js/screens/, строка router.define и при желании пункт в NAV. */

const VERSION = globalThis.GSL_VERSION || 'dev';

const NAV = [
  { route: 'today', icon: icons.today },
  { route: 'week', icon: icons.week },
  { route: 'goals', icon: icons.goals },
  { route: 'journal', icon: icons.journal },
  { route: 'path', icon: icons.path },
];

router.define('today', today);
router.define('week', week);
router.define('journal', journalScreen);
router.define('path', path);
router.define('goals', goalsScreen);
router.define('settings', settingsScreen);

const root = document.getElementById('app');
let shell = null;
let lastIso = isoDate();
let pending = false;
// Экран входа: form — логин и пароль (message — почему просим снова), failed — программа не пришла
let gate = { mode: 'form', message: '' };

function context() {
  const s = settings.get();
  const todayIso = isoDate();
  return {
    settings: s,
    entries: journal.all(),
    todayIso,
    day: s.startDate ? programDay(s.startDate, todayIso) : 0,
    lang: s.lang,
    version: VERSION,
    account: account.current(),
    logout,
    rerender: draw,
    go: router.go,
  };
}

function buildShell() {
  const back = h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('common.back'), onclick: () => router.go('today') }, svg(icons.back));
  const gear = h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': t('common.settings') }, svg(icons.gear));
  const brand = h('div', { class: 'app-header__brand gold-text' }, brandMark());
  const who = identity();
  const view = h('main', { class: 'app-view', id: 'view', tabindex: '-1' });
  const nav = h('nav', { class: 'app-nav', 'aria-label': t('app.name') },
    ...NAV.map((item) => h('a', { class: 'app-nav__item', href: `#/${item.route}`, dataset: { route: item.route } },
      svg(item.icon),
      h('span', {}, t(`nav.${item.route}`)),
    )),
  );
  const app = h('div', { class: 'app' },
    h('header', { class: 'app-header' }, back, who, h('span', { class: 'spacer' }), brand, gear),
    view,
    nav,
  );
  mount(root, app);
  return { app, back, who, brand, gear, view, nav };
}

/* Программа: нет на телефоне — ждём её на экране входа; есть — молча сверяем отпечаток (вышла правка —
   придёт новый текст, и экран перерисуется сам через хранилище). Сессию больше не принимают — на вход. */
async function loadProgram() {
  if (!program.loaded()) {
    gate = { mode: 'loading', message: '' };
    draw();
  }
  try {
    await program.refresh();
    gate = { mode: 'form', message: '' };
  } catch (err) {
    if (account.isExpired(err)) return expire();
    if (!program.loaded()) gate = { mode: 'failed', message: '' };
  }
  draw();
}

/* Пришли из «Кванта»: #kvant=<пропуск> — войти без пароля; #install — сразу «Значок на экран».
   Адрес тут же чистим: пропуск одноразовый и не должен остаться в истории и закладках.
   Уже вошла — пропуск не нужен (как у спорта). */
function takeKvantLink() {
  const params = new URLSearchParams(location.hash.replace(/^#\/?/, ''));
  const pass = params.get('kvant');
  const wantInstall = params.has('install');
  if (!pass && !wantInstall) return;
  if (wantInstall) {
    install.requestHighlight();
    install.requestOffer();
  }
  history.replaceState(null, '', location.pathname + location.search + (wantInstall ? '#/settings' : '#/today'));
  if (!pass || account.current()) return;
  gate = { mode: 'loading', message: '' };
  account.redeem(pass)
    .then(() => loadProgram())
    .catch((err) => {
      const key = `login.err.${err?.code}`;
      const text = t(key);
      gate = { mode: 'form', message: err?.code === 'invalid_pass' ? t('login.passExpired') : text === key ? '' : text };
      draw();
    });
}

async function onLogin(loginName, password) {
  await account.login(loginName, password);
  loadProgram();
}

// Выход из настроек: сессия и копия программы стираются, записи остаются на телефоне
async function logout() {
  program.forget();
  gate = { mode: 'form', message: '' };
  await account.logout();
  draw();
}

function expire() {
  account.forget();
  program.forget();
  gate = { mode: 'form', message: t('login.expired') };
  draw();
}

function drawGate() {
  shell = null;
  const view = h('main', { class: 'app' });
  mount(root, view);
  // Без сессии — форма (или ожидание, пока меняем пропуск из «Кванта»); с сессией — ждём программу
  const mode = !account.current()
    ? (gate.mode === 'loading' ? 'loading' : 'form')
    : gate.mode === 'failed' ? 'failed' : 'loading';
  login.render(view, { mode, message: gate.message, onLogin, onRetry: loadProgram });
}

function draw() {
  const ctx = context();
  setLang(ctx.lang);

  if (!ctx.account || !program.loaded()) {
    drawGate();
    return;
  }

  if (!ctx.settings.onboarded) {
    shell = null;
    const view = h('main', { class: 'app' });
    mount(root, view);
    onboarding.render(view, { onDone: () => { router.go('today'); draw(); } });
    return;
  }

  // Каркас пересобирается целиком, чтобы смена языка сразу дошла до шапки и панели
  shell = buildShell();
  const name = router.currentRoute() || router.routeName();
  const screen = { today, week, journal: journalScreen, path, goals: goalsScreen, settings: settingsScreen }[name] || today;

  // Шапка: везде — кто вошёл (фото, имя, кабинет) и название; в настройках — «назад» вместо себя
  shell.back.hidden = name !== 'settings';
  if (shell.who) shell.who.hidden = name === 'settings';
  shell.gear.hidden = name === 'settings';
  for (const a of shell.nav.querySelectorAll('.app-nav__item')) {
    if (a.dataset.route === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  screen.render(shell.view, ctx);
  // Пришли из «Кванта» за значком — лист с кнопкой, как только вход и первая настройка позади
  install.offerIfRequested();
}

/* Перерисовка после изменений в хранилище. Пока открыт лист записи — откладываем: под ним
   ничего не должно прыгать, а после закрытия экран обновится один раз. */
function scheduleDraw() {
  if (sheetOpen()) {
    pending = true;
    return;
  }
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    draw();
  });
}

addEventListener('sheet-closed', () => {
  if (!pending) return;
  pending = false;
  draw();
});

subscribe((key) => {
  // Отметки отправленных напоминаний экран не меняют
  if (key === 'reminders-sent') return;
  scheduleDraw();
});

// Полночь: новый день программы, даже если приложение не закрывали
function checkDayChange() {
  const iso = isoDate();
  if (iso !== lastIso) {
    lastIso = iso;
    scheduleDraw();
  }
}
setInterval(checkDayChange, 60_000);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkDayChange());

takeKvantLink();
// Вкладка уже открыта, а «Квант» прислал новую ссылку — та же обработка (до маршрутов: они читают адрес после)
addEventListener('hashchange', takeKvantLink);

router.start((name, screen) => {
  screen?.onEnter?.();
  if (sheetOpen()) return;
  draw();
  scrollTo({ top: 0 });
});

reminders.start({
  context: () => ({ settings: settings.get(), entries: journal.all() }),
  inApp: (item) => toast({ title: item.title, text: item.body, ms: 8000, onClick: () => router.go('today') }),
});

if (account.current()) {
  if (gate.mode !== 'loading') loadProgram();
  account.refreshProfile();
}

// Chrome разрешил поставить значок — показать кнопку в настройках
install.onChange(() => router.currentRoute() === 'settings' && scheduleDraw());

// Снимки, на которые больше не ссылается ни одна запись (закрыла форму без «Сохранить»), — стереть
setTimeout(() => media.prune(journal.photoIds()).catch(() => {}), 4000);

registerWorker({ onUpdated: () => toast({ title: t('update.ready') }) });
