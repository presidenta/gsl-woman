/* Веб-сторона плагина — пустая, как у «Кванта» (planner/android-alarm-plugin/src/index.js): веб-часть приезжает
   с сайта, и нативную часть она берёт из window.Capacitor.Plugins.GslNative (js/native/native.js в GSL Woman+).
   Файл существует для npm: на него смотрит поле main. */
export const GslNative = (globalThis.Capacitor?.Plugins?.GslNative) || null;
