import { h, svg, add } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { icons } from '../../ui/icons.js';
import { segmented } from '../../ui/controls.js';
import { toast } from '../../ui/toast.js';
import { ApiError } from '../../account/session.js';
import * as circles from '../../circles/circles.js';
import { chatView } from '../../circles/chat-view.js';
import { wishesView } from '../../circles/wishes-view.js';
import { anketaLink } from '../../anketa/link.js';
import { at } from '../../anketa/texts.js';
import { childrenBlock, dreamsView } from '../../circles/family-view.js';
// Детский кабинет глазами родителя — вкладка «Дети» (kids/, 14.11.2026)
import { kidsView } from '../../kids/parent-view.js';
import { kt } from '../../kids/texts.js';
import { familyDreamCard } from '../../kids/family-dream.js';
import { teamCard } from '../../team/team-view.js';
import { familyApi } from '../../kids/family-api.js';
import { kidAlerts } from '../../kids/alerts.js';
import { photoOf } from '../../photos/photos.js';
import { questMark } from '../../quest/quest.js';

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
      // Код вставляют как придётся (с пробелом, строчными) — приводим к виду кода
      await circles.join(input.value.replace(/\s+/g, '').toUpperCase());
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
  // Копирование кода (владелец 18.11.2026: «код делится на две части — сделай, чтобы копировался нажатием»): цельный код,
  // нажал на него или на «Скопировать» — он в буфере целиком, без пробела
  const copy = async () => {
    if (!c) return;
    try { await navigator.clipboard.writeText(c.code); toast({ title: t('us.code.copied') }); } catch { /* копирование недоступно — код виден на экране */ }
  };
  const show = h('button', { type: 'button', class: 'us-code gold-text', 'aria-label': t('us.code.copy'), onclick: copy }, c ? c.code : '······');
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
    // «Приглашение в квест «Я⁺ • Любовь»» (владелец 18.11.2026) — у пары; у семьи — код для второго родителя
    h('p', { class: 'caps' }, label, circle.kind === 'pair' ? [' ', questMark({ quoted: true })] : null),
    show,
    h('p', { class: 'card__text faint' }, t('us.code.text')),
    h('div', { class: 'card__actions us-empty__actions' },
      h('button', { type: 'button', class: 'btn btn--gold btn--block', onclick: copy }, t('us.code.copy')),
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
  // Ждём второго человека: сверху — фото влюблённой пары (js/photos/: us.invite), как у «Семьи» (владелец 18.11.2026)
  if (!circles.isComplete(circle)) return [h('section', { class: 'card us-head has-photo' }, photoOf('us.invite'), memberList(circle)), codeCard(ctx, circle), leaveButton(ctx, circle)];
  const tabs = ['chat', 'wishes'];
  return [
    // Фото пары (js/photos/: us.pair) — меняется по дням
    h('section', { class: 'card us-head has-photo' }, photoOf('us.pair'), memberList(circle)),
    segmented({ label: t('us.pair'), options: tabs.map((k) => ({ value: k, label: t(`us.tabs.${k}`) })), value: pairTab, onChange: (v) => { pairTab = v; ctx.rerender(); } }),
    pairTab === 'wishes' ? wishesView(circle) : chatView(circle),
    h('a', { class: 'love-card__link us-goals-link', href: '#/goals' }, t('us.goalsLink'), svg(icons.chevronRight, 'love-card__chevron')),
    // «Наш итог» единой анкеты партнёра (js/anketa/, владелец 26.11.2026)
    anketaLink({ href: '#/anketa?result', text: at('resultsTitle'), lead: at('pairLead') }),
    leaveButton(ctx, circle),
  ];
}

function familyView(view, ctx, circle) {
  const parents = circle.members.filter((m) => m.role === 'parent');
  const tabs = ['chat', 'kids', 'dreams'];
  const alerts = kidAlerts(circle).total;
  const tabLabel = (k) => (k === 'kids' ? `${kt('parent.tab')}${alerts ? ` · ${alerts} 🔴` : ''}` : t(`us.tabs.${k}`));
  return [
    h('section', { class: 'card us-head has-photo' }, photoOf('us.family'), memberList(circle)),
    // Командная цель семьи — 10 звёзд за день, доля каждого ребёнка, неделя (team/, владелец 21.11.2026)
    teamCard(familyApi(circle), { rerender: ctx.rerender }),
    // Мечта нашей семьи — общий котёл звёзд (kids/family-dream.js)
    familyDreamCard(familyApi(circle), { rerender: ctx.rerender }),
    childrenBlock(circle, fail),
    parents.length < 2 && circle.role === 'parent' ? codeCard(ctx, circle) : null,
    segmented({ label: t('us.family'), options: tabs.map((k) => ({ value: k, label: tabLabel(k) })), value: familyTab, onChange: (v) => { familyTab = v; ctx.rerender(); } }),
    familyTab === 'dreams' ? dreamsView(circle) : familyTab === 'kids' ? kidsView(ctx, circle) : chatView(circle),
    h('a', { class: 'love-card__link us-goals-link', href: '#/goals' }, t('us.goalsLink'), svg(icons.chevronRight, 'love-card__chevron')),
    leaveButton(ctx, circle),
  ];
}

export function render(view, ctx) {
  add(view,
    // «Совместные квесты «Я⁺ • Любовь»» (владелец 18.11.2026: «чтобы понимали — совместные квесты чего»)
    // Пара — «Совместные квесты», семья — «Командные квесты» (владелец 19.11.2026: заголовок по выбранной вкладке)
    h('h1', { class: 'screen-title quest-title' }, t(kind === 'family' ? 'us.titleFamily' : 'us.title'), questMark({ quoted: true })),
    segmented({
      label: t('us.title'),
      options: [{ value: 'pair', label: t('us.pair') }, { value: 'family', label: t('us.family') }],
      value: kind,
      onChange: (v) => { kind = v; joining = false; ctx.rerender(); },
    }),
  );
  const circle = kind === 'pair' ? circles.pair() : circles.family();
  if (!circle) {
    add(view, ...(kind === 'pair' ? [h('section', { class: 'card us-head has-photo' }, photoOf('us.invite'))] : []), emptyState(view, ctx, kind));
    return;
  }
  add(view, ...(kind === 'pair' ? pairView(view, ctx, circle) : familyView(view, ctx, circle)));
}

/** Пришли на экран — сразу сверить с сервером. */
export function onEnter() {
  joining = false;
  circles.refresh().catch(() => {});
}
