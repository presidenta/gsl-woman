import { h, add } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { toast } from '../../ui/toast.js';
import * as data from '../../anketa/data.js';
import { request } from '../../account/session.js';
import { formView } from '../../anketa/form.js';
import { resultView } from '../../anketa/result.js';
import { at } from '../../anketa/texts.js';
import { myMarks, setMark, keyOf } from '../../intim/map.js';

/* ЭКРАН «ЕДИНАЯ АНКЕТА ПАРТНЁРА» (#/anketa; #/anketa?result — сразу к «Нашему итогу»). Владелец 26.11.2026: анкета — в
   «Артефактах» → «Анкеты»; «Наш итог» — с парой и с каждым, кому отправилась анкета, «даже если пара не создана»;
   «Отправить анкету» — ссылкой, которую человек заполняет без входа (страница anketa.html), «как реферальная».
   Модуль — js/anketa/ (README.md). */

const open = new Set(['life']);
let results = null; // последний ответ сервера — без мигания при перерисовке
let loading = false;
let pulledAt = 0;

async function share() {
  try {
    const url = await data.link();
    const text = at('shareText', { url });
    if (navigator.share) {
      try { await navigator.share({ title: at('title'), text, url }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    await navigator.clipboard?.writeText(url);
    toast({ title: at('copied'), text: url });
  } catch {
    toast({ title: at('offline') });
  }
}

async function copy() {
  try {
    const url = await data.link();
    await navigator.clipboard?.writeText(url);
    toast({ title: at('copied'), text: url });
  } catch {
    toast({ title: at('offline') });
  }
}

function load(ctx) {
  if (loading) return;
  loading = true;
  data.send().catch(() => {})
    .then(() => data.results())
    .then((r) => { results = r; })
    .catch(() => { results = results || { error: true }; })
    .finally(() => { loading = false; ctx.rerender(); });
}

function personResult({ name, tag, result, wait, onHide }) {
  const node = h('details', { class: 'help__folder anketa-person' },
    h('summary', { class: 'help__folder-summary' },
      h('span', { class: 'help__folder-title' }, name, tag ? h('span', { class: 'chip chip--muted anketa-tag' }, tag) : null),
      result ? h('span', { class: 'help__count' }, at('totals', { a: result.totals.together, b: result.totals.tryIt, c: result.totals.talk })) : null),
    h('div', { class: 'help__folder-body' },
      result ? resultView(result, name) : h('p', { class: 'faint' }, wait),
      onHide ? h('button', { type: 'button', class: 'link-btn anketa-hide', onclick: onHide }, at('hide')) : null));
  return node;
}

function resultsCard(ctx) {
  const body = [];
  if (!results) body.push(h('p', { class: 'faint' }, '…'));
  else if (results.error) body.push(h('p', { class: 'faint' }, at('offline')));
  else {
    if (!results.mine) body.push(h('p', { class: 'faint' }, at('resultsMineFirst')));
    if (results.pair) {
      body.push(personResult({
        name: results.pair.name, tag: at('pairTag'), result: results.pair.result,
        wait: results.pair.filled ? at('resultsMineFirst') : at('pairWait', { name: results.pair.name }),
      }));
    }
    for (const g of results.guests) {
      body.push(personResult({
        name: g.name, tag: g.joined ? at('joinedTag') : null, result: g.result, wait: at('resultsMineFirst'),
        onHide: async () => {
          if (!confirm(at('hideAsk', { name: g.name }))) return;
          try { await data.hide(g.id); results = { ...results, guests: results.guests.filter((x) => x.id !== g.id) }; ctx.rerender(); } catch { toast({ title: at('offline') }); }
        },
      }));
    }
    if (!results.pair && !results.guests.length) body.push(h('p', { class: 'faint' }, at('resultsNone')));
  }
  return h('section', { class: 'card anketa-results', id: 'anketa-results' },
    h('h2', { class: 'card__title' }, at('resultsTitle')),
    h('p', { class: 'card__text' }, at('resultsLead')),
    ...body);
}

export function render(view, ctx) {
  const form = data.formOf(ctx.lang);
  if (!form) {
    add(view, h('h1', { class: 'screen-title' }, at('title')), h('p', { class: 'card__text' }, t('help.waiting')));
    return;
  }
  // Раз в заход на экран: свериться с сервером и обновить итоги
  if (Date.now() - pulledAt > 30000) {
    pulledAt = Date.now();
    data.pull().then((changed) => { if (changed) ctx.rerender(); }).catch(() => {}).finally(() => load(ctx));
  }
  add(view,
    h('h1', { class: 'screen-title' }, form.title),
    h('p', { class: 'help__intro' }, form.lead),
    h('section', { class: 'card anketa-send' },
      h('h2', { class: 'card__title' }, at('sendTitle')),
      h('p', { class: 'card__text' }, at('sendLead')),
      h('div', { class: 'card__actions' },
        h('button', { type: 'button', class: 'btn btn--gold', onclick: share }, at('sendBtn')),
        h('button', { type: 'button', class: 'btn btn--ghost', onclick: copy }, at('copyBtn')))),
    resultsCard(ctx),
    // Карты рождения — отдельный раздел #/charts (владелец 26.11.2026: «отдельно от анкеты»)
    h('a', { class: 'card settings__link', href: '#/charts' }, h('span', { class: 'settings__link-text' }, h('b', {}, 'Карты рождения'), h('br'), h('span', { class: 'faint' }, 'Пифагор, Матрица Ладини, Human Design — для тебя, партнёра, детей'))),
    formView(form, {
      skip: ['birth'], // данные рождения — в настройках «Про меня» (владелец 26.11.2026: «нелогично, где её вводить»)
      get: data.get,
      set: data.set,
      open,
      /* Карта желаний — прямо здесь (владелец 26.11.2026: «в анкете — только анкета, никуда не переводить»). Отметки те
         же, что в разделе «Интим 18⁺»: одна карта, отмечено здесь — видно и там */
      intim: {
        inline: true,
        marks: myMarks,
        setMark: (key, mark) => {
          const cur = myMarks()[keyOf(key)];
          if (mark === undefined) { if (cur) setMark(key, cur); } // то же ещё раз — снять
          else if (cur !== mark) setMark(key, mark);
        },
      },
      // Подсказки города рождения — с сервера (planner src/geo/)
      geo: async (q) => (await request(`/api/geo/places?q=${encodeURIComponent(q)}&lang=${ctx.lang}`)).places || [],
      lang: ctx.lang,
      save: async () => {
        try { await data.send(true); toast({ title: at('saved') }); } catch { toast({ title: at('savedLocal') }); }
      },
      love: { auto: data.loveAuto(), href: '#/love' },
    }),
  );
  if (location.hash.includes('?result')) requestAnimationFrame(() => view.querySelector('#anketa-results')?.scrollIntoView({ block: 'start' }));
}
