import { isApp, call } from '../native/native.js';

/* ОТДАТЬ ФАЙЛ НА ПОЧТУ ЧЕЛОВЕКА — с телефона, наш сервер файл не видит и не хранит (владелец 15.11.2026: «чтобы
   человек сохранял на свою почту, а мы не грузили сервер»).
   - Приложение для Android: родная часть (GslNativePlugin.shareFile) кладёт файл во временную папку и открывает
     «Отправить» Android — почта сразу с адресом человека, темой и файлом.
   - Сайт на телефоне: «Поделиться» браузера с файлом — человек выбирает почту.
   - Компьютер и браузеры без «Поделиться» файлом: файл скачивается, человек прикрепляет его к письму сам.
   → 'shared' | 'cancelled' | 'downloaded' */

async function toBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

export async function deliver({ blob, name, email = '', subject = '', text = '' }) {
  if (isApp()) {
    const r = await call('shareFile', { name, mime: 'application/json', data: await toBase64(blob), email, subject, text });
    if (r?.ok) return 'shared';
  }
  const file = typeof File === 'function' ? new File([blob], name, { type: 'application/json' }) : null;
  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: subject, text });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
      // «Поделиться» отказал — скачать
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'downloaded';
}
