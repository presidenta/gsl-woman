import { h, svg, mount } from './core/dom.js';
import { t, setLang } from './core/i18n.js';
import { subscribe } from './core/store.js';
import { isoDate, programDay } from './core/dates.js';
import * as router from './core/router.js';
import { register as registerWorker } from './core/updates.js';
import * as settings from './settings/settings.js';
import * as journal from './journal/journal.js';
import * as account from './account/session.js';
import * as access from './access/access.js';
import * as sync from './sync/sync.js';
import * as native from './native/native.js';
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
import * as genderScreen from './screens/gender/gender.js';
import * as side from './side/side.js';
import * as goalsScreen from './screens/goals/goals.js';
import * as loveScreen from './screens/love/love.js';
import * as meetScreen from './screens/meet/meet.js';
import * as usScreen from './screens/us/us.js';
import * as circles from './circles/circles.js';
import { watchHabits } from './circles/goals-model.js';
import { identity } from './account/avatar.js';
import { brand as brandMark } from './ui/brand.js';
import * as install from './install/install.js';
import * as media from './media/photos.js';
import * as preview from './preview/preview.js';

/* ВХОД В ПРИЛОЖЕНИЕ: каркас (шапка, область экрана, нижняя панель), маршруты, перерисовка при
   изменениях, напоминания и работник. Экраны ничего не знают друг о друге: каждый получает ctx —
   свежие настройки, записи и день программы — и рисует себя в отведённое место.

   Порядок ворот: вход аккаунтом «Кванта» → «Кто ты?» (пол, один раз — GSL (W+M)⁺, side/) → программа своей
   части с его сервера (один раз, потом с телефона) → первый вход (имя, старт, время) → экраны. Без входа
   приложение не показывает ничего из программы.

   Часть приложения — женская или мужская — по полу из сессии (side/side.js): цвет, тексты, программа, адреса
   синхронизации и фото. Сменилась (выбрал пол, администратор переключил, администратор «Кванта» поменял пол) —
   своя программа загружается заново, данные телефона сверяются со своей частью на сервере (sync/).

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
router.define('love', loveScreen);
router.define('meet', meetScreen);
router.define('us', usScreen);

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
    // У администратора — день, который он листает стрелками (js/preview/), у участницы — настоящий
    day: preview.dayFor(s.startDate ? programDay(s.startDate, todayIso) : 0),
    realDay: s.startDate ? programDay(s.startDate, todayIso) : 0,
    lang: s.lang,
    version: VERSION,
    account: account.current(),
    logout,
    // Администратор смотрит другую часть (настройки): свой пол он меняет сам (сервер — gsl/gender.js)
    switchSide: chooseGender,
    rerender: draw,
    go: router.go,
  };
}

function buildShell() {
  const back = h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('common.back'), onclick: () => router.go('today') }, svg(icons.back));
  const gear = h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': t('common.settings') }, svg(icons.gear));
  // «Мы» — пара и семья (circles/): красная точка — есть новое сообщение
  const us = h('a', { class: 'icon-btn us-btn', href: '#/us', 'aria-label': t('us.open') }, svg(icons.rings), h('span', { class: 'us-btn__dot', hidden: true }));
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
    h('header', { class: 'app-header' }, back, who, h('span', { class: 'spacer' }), brand, us, gear),
    view,
    nav,
  );
  mount(root, app);
  return { app, back, who, brand, gear, us, view, nav };
}

/* Программа: нет на телефоне — ждём её на экране входа; есть — молча сверяем отпечаток (вышла правка —
   придёт новый текст, и экран перерисуется сам через хранилище). Сессию больше не принимают — на вход. */
async function loadProgram() {
  // Пол ещё не выбран — чья программа, неизвестно: сначала «Кто ты?»
  if (side.needsChoice(account.current())) {
    draw();
    return;
  }
  if (!program.loaded()) {
    gate = { mode: 'loading', message: '' };
    draw();
  }
  try {
    await program.refresh();
    gate = { mode: 'form', message: '' };
  } catch (err) {
    if (account.isClosed(err)) access.close();
    else if (account.isExpired(err)) return expire();
    else if (!program.loaded()) gate = { mode: 'failed', message: '' };
  }
  draw();
}

/* Доступ закрыт (срок вышел на телефоне или сервер ответил access_expired): свой экран вместо приложения,
   записи целы. «Проверить» спрашивает сервер — продлили, и всё открывается само. */
function drawClosed() {
  shell = null;
  const until = access.until();
  const check = h('button', { type: 'button', class: 'btn btn--gold btn--block' }, t('access.check'));
  check.addEventListener('click', async () => {
    check.disabled = true;
    await account.refreshProfile();
    if (access.isOpen()) loadProgram();
    else toast({ title: t('access.stillClosed') });
    check.disabled = false;
    draw();
  });
  const out = h('button', { type: 'button', class: 'btn btn--ghost btn--block' }, t('settings.logout'));
  out.addEventListener('click', logout);
  mount(root, h('main', { class: 'app access-closed' },
    h('section', { class: 'card card--hero access-closed__card' },
      h('div', { class: 'access-closed__lock', 'aria-hidden': 'true' }, svg(icons.lock)),
      h('h1', { class: 'card__title' }, t('access.title')),
      until ? h('p', { class: 'caps access-closed__until' }, t('access.until', { date: new Date(until).toLocaleDateString() })) : null,
      h('p', { class: 'card__text' }, t('access.text')),
      h('div', { class: 'card__actions access-closed__actions' }, check, out),
    ),
  ));
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
    .then(() => { loadProgram(); sync.now(); })
    .catch((err) => {
      const key = `login.err.${err?.code}`;
      const text = t(key);
      gate = { mode: 'form', message: err?.code === 'invalid_pass' ? t('login.passExpired') : text === key ? '' : text };
      draw();
    });
}

async function onLogin(loginName, password) {
  await account.login(loginName, password);
  side.follow(account.current());
  loadProgram();
  // Вошла — сразу забрать с сервера всё, что она вводила на других устройствах (sync/)
  sync.now();
}

/* Пол выбран (экран «Кто ты?») или администратор переключил часть: сервер сохраняет, сессия берёт пол, дальше —
   программа своей части и сверка данных. Отказ (нет сети, пол уже выбран) — исключение: экран покажет почему. */
async function chooseGender(gender) {
  await sync.now().catch(() => {});
  await account.chooseGender(gender);
  side.follow(account.current());
  gate = { mode: 'form', message: '' };
  loadProgram();
  sync.now();
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
  // Часть по полу из сессии: цвет и тексты — до всего остального. Сменилась — своя программа и свои данные
  if (side.follow(ctx.account) && ctx.account && !side.needsChoice(ctx.account)) {
    loadProgram();
    sync.now();
  }
  setLang(ctx.lang);

  // Доступ к GSL Woman+ закрыт — решает телефон по сохранённой дате, как «Квант» (access/)
  if (ctx.account && !access.isOpen()) {
    drawClosed();
    return;
  }

  if (!ctx.account) {
    drawGate();
    return;
  }

  // Пол ещё не выбран — до приложения только «Кто ты?» (владелец: «при входе обязательно указать пол»)
  if (side.needsChoice(ctx.account)) {
    shell = null;
    const view = h('main', { class: 'app' });
    mount(root, view);
    genderScreen.render(view, { onChoose: chooseGender });
    return;
  }

  if (!program.loaded()) {
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
  const screen = { today, week, journal: journalScreen, path, goals: goalsScreen, settings: settingsScreen, love: loveScreen, meet: meetScreen, us: usScreen }[name] || today;

  // Шапка: везде — кто вошёл (фото, имя, кабинет) и название; в настройках — «назад» вместо себя
  // «Пять языков любви» — тоже подэкран: «назад» вместо себя
  const sub = name === 'settings' || name === 'love' || name === 'meet' || name === 'us';
  shell.back.hidden = !sub;
  if (shell.who) shell.who.hidden = sub;
  shell.gear.hidden = name === 'settings';
  shell.us.hidden = name === 'us';
  const unread = circles.unread();
  const dot = shell.us.querySelector('.us-btn__dot');
  dot.hidden = !unread.length;
  dot.classList.toggle('is-urgent', unread.some((u) => u.msg.data?.signal === 'urgent'));
  for (const a of shell.nav.querySelectorAll('.app-nav__item')) {
    if (a.dataset.route === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  if (name === 'today' || name === 'week') {
    const strip = preview.bar(ctx.realDay);
    if (strip) shell.view.append(strip);
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

preview.onChange(() => { draw(); scrollTo({ top: 0 }); });

addEventListener('sheet-closed', () => {
  if (!pending) return;
  pending = false;
  draw();
});

subscribe((key) => {
  // Отметки отправленных напоминаний и служебное состояние синхронизации экран не меняют
  // Раскрыта ли карточка (ui/fold.js) — вид, его карточка меняет сама, плавно; перерисовка оборвала бы движение
  if (key === 'reminders-sent' || key === 'sync' || key === 'photo-sync' || key === 'fold') return;
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
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  checkDayChange();
  checkAccess();
});

/* Сверка срока доступа с сервером — при открытии и при возвращении в приложение, не чаще раза в 10 минут.
   Дату телефон проверяет сам каждую минуту (checkDayChange → перерисовка → access.isOpen). */
let accessCheckedAt = 0;
function checkAccess() {
  if (!account.current() || Date.now() - accessCheckedAt < 10 * 60_000) return;
  accessCheckedAt = Date.now();
  account.refreshProfile();
}

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
  // Закрытое приложение не напоминает о себе (как «Квант»: закрытое приложение не будит человека)
  context: () => ({ settings: access.isOpen() ? settings.get() : null, entries: journal.all() }),
  inApp: (item) => toast({ title: item.title, text: item.body, ms: 8000, onClick: () => router.go('today') }),
});

if (account.current()) {
  if (gate.mode !== 'loading') loadProgram();
  checkAccess();
}

// Chrome разрешил поставить значок — показать кнопку в настройках
install.onChange(() => router.currentRoute() === 'settings' && scheduleDraw());

// Снимки, на которые больше не ссылается ни одна запись (закрыла форму без «Сохранить»), — стереть
setTimeout(() => media.prune(journal.photoIds()).catch(() => {}), 4000);

// Копия данных на сервере и обмен между устройствами (владелец 13.11.2026) — как у GoldenFit
sync.start();

// «Пара» и «Семья» (circles/): обмен при открытии, возврате и раз в 30 секунд на экране; новое сообщение — плашка
circles.start();
watchHabits();
circles.onMessage(({ circle, msg }) => {
  if (router.currentRoute() === 'us') return;
  const name = circles.memberName(circle, msg.author);
  const urgent = msg.data?.signal === 'urgent';
  const text = msg.data?.text || (msg.data?.signal && !urgent ? t(`us.chat.signals.${msg.data.signal}`) : '');
  toast({ title: t(urgent ? 'us.chat.urgentFrom' : 'us.chat.newFrom', { name }), text, ms: 8000, onClick: () => router.go('us') });
});

// В приложении для Android: напоминания при закрытом приложении, будильник, виджет (native/)
native.start(() => ({ settings: settings.get(), entries: journal.all() }));

registerWorker({ onUpdated: () => toast({ title: t('update.ready') }) });
