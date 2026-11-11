import { h, svg } from '../../core/dom.js';
import { t, setLang } from '../../core/i18n.js';
import { LANGS, SLOTS } from '../../config.js';
import { isValidIso, isValidTime } from '../../core/dates.js';
import * as settings from '../../settings/settings.js';
import * as permission from '../../reminders/permission.js';
import { clearAll } from '../../core/store.js';
import { segmented, field, switchRow } from '../../ui/controls.js';
import { icons } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';

/* ЭКРАН «НАСТРОЙКИ»: аккаунт «Кванта», обо мне (имя, язык), дата старта, время трёх напоминаний, уведомления, данные.
   Каждое изменение сохраняется сразу — кнопки «Сохранить» здесь нет, как и в спорте. */

/* Аккаунт «Кванта»: кто вошёл и «Выйти». Выход стирает сессию и копию программы, записи остаются
   на телефоне (main.js → ctx.logout). */
function accountBlock(ctx) {
  const a = ctx.account;
  if (!a) return null;
  const initial = (a.displayName || '·').trim().charAt(0).toUpperCase();
  const out = h('button', { type: 'button', class: 'btn btn--quiet btn--small' }, t('settings.logout'));
  out.addEventListener('click', () => {
    if (!confirm(t('settings.logoutConfirm'))) return;
    ctx.logout();
  });
  return h('section', { class: 'card settings__section' },
    h('h2', { class: 'caps settings__heading' }, t('settings.account')),
    h('div', { class: 'settings__account' },
      h('span', { class: 'settings__avatar', 'aria-hidden': 'true' }, initial),
      h('div', { class: 'settings__who' },
        h('strong', {}, a.displayName || '—'),
        a.accountNo ? h('span', { class: 'faint' }, t('settings.cabinet', { n: a.accountNo })) : null,
      ),
      out,
    ),
  );
}

export const LANG_LABELS = { ua: 'Українська', ru: 'Русский', en: 'English' };

/** Выбор языка — общий для настроек и первого входа. */
export function langPicker(current, onPick) {
  return segmented({
    label: t('settings.lang'),
    options: LANGS.map((l) => ({ value: l, label: LANG_LABELS[l] })),
    value: current,
    onChange: onPick,
  });
}

/** Три поля времени в ряд — тоже общие. */
export function timeFields(times, onPick) {
  return h('div', { class: 'time-grid' },
    ...SLOTS.map((slot) => {
      const f = field({ label: t(`settings.${slot}`), type: 'time', value: times[slot], required: true });
      f.control.addEventListener('change', () => {
        if (isValidTime(f.control.value)) onPick(slot, f.control.value);
      });
      return f.node;
    }),
  );
}

function notificationsBlock(ctx) {
  const state = permission.state();
  let body;
  if (state === 'granted') body = h('p', { class: 'settings__ok' }, svg(icons.check, 'settings__ok-icon'), t('settings.notifOn'));
  else if (state === 'denied') body = h('p', { class: 'field__hint' }, t('settings.notifDenied'));
  else if (state === 'unsupported') body = h('p', { class: 'field__hint' }, t('settings.notifUnsupported'));
  else {
    body = h('button', {
      type: 'button',
      class: 'btn btn--gold btn--block',
      onclick: async () => {
        await permission.request();
        ctx.rerender();
      },
    }, svg(icons.bell), t('settings.notifAsk'));
  }
  return body;
}

export function render(view, ctx) {
  const s = ctx.settings;

  const name = field({ label: t('settings.name'), placeholder: t('settings.namePh'), value: s.name, maxlength: 40, autocomplete: 'given-name' });
  name.control.addEventListener('change', () => settings.update({ name: name.control.value.trim() }));

  const start = field({ label: t('settings.start'), hint: t('settings.startHint'), type: 'date', value: s.startDate || '' });
  start.control.addEventListener('change', () => {
    if (isValidIso(start.control.value)) settings.update({ startDate: start.control.value });
  });

  const reset = h('button', { type: 'button', class: 'btn btn--danger btn--block' }, svg(icons.trash), t('settings.reset'));
  reset.addEventListener('click', () => {
    if (!confirm(t('settings.resetConfirm'))) return;
    clearAll();
    location.hash = '#/today';
    location.reload();
  });

  view.append(
    h('h1', { class: 'screen-title' }, t('settings.title')),

    accountBlock(ctx),

    h('section', { class: 'card settings__section' },
      h('h2', { class: 'caps settings__heading' }, t('settings.profile')),
      name.node,
      h('div', { class: 'field' },
        h('span', { class: 'field__label' }, t('settings.lang')),
        langPicker(s.lang, (lang) => {
          setLang(lang);
          settings.update({ lang });
        }),
      ),
      start.node,
    ),

    h('section', { class: 'card settings__section' },
      h('h2', { class: 'caps settings__heading' }, t('settings.times')),
      h('p', { class: 'field__hint', style: { marginBottom: 'var(--sp-4)' } }, t('settings.timesHint')),
      timeFields(s.times, (slot, value) => {
        settings.update({ times: { [slot]: value } });
        toast({ title: t('entry.saved') });
      }),
    ),

    h('section', { class: 'card settings__section' },
      h('h2', { class: 'caps settings__heading' }, t('settings.notifications')),
      notificationsBlock(ctx),
      h('hr', { class: 'divider' }),
      switchRow({
        title: t('settings.showTask'),
        hint: t('settings.showTaskHint'),
        checked: s.showTaskInNotice,
        onChange: (on) => settings.update({ showTaskInNotice: on }),
      }),
    ),

    h('section', { class: 'card settings__section' },
      h('h2', { class: 'caps settings__heading' }, t('settings.data')),
      reset,
    ),

    h('p', { class: 'settings__version faint' }, `${t('app.name')} · ${t('settings.version', { v: ctx.version })}`),
  );
}
