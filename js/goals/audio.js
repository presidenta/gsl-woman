/* ГОЛОС К ЦЕЛИ (владелец 15.11.2026: «не пиши новый код — возьми из „Кванта“, он проверенный»). Скопировано из
   «Кванта» один в один: planner/web/js/views/space/audio.js — аудио «Дверей». Поменяно только «дверь» → «цель» и имя
   базы.

   Файлы лежат только на устройстве, в IndexedDB этого приложения (как у дверей «Кванта»). На сервер не уходит
   ничего, лимита по размеру нет — упирается только в свободное место на телефоне. Каждая цель хранит свою запись
   отдельно, привязка идёт по неизменному id цели, поэтому правка текста цели аудио не теряет. */

const DB_NAME = 'gsl-goal-audio';
const DB_VERSION = 1;
const STORE = 'goalAudio';

let dbPromise = null;

function openDb() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'goalId' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return dbPromise;
}

function runTransaction(mode, action) {
    return openDb().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    }));
}

/**
 * Длительность записи. Браузер умеет её сказать, только проиграв метаданные,
 * поэтому поднимаем временный <audio> и ждём их.
 * @param {Blob} blob
 * @returns {Promise<number>} длительность в миллисекундах, 0 если неизвестна
 */
export function readDurationMs(blob) {
    return new Promise(resolve => {
        const url = URL.createObjectURL(blob);
        const probe = document.createElement('audio');
        let done = false;

        const finish = ms => {
            if (done) return;
            done = true;
            URL.revokeObjectURL(url);
            resolve(ms);
        };

        /* Запись с микрофона (webm из MediaRecorder) не несёт длительности в
           заголовке: браузер говорит «бесконечность». Узнать её можно, только
           пройдя файл до конца, — просим перейти далеко за конец, браузер
           доходит до последнего кадра и сообщает настоящую длительность. */
        const known = () => Number.isFinite(probe.duration) && probe.duration > 0;
        probe.preload = 'metadata';
        probe.onloadedmetadata = () => {
            if (known()) finish(Math.round(probe.duration * 1000));
            else probe.currentTime = Number.MAX_SAFE_INTEGER;
        };
        probe.ondurationchange = () => {
            if (known()) finish(Math.round(probe.duration * 1000));
        };
        probe.onerror = () => finish(0);

        // Не ждём вечно: длинную запись (15 минут) браузер проходит за доли
        // секунды, десять секунд — с большим запасом.
        setTimeout(() => finish(0), 10000);

        probe.src = url;
    });
}

/** Длительность в вид «1:05». */
export function formatDuration(ms) {
    if (!ms || ms < 0) return '';
    const total = Math.round(ms / 1000);
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return min + ':' + String(sec).padStart(2, '0');
}

/**
 * Сохранить запись у цели. Прежняя запись этой цели заменяется.
 * @param {string} goalId
 * @param {Blob} blob
 * @param {string} fileName
 * @returns {Promise<object>} сохранённые метаданные
 */
export async function saveGoalAudio(goalId, blob, fileName) {
    const durationMs = await readDurationMs(blob);
    const record = {
        goalId,
        blob,
        fileName: fileName || 'audio',
        durationMs,
        mimeType: blob.type || 'audio/webm',
        createdAt: Date.now()
    };

    await runTransaction('readwrite', store => store.put(record));
    return describe(record);
}

/** Вернуть запись с сервера на этот телефон как была (sync/voices.js): та же дата — тот же номер версии. */
export async function restoreGoalAudio(goalId, blob, { fileName, durationMs, createdAt }) {
    const record = {
        goalId,
        blob,
        fileName: fileName || 'audio',
        durationMs: durationMs || 0,
        mimeType: blob.type || 'audio/webm',
        createdAt
    };
    await runTransaction('readwrite', store => store.put(record));
    return describe(record);
}

/** Метаданные без самого файла — для списка целей. */
function describe(record) {
    if (!record) return null;
    return {
        fileName: record.fileName,
        durationMs: record.durationMs,
        mimeType: record.mimeType,
        createdAt: record.createdAt
    };
}

/**
 * Запись цели целиком, вместе с файлом.
 * @returns {Promise<{blob: Blob, fileName: string, durationMs: number,
 *                    mimeType: string, createdAt: number} | null>}
 */
export async function getGoalAudio(goalId) {
    if (!goalId) return null;
    try {
        const record = await runTransaction('readonly', store => store.get(goalId));
        if (!record || !record.blob) return null;
        return record;
    } catch (err) {
        console.error('[goals/audio] чтение не удалось:', err);
        return null;
    }
}

/** Только метаданные: есть ли запись, как называется, сколько длится. */
export async function getGoalAudioMeta(goalId) {
    const record = await getGoalAudio(goalId);
    // Записи до выкладки 221 сохранены без длительности — узнаём её один раз
    // и дописываем, дальше она читается сразу
    // (не вышло — помечаем и больше не ждём на каждом открытии настройки)
    if (record && !record.durationMs && !record.durationProbed) {
        record.durationMs = await readDurationMs(record.blob);
        record.durationProbed = true;
        await runTransaction('readwrite', store => store.put(record)).catch(() => {});
    }
    return describe(record);
}

/** Метаданные сразу для списка целей: { goalId: meta | null }. */
export async function getAllAudioMeta(goalIds) {
    const result = {};
    for (const id of goalIds) {
        result[id] = await getGoalAudioMeta(id);
    }
    return result;
}

/** Удалить запись цели. */
export async function deleteGoalAudio(goalId) {
    if (!goalId) return;
    try {
        await runTransaction('readwrite', store => store.delete(goalId));
    } catch (err) {
        console.error('[goals/audio] удаление не удалось:', err);
    }
}

/** Поддерживает ли устройство запись с микрофона. */
export function canRecord() {
    return Boolean(
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia &&
        typeof MediaRecorder !== 'undefined'
    );
}

/**
 * Диктофон. Возвращает объект с одним методом stop(), который отдаёт Blob.
 * Дорожка микрофона закрывается сразу после остановки, иначе индикатор
 * записи остаётся висеть в статус-баре телефона.
 * @returns {Promise<{stop: () => Promise<Blob>}>}
 */
export async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];

    // Тип выбирает браузер: Chrome отдаёт webm, Safari — mp4.
    // GSL: голос сжимается до 32 кбит/с (минута — около 240 КБ) — копия на сервере и переход между телефонами
    // (sync/voices.js); речь при этом слышна чисто. В «Кванте» — без этой строки.
    const recorder = new MediaRecorder(stream, { audioBitsPerSecond: 32000 });
    recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    recorder.start();

    return {
        stop() {
            return new Promise(resolve => {
                recorder.onstop = () => {
                    stream.getTracks().forEach(track => track.stop());
                    resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
                };
                if (recorder.state !== 'inactive') recorder.stop();
                else resolve(new Blob(chunks, { type: 'audio/webm' }));
            });
        }
    };
}
