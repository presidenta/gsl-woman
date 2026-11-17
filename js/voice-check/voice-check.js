import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import { canRecord, startRecording } from '../circles/media.js';

/* МИКРОФОН В ЗАДАНИИ НА ГОЛОС (владелец 17.11.2026: «чтобы женщина не искала диктофоны — прямо в приложении нажала
   микрофон, записала, как говорит, а потом включила и прослушала»).

   У заданий с полем voice (программа на сервере: алфавит у зеркала, настройка на день) в карточке — «Записать голос».
   Запись живёт только в памяти телефона, пока открыто приложение: никуда не уходит и не сохраняется — это
   упражнение, а не запись на память. Записала ещё раз — прежняя заменяется. Две минуты — и запись останавливается. */

const MAX_MS = 2 * 60 * 1000;
const takes = new Map(); // день → { url, ms }
let live = null;         // { day, handle, timer }

const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export function voiceCheck(day) {
  if (!canRecord()) return null;
  const box = h('div', { class: 'voice-check' });
  const paint = () => {
    const take = takes.get(day);
    const recording = live?.day === day;
    // Пустое пропускаем: replaceChildren печатает null словом
    box.replaceChildren(...[
      h('p', { class: 'caps voice-check__title' }, t('voiceCheck.title')),
      recording
        ? h('button', { type: 'button', class: 'btn btn--gold btn--block voice-check__btn is-rec', onclick: stop }, h('span', { class: 'voice-check__dot' }), t('voiceCheck.stop'))
        : h('button', { type: 'button', class: 'btn btn--ghost btn--block voice-check__btn', onclick: start }, svg(icons.mic), t(take ? 'voiceCheck.again' : 'voiceCheck.record')),
      take && !recording ? h('audio', { class: 'voice-check__audio', controls: true, src: take.url }) : null,
      take && !recording ? h('p', { class: 'faint voice-check__hint' }, t('voiceCheck.hint', { time: mmss(take.ms) })) : null,
    ].filter(Boolean));
  };
  async function start() {
    if (live) return;
    try {
      const handle = await startRecording();
      live = { day, handle, timer: setTimeout(stop, MAX_MS) };
      paint();
    } catch {
      toast({ title: t('voiceCheck.denied') });
    }
  }
  async function stop() {
    if (!live) return;
    const { handle, timer } = live;
    clearTimeout(timer);
    live = null;
    const { blob, ms } = await handle.stop();
    const old = takes.get(day);
    if (old) URL.revokeObjectURL(old.url);
    if (blob?.size) takes.set(day, { url: URL.createObjectURL(blob), ms });
    if (box.isConnected) paint();
  }
  paint();
  return box;
}
