import { h, svg } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { field } from '../../ui/controls.js';
import { icons } from '../../ui/icons.js';
import { brand } from '../../ui/brand.js';

/* ВХОД: до него приложение ничего не показывает — программа приходит только вошедшей (program/source.js).
   Языка здесь нет — он в настройках (владелец 12.11.2026); до входа — язык телефона.
   Шапка — та же, что у первого входа (классы onboarding__*), чтобы два первых экрана были одним целым.

   Три состояния, их выбирает main.js:
   - form    — логин и пароль «Кванта»; message — почему снова просим войти (вход истёк);
   - loading — вошла, программа загружается;
   - failed  — программа не пришла (нет сети при первом входе): «Попробовать ещё раз». */

let typedLogin = '';     // язык сменили посреди ввода — экран перерисуется, логин не пропадёт

export function render(view, { mode = 'form', message = '', onLogin, onRetry }) {

  const hero = [
    h('div', { class: 'onboarding__mark' }, svg(icons.sparkle)),
    h('p', { class: 'caps onboarding__eyebrow' }, t('onboarding.eyebrow')),
    h('h1', { class: 'onboarding__brand gold-text' }, brand()),
    h('p', { class: 'onboarding__tagline' }, t('app.tagline')),
  ];

  if (mode !== 'form') {
    const failed = mode === 'failed';
    view.append(h('div', { class: 'onboarding login' },
      ...hero,
      h('p', { class: `login__status${failed ? ' login__status--error' : ''}`, role: 'status' },
        failed ? t('login.programFail') : t('login.loading')),
      failed
        ? h('button', { type: 'button', class: 'btn btn--gold btn--block onboarding__begin', onclick: onRetry }, t('login.retry'))
        : h('div', { class: 'login__dots', 'aria-hidden': 'true' }, h('span'), h('span'), h('span')),
    ));
    return;
  }

  const loginField = field({
    label: t('login.login'), value: typedLogin, autocomplete: 'username',
    autocapitalize: 'none', spellcheck: 'false', maxlength: 120, required: true,
  });
  const passField = field({
    label: t('login.password'), type: 'password', autocomplete: 'current-password', maxlength: 200, required: true,
  });
  loginField.control.addEventListener('input', () => { typedLogin = loginField.control.value; });

  const error = h('p', { class: 'login__error', role: 'alert', hidden: !message }, message);
  const submit = h('button', { type: 'submit', class: 'btn btn--gold btn--block onboarding__begin' }, t('login.submit'), svg(icons.chevronRight));

  const form = h('form', { class: 'card onboarding__form login__form', novalidate: true },
    loginField.node,
    passField.node,
    error,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginName = loginField.control.value.trim();
    const password = passField.control.value;
    if (!loginName || !password) {
      (loginName ? passField : loginField).control.focus();
      return;
    }
    submit.disabled = true;
    submit.firstChild.textContent = t('login.busy');
    error.hidden = true;
    try {
      await onLogin(loginName, password);
      typedLogin = '';
    } catch (err) {
      const key = `login.err.${err?.code}`;
      const text = t(key);
      error.textContent = text === key ? t('login.err.other') : text;
      error.hidden = false;
      submit.disabled = false;
      submit.firstChild.textContent = t('login.submit');
      passField.control.select();
    }
  });
  // Кнопка — вне карточки, как у первого входа, но в той же форме: Enter в поле пароля тоже входит
  submit.setAttribute('form', 'login-form');
  form.id = 'login-form';

  view.append(h('div', { class: 'onboarding login' },
    ...hero,
    h('p', { class: 'onboarding__lead' }, t('login.lead')),
    form,
    submit,
    h('p', { class: 'login__hint' }, t('login.hint')),
  ));
}
