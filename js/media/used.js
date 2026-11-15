import * as journal from '../journal/journal.js';
import * as goals from '../goals/goals.js';
import { draftPhotoIds } from '../goals/draft.js';

/* КАКИЕ СНИМКИ НУЖНЫ: фото записей и фото целей (сборка 64), а с 68 — и черновика новой цели. Остальные можно
   стирать (photos.prune) и на сервере убирать (sync/photos.js). Одно место, чтобы новый владелец снимков не потерял
   их при уборке. */
export const usedPhotoIds = () => [...journal.photoIds(), ...goals.photoIds(), ...draftPhotoIds()];
