import { h } from '../../core/dom.js';
import { zonedToUtc, chart, CENTERS, TYPES, AUTHORITIES, BODIES, BODY_RU } from './calc.js';
import { HD_TYPE_DB, HD_AUTHORITY_DB, HD_LINE_DB, HD_CENTER_DB, HD_CHANNEL_NAMES, HD_GATE_TITLES } from './texts.js'; // трактовки (тексты Gemini)
const fold = (title, ...body) => h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, title)), h('div', { class: 'help__folder-body' }, ...body));
const para = (b, t) => (t ? h('p', {}, h('b', {}, b), ' ', t) : null);


/* Карточка «Human Design»: тип, авторитет, профиль, крест, центры, каналы, активации Личности и Дизайна. Нужны дата, время
   и город с часовым поясом (подсказка города в анкете). Библиотека астрономии (astronomy.js, ~400 КБ) грузится только
   здесь, когда карточку открыли, — запуск приложения не тяжелеет. Бодиграф и трактовки — следующим шагом. */
export function hdCard({ date, time, city, caption = null }) {
  const tz = city && typeof city === 'object' ? city.tz : null;
  const head = [h('h2', { class: 'card__title' }, 'Human Design'), caption ? h('p', { class: 'chart__src' }, caption) : null];
  if (!date || !time || !tz) {
    return h('section', { class: 'card hd' }, ...head, h('p', { class: 'faint' }, 'Для расчёта нужны дата, время и город рождения (город — выбери из подсказки).'));
  }
  const body = h('div', {}, h('p', { class: 'faint' }, 'Считаем…'));
  import('./astronomy.js').then((A) => {
    const r = chart(A, zonedToUtc(date, time, tz));
    const row = (n, v) => h('li', {}, h('span', {}, n), h('b', {}, v));
    const acts = (src) => h('ul', { class: 'pyth__lines hd__acts' }, ...BODIES.map((b) => row(BODY_RU[b], `${src[b].gate}.${src[b].line}`)));
    body.replaceChildren(
      h('ul', { class: 'pyth__lines' },
        row('Тип', TYPES[r.type]), row('Авторитет', AUTHORITIES[r.authority]), row('Профиль', r.profile),
        row('Инкарнационный крест', r.cross.join(' / '))),
      h('h3', { class: 'caps mx__cap' }, 'Центры'),
      h('p', {}, h('b', {}, 'Определённые: '), r.defined.map((c) => CENTERS[c]).join(', ') || '—'),
      h('p', {}, h('b', {}, 'Открытые: '), r.open.map((c) => CENTERS[c]).join(', ') || '—'),
      h('h3', { class: 'caps mx__cap' }, 'Каналы'),
      h('p', {}, r.channels.join(' · ') || '—'),
      h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, 'Активации: Личность и Дизайн')),
        h('div', { class: 'help__folder-body hd__cols' },
          h('div', {}, h('p', { class: 'caps' }, 'Личность'), acts(r.personality)),
          h('div', {}, h('p', { class: 'caps' }, 'Дизайн'), acts(r.design)))),
      (() => { const T = HD_TYPE_DB[r.type] || {}; const Au = HD_AUTHORITY_DB[r.authority] || {}; const [l1, l2] = r.profile.split('/').map(Number);
        const ch = (id) => { const [a, b] = id.split('–'); return HD_CHANNEL_NAMES[`${a}-${b}`] || HD_CHANNEL_NAMES[`${b}-${a}`]; };
        return fold('Расшифровка',
          h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `Тип: ${TYPES[r.type]}`), para('Роль:', T.role), para('Энергия:', T.howEnergyWorks), para('Стратегия:', T.strategy), para('Подпись (когда всё верно):', T.signature), para('Тема не-себя:', T.notSelfTheme), para('На практике:', T.practicalGuidance)),
          h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `Авторитет: ${AUTHORITIES[r.authority]}`), para('Как решать:', Au.howToDecide), para('Ловушки:', Au.pitfalls)),
          h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, `Профиль ${r.profile}`), para(`Линия ${l1}:`, HD_LINE_DB[l1]), para(`Линия ${l2}:`, HD_LINE_DB[l2])),
          h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, 'Центры'), ...Object.keys(CENTERS).map((c) => para(`${CENTERS[c]} (${r.defined.includes(c) ? 'определён' : 'открыт'}):`, r.defined.includes(c) ? HD_CENTER_DB[c]?.definedMeaning : HD_CENTER_DB[c]?.undefinedMeaning))),
          r.channels.length ? h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, 'Каналы'), ...r.channels.map((id) => para(`${ch(id)?.name || id}:`, ch(id)?.summary))) : null,
          h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, 'Инкарнационный крест — ворота'), ...r.cross.map((g) => para(`${g}:`, HD_GATE_TITLES[g] ? `${HD_GATE_TITLES[g].title} — ${HD_GATE_TITLES[g].keywords.join(', ')}` : ''))));
      })());
  }).catch(() => body.replaceChildren(h('p', { class: 'faint' }, 'Не получилось загрузить расчёт — открой ещё раз.')));
  return h('section', { class: 'card hd' }, ...head, body);
}
