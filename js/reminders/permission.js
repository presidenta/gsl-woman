/* РАЗРЕШЕНИЕ НА УВЕДОМЛЕНИЯ. Спрашиваем только по нажатию кнопки: браузеры (и iPhone прежде всех)
   отклоняют запрос, сделанный без участия человека, и потом больше не показывают окно. */

export function supported() {
  return 'Notification' in globalThis && 'serviceWorker' in navigator;
}

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export function state() {
  return supported() ? Notification.permission : 'unsupported';
}

export async function request() {
  if (!supported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}
