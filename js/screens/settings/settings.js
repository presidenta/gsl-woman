import { h, svg } from '../../core/dom.js';
import { t, setLang } from '../../core/i18n.js';
import { LANGS, SLOTS } from '../../config.js';
import { isValidIso, isValidTime } from '../../core/dates.js';
import * as settings from '../../settings/settings.js';
import * as permission from '../../reminders/permission.js';
import { clearAll } from '../../core/store.js';
import { field, switchRow } from '../../ui/controls.js';
import { icons } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { accountCard } from '../../account/avatar.js';
import { installCard } from '../../install/install.js';
import * as media from '../../media/photos.js';
import { checkNow } from '../../core/updates.js';

/* ЭКРАН «НАСТРОЙКИ»: аккаунт «Кванта» (фото, имя, кабинет), значок на экран, обо мне (имя, язык), дата старта, время трёх напоминаний, уведомления, данные.
   Каждое изменение сохраняется сразу — кнопки «Сохранить» здесь нет, как и в спорте. */

/* Версия и «Обновить» — одним рядом внизу настроек: видно, какая версия стоит, и одним нажатием подтянуть
   новую. Новая есть — страница сама перезагрузится на неё (core/updates.js). */
function updateRow(ctx) {
  const btn = h('button', { type: 'button', class: 'btn btn--quiet btn--small settings__update' }, svg(icons.refresh), t('update.check'));
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.classList.add('is-spinning');
    const result = await checkNow();
    btn.classList.remove('is-spinning');
    btn.disabled = false;
    toast({ title: t(`update.${result}`), ms: result === 'updating' ? 8000 : 4000 });
  });
  return h('div', { class: 'settings__version-row' },
    h('p', { class: 'settings__version faint' }, `${t('app.name')} · ${t('settings.version', { v: ctx.version })}`),
    btn,
  );
}

export const LANG_LABELS = { ua: 'Українська', ru: 'Русский', en: 'English' };

/** Выбор языка — общий для настроек и первого входа. */
/* Язык — выпадающим списком, как на всех наших сайтах (владелец 12.11.2026: «не три кнопки, а выпадающее
   меню, и только в настройках — освободи место для чтения и письма»). Свой список телефона: на Android и
   iPhone он открывается родным окном выбора. */
export function langSelect(current, onPick) {
  const id = 'lang-select';
  const select = h('select', { id, class: 'input select__control', 'aria-label': t('settings.lang') },
    ...LANGS.map((l) => h('option', { value: l, selected: l === current }, LANG_LABELS[l])));
  select.addEventListener('change', () => onPick(select.value));
  return { id, node: h('div', { class: 'select' }, select, svg(icons.chevronRight, 'select__chevron')) };
}

/** Три поля времени в ряд — тоже общие. */
/* Время трёх напоминаний — строками: слева «Утро» и зачем оно (задание дня), справа время. Три поля в ряд на
   телефоне вылезали за край: у системного поля времени своя ширина (владелец 12.11.2026). */
export function timeFields(times, onPick) {
  return h('div', { class: 'time-list' },
    ...SLOTS.map((slot) => {
      const id = `time-${slot}`;
      const input = h('input', { id, class: 'input time-list__input', type: 'time', value: times[slot], required: true });
      input.addEventListener('change', () => {
        if (isValidTime(input.value)) onPick(slot, input.value);
      });
      return h('div', { class: 'time-list__row' },
        h('label', { class: 'time-list__name', for: id },
          h('strong', {}, t(`settings.${slot}`)),
          h('span', { class: 'time-list__hint' }, t(`settings.${slot}Hint`)),
        ),
        input,
      );
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

  // Стереть всё — маленькой тихой строкой в самом низу (владелец 12.11.2026: «большая кнопка — прям хочется нажать»)
  const reset = h('button', { type: 'button', class: 'settings__reset' }, t('settings.reset'));
  reset.addEventListener('click', async () => {
    if (!confirm(t('settings.resetConfirm'))) return;
    await media.clear();
    clearAll();
    location.hash = '#/today';
    location.reload();
  });

  view.append(
    h('h1', { class: 'screen-title' }, t('settings.title')),

    accountCard({ onLogout: ctx.logout }),
    installCard(),

    h('section', { class: 'card settings__section' },
      h('h2', { class: 'caps settings__heading' }, t('settings.profile')),
      name.node,
      (() => {
        const lang = langSelect(s.lang, (value) => {
          setLang(value);
          settings.update({ lang: value });
        });
        return h('div', { class: 'field' }, h('label', { class: 'field__label', for: lang.id }, t('settings.lang')), lang.node);
      })(),
      start.node,
    ),

    h('section', { class: 'card settings__section' },
      h('h2', { class: 'caps settings__heading' }, t('settings.times')),
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


    updateRow(ctx),
    h('div', { class: 'settings__danger' }, reset),
  );
}
