import { h } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { saveGoalAudio, getGoalAudio, getGoalAudioMeta, deleteGoalAudio, canRecord, startRecording, formatDuration } from './audio.js';
import { buildSeekBar, bindSeekBar } from './audio-seek.js';
import { markDeleted } from '../sync/voices.js';
import { now as syncNow } from '../sync/sync.js';
import * as photos from '../media/photos.js';
import { openViewer } from '../media/viewer.js';
import { toast } from '../ui/toast.js';

/* ГОЛОС К ЦЕЛИ — блок в карточке правки цели. Логика перенесена из «Кванта» без изменений (владелец 15.11.2026:
   «код не пиши новый, он проверенный»): planner/web/js/views/space/app.js — buildDoorMedia, toggleRecording,
   startRecTimer, applyAudioState, previewDoorAudio, stopDoorAudio, removeDoorAudio, onDoorAudioFile. Там это методы
   экрана дверей; здесь те же шаги для одной цели.

   Плашки в один ряд, как у двери «Кванта»: «● Записать» (во время записи — таймер; второе нажатие останавливает и
   сохраняет), «Файл» (выбрать запись с телефона), «Фото n/3» (с 68 — владелец 15.11.2026 прислал снимок двери:
   «вот как должно выглядеть»; buildDoorMedia и refreshPhotoStrip «Кванта»). Есть запись — её имя и длина, ▶ слушать
   (с ползунком), ■ стоп, ✕ убрать; под ними — снимки с ✕, нажатие — во весь экран.
   Голос хранится на телефоне, копия — на сервере (sync/voices.js, сборка 66). Снимки — в базе фото media/, в цель
   попадают номерами через onPhotos (в черновике — сразу, в карточке — по «Готово»).

   goalAudioField(goalId, { photos, onPhotos }) → { node, close }. Без onPhotos — только голос. */

export const PHOTO_LIMIT = 3; // как у двери «Кванта»

export function goalAudioField(goalId, { photos: photoIds = [], onPhotos = null } = {}) {
  let recorder = null;
  let recTimer = null;
  let audioEl = null;
  let audioUrl = null;
  let unbindSeek = null;

  const recText = h('span', { class: 'qm-chip-text' }, t('goals.audio.record'));
  const record = h('button', { type: 'button', class: 'qm-chip qm-chip-rec' },
    h('span', { class: 'qm-ico qm-ico-mic', 'aria-hidden': 'true' }), recText);
  if (!canRecord()) {
    record.disabled = true;
    record.title = t('goals.audio.noMic');
  }
  const fileInput = h('input', { type: 'file', accept: 'audio/*', hidden: true });
  const fileChip = h('label', { class: 'qm-chip' }, h('span', { class: 'qm-ico qm-ico-file', 'aria-hidden': 'true' }), h('span', { class: 'qm-chip-text' }, t('goals.audio.file')), fileInput);

  // Фото: плашка со счётчиком и лента снимков (refreshPhotoStrip «Кванта»)
  let shots = [...photoIds];
  const photoInput = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
  const counter = h('span', { class: 'qm-photo-count' });
  const photoChip = onPhotos
    ? h('label', { class: 'qm-chip' }, h('span', { class: 'qm-ico qm-ico-photo', 'aria-hidden': 'true' }), h('span', { class: 'qm-chip-text' }, t('photos.add')), counter, photoInput)
    : null;
  const strip = h('div', { class: 'qm-photo-strip' });

  function paintPhotos() {
    counter.textContent = `${shots.length}/${PHOTO_LIMIT}`;
    if (photoChip) photoChip.classList.toggle('is-full', shots.length >= PHOTO_LIMIT);
    photoInput.disabled = shots.length >= PHOTO_LIMIT;
    strip.replaceChildren(...shots.map((id, i) => {
      const img = h('img', { alt: '', decoding: 'async' });
      const cached = photos.cachedUrl(id);
      if (cached) img.src = cached;
      else photos.url(id).then((u) => { if (u) img.src = u; });
      const open = h('button', { type: 'button', class: 'qm-photo-open', 'aria-label': t('photos.open'), onclick: () => openViewer(shots, i) }, img);
      const drop = h('button', {
        type: 'button',
        class: 'qm-photo-drop',
        'aria-label': t('photos.remove'),
        onclick: () => { shots = shots.filter((x) => x !== id); paintPhotos(); onPhotos(shots); },
      });
      return h('div', { class: 'qm-photo-cell' }, open, drop);
    }));
  }

  photoInput.addEventListener('change', async () => {
    const files = [...photoInput.files].slice(0, PHOTO_LIMIT - shots.length);
    photoInput.value = '';
    for (const file of files) {
      try {
        shots = [...shots, await photos.save(file)];
        paintPhotos();
      } catch {
        toast({ title: t('photos.failed') });
      }
    }
    if (files.length) onPhotos(shots);
  });

  const info = h('span', { class: 'qm-audio-info' });
  const preview = h('button', { type: 'button', class: 'qm-icon-btn qm-audio-preview', 'aria-label': t('goals.audio.play'), hidden: true });
  const stop = h('button', { type: 'button', class: 'qm-icon-btn qm-audio-stop', 'aria-label': t('goals.audio.stop'), hidden: true });
  const remove = h('button', { type: 'button', class: 'qm-icon-btn qm-audio-remove', 'aria-label': t('goals.audio.remove'), hidden: true });
  const seek = buildSeekBar(t('goals.audio.seek'));

  const node = h('div', { class: 'qm-media goal-audio' },
    h('div', { class: 'qm-media-actions' }, record, fileChip, photoChip),
    h('div', { class: 'qm-media-state' }, info, preview, stop, remove),
    seek,
    strip,
  );
  paintPhotos();

  function startRecTimer() {
    stopRecTimer();
    const startedAt = Date.now();
    const tick = () => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      recText.textContent = formatDuration(seconds * 1000) || '0:00';
      record.style.setProperty('--qm-rec-turn', ((seconds % 60) / 60).toFixed(3));
    };
    tick();
    recTimer = setInterval(tick, 250);
  }

  function stopRecTimer() {
    if (recTimer) {
      clearInterval(recTimer);
      recTimer = null;
    }
  }

  function applyAudioState(meta) {
    const isRecording = !!recorder;
    if (!record.disabled) {
      record.classList.toggle('qm-chip-rec-on', isRecording);
      if (!isRecording) recText.textContent = t('goals.audio.record');
    }
    if (isRecording) {
      info.textContent = t('goals.audio.recording');
      preview.hidden = true;
      remove.hidden = true;
      return;
    }
    if (meta) {
      const length = formatDuration(meta.durationMs);
      info.textContent = meta.fileName + (length ? ' · ' + length : '');
      preview.hidden = false;
      remove.hidden = false;
    } else {
      info.textContent = '';
      preview.hidden = true;
      remove.hidden = true;
    }
  }

  async function toggleRecording() {
    // Второе нажатие останавливает запись и сохраняет её
    if (recorder) {
      const r = recorder;
      recorder = null;
      stopRecTimer();
      const blob = await r.stop();
      const stamp = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      applyAudioState(await saveGoalAudio(goalId, blob, t('goals.audio.recName') + ' ' + stamp));
      syncNow(); // копия на сервер сразу — запись перейдёт и на другой телефон (sync/voices.js)
      return;
    }
    // Играющая запись попала бы в микрофон
    stopAudio();
    try {
      recorder = await startRecording();
      applyAudioState(null);
      startRecTimer();
    } catch (err) {
      stopRecTimer();
      recorder = null;
      // Запрещено человеком или телефоном — сказать, где разрешить
      alert(t(err && err.name === 'NotAllowedError' ? 'goals.audio.micDenied' : 'goals.audio.noMic'));
    }
  }

  async function previewAudio() {
    const rec = await getGoalAudio(goalId);
    if (!rec) return;
    stopAudio();
    audioUrl = URL.createObjectURL(rec.blob);
    audioEl = new Audio(audioUrl);
    audioEl.onended = () => stopAudio();
    // Пауза от системы (звонок) — тоже конец
    audioEl.onpause = () => stopAudio();
    audioEl.play().catch(() => stopAudio());
    preview.classList.add('qm-audio-playing');
    stop.hidden = false;
    unbindSeek = bindSeekBar(seek, audioEl, rec.durationMs || 0);
  }

  function stopAudio() {
    if (audioEl) {
      audioEl.onpause = null;
      audioEl.pause();
      audioEl.onended = null;
      audioEl.onerror = null;
      audioEl = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      audioUrl = null;
    }
    if (unbindSeek) {
      unbindSeek();
      unbindSeek = null;
    }
    preview.classList.remove('qm-audio-playing');
    stop.hidden = true;
  }

  async function removeAudio() {
    stopAudio();
    await deleteGoalAudio(goalId);
    markDeleted(goalId);
    applyAudioState(null);
    syncNow();
  }

  record.addEventListener('click', toggleRecording);
  preview.addEventListener('click', previewAudio);
  stop.addEventListener('click', stopAudio);
  remove.addEventListener('click', removeAudio);
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    applyAudioState(await saveGoalAudio(goalId, file, file.name));
    syncNow();
  });

  getGoalAudioMeta(goalId).then(applyAudioState).catch(() => {});

  /** Закрыли карточку — остановить звук и запись (запись при этом сохраняется). */
  async function close() {
    stopAudio();
    if (recorder) await toggleRecording();
  }

  return { node, close };
}

export { deleteGoalAudio, getGoalAudioMeta };
