import { h, svg, add } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { icons } from '../../ui/icons.js';
import { segmented } from '../../ui/controls.js';
import { toast } from '../../ui/toast.js';
import { ApiError } from '../../account/session.js';
import * as circles from '../../circles/circles.js';
import { chatView } from '../../circles/chat-view.js';
import { wishesView } from '../../circles/wishes-view.js';
import { childrenBlock, dreamsView } from '../../circles/family-view.js';

/* ЭКРАН «МЫ» (#/us) — «Пара» и «Семья» (владелец 13.11.2026; ТЗ — docs/TZ-para-semya.md). Вверху переключатель
   «Пара · Семья». Нет контура — что это и «Создать» / «У меня есть код». Создан, но второго ещё нет — код для
   второго. Готов — участники, вкладки (пара: чат, желания; семья: чат, мечты детей), ссылка на общие цели,
   «Выйти». «Разговор пары» — карточка седьмого дня на «Сегодня» (circles/talk.js). */

let kind = 'pair';
let pairTab = 'chat';
let familyTab = 'chat';
let code = {}; // { [circleId]: { code, expiresAt } } — показанный код приглашения
let joining = false;

function errorText(err) {
  if (err instanceof ApiError) {
    if (err.code === 'network') return t('us.errors.network');
    const known = ['invite_invalid', 'same_gender', 'already_in_pair', 'already_in_family', 'pair_full', 'family_full', 'own_circle', 'no_gender'];
    if (known.includes(err.code)) return t(`us.errors.${err.code}`);
  }
  return t('us.errors.other');
}

const fail = (err) => toast({ title: errorText(err) });

function memberList(circle) {
  return h('ul', { class: 'us-members' }, ...circle.members.filter((m) => m.role !== 'child').map((m) => h('li', {
    class: `us-member ${m.side === 'man' ? 'is-man' : 'is-woman'}${m.id === circle.me ? ' is-me' : ''}`,
  }, h('span', { class: 'us-member__dot' }), m.id === circle.me ? `${m.name} · ${t('us.chat.you')}` : m.name)));
}

function joinForm(view, ctx) {
  const input = h('input', { class: 'input us-code__input', maxlength: '8', autocomplete: 'off', autocapitalize: 'characters', placeholder: t('us.join.ph'), 'aria-label': t('us.join.title') });
  const form = h('form', { class: 'us-join' },
    h('p', { class: 'field__label' }, t('us.join.title')),
    h('div', { class: 'steps__row' }, input, h('button', { type: 'submit', class: 'btn btn--gold' }, t('us.join.btn'))),
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await circles.join(input.value);
      joining = false;
      toast({ title: t('us.join.done') });
      ctx.rerender();
    } catch (err) {
      fail(err);
    }
  });
  return form;
}

function emptyState(view, ctx, which) {
  const base = which === 'pair' ? 'us.pairEmpty' : 'us.familyEmpty';
  return h('section', { class: 'card card--hero us-empty' },
    h('div', { class: 'goals__emblem' }, svg(icons.rings)),
    h('h2', { class: 'card__title' }, t(`${base}.title`)),
    h('p', { class: 'card__text' }, t(`${base}.text`)),
    h('div', { class: 'card__actions us-empty__actions' },
      h('button', {
        type: 'button', class: 'btn btn--gold btn--block',
        onclick: async () => {
          try {
            const list = await circles.create(which);
            const c = list.find((x) => x.kind === which);
            if (c) code[c.id] = await circles.invite(c.id);
            ctx.rerender();
          } catch (err) {
            fail(err);
          }
        },
      }, t(`${base}.create`)),
      h('button', { type: 'button', class: 'btn btn--ghost btn--block', onclick: () => { joining = !joining; ctx.rerender(); } }, t(`${base}.join`)),
    ),
    joining ? joinForm(view, ctx) : null,
  );
}

function codeCard(ctx, circle) {
  const c = code[circle.id];
  const label = circle.kind === 'pair' ? t('us.code.pair') : t('us.code.family');
  const show = h('p', { class: 'us-code gold-text' }, c ? `${c.code.slice(0, 3)} ${c.code.slice(3)}` : '· · · · · ·');
  const fresh = async () => {
    try {
      code[circle.id] = await circles.invite(circle.id);
      ctx.rerender();
    } catch (err) {
      fail(err);
    }
  };
  if (!c) queueMicrotask(fresh);
  return h('section', { class: 'card card--hero us-invite' },
    h('p', { class: 'caps' }, label),
    show,
    h('p', { class: 'card__text faint' }, t('us.code.text')),
    h('div', { class: 'card__actions us-empty__actions' },
      h('button', {
        type: 'button', class: 'btn btn--gold btn--block',
        onclick: async () => {
          if (!c) return;
          try { await navigator.clipboard.writeText(c.code); toast({ title: t('us.code.copied') }); } catch { /* копирование недоступно — код виден на экране */ }
        },
      }, t('us.code.copy')),
      h('button', { type: 'button', class: 'btn btn--ghost btn--block', onclick: fresh }, t('us.code.fresh')),
    ),
    circle.kind === 'pair' ? h('p', { class: 'faint us-waiting' }, t('us.code.waiting')) : null,
  );
}

function leaveButton(ctx, circle) {
  const pair = circle.kind === 'pair';
  return h('button', {
    type: 'button', class: 'btn btn--danger btn--block us-leave',
    onclick: async () => {
      if (!confirm(pair ? t('us.leavePairAsk') : t('us.leaveFamilyAsk'))) return;
      try {
        await circles.leave(circle.id);
        delete code[circle.id];
        ctx.rerender();
      } catch (err) {
        fail(err);
      }
    },
  }, pair ? t('us.leavePair') : t('us.leaveFamily'));
}

function pairView(view, ctx, circle) {
  if (!circles.isComplete(circle)) return [memberList(circle), codeCard(ctx, circle), leaveButton(ctx, circle)];
  const tabs = ['chat', 'wishes'];
  return [
    h('section', { class: 'card us-head' }, memberList(circle)),
    segmented({ label: t('us.pair'), options: tabs.map((k) => ({ value: k, label: t(`us.tabs.${k}`) })), value: pairTab, onChange: (v) => { pairTab = v; ctx.rerender(); } }),
    pairTab === 'wishes' ? wishesView(circle, ctx.rerender) : chatView(circle),
    h('a', { class: 'love-card__link us-goals-link', href: '#/goals' }, t('us.goalsLink'), svg(icons.chevronRight, 'love-card__chevron')),
    leaveButton(ctx, circle),
  ];
}

function familyView(view, ctx, circle) {
  const parents = circle.members.filter((m) => m.role === 'parent');
  const tabs = ['chat', 'dreams'];
  return [
    h('section', { class: 'card us-head' }, memberList(circle)),
    childrenBlock(circle, fail),
    parents.length < 2 && circle.role === 'parent' ? codeCard(ctx, circle) : null,
    segmented({ label: t('us.family'), options: tabs.map((k) => ({ value: k, label: t(`us.tabs.${k}`) })), value: familyTab, onChange: (v) => { familyTab = v; ctx.rerender(); } }),
    familyTab === 'dreams' ? dreamsView(circle) : chatView(circle),
    h('a', { class: 'love-card__link us-goals-link', href: '#/goals' }, t('us.goalsLink'), svg(icons.chevronRight, 'love-card__chevron')),
    leaveButton(ctx, circle),
  ];
}

export function render(view, ctx) {
  add(view,
    h('h1', { class: 'screen-title' }, t('us.title')),
    segmented({
      label: t('us.title'),
      options: [{ value: 'pair', label: t('us.pair') }, { value: 'family', label: t('us.family') }],
      value: kind,
      onChange: (v) => { kind = v; joining = false; ctx.rerender(); },
    }),
  );
  const circle = kind === 'pair' ? circles.pair() : circles.family();
  if (!circle) {
    add(view, emptyState(view, ctx, kind));
    return;
  }
  add(view, ...(kind === 'pair' ? pairView(view, ctx, circle) : familyView(view, ctx, circle)));
}

/** Пришли на экран — сразу сверить с сервером. */
export function onEnter() {
  joining = false;
  circles.refresh().catch(() => {});
}
