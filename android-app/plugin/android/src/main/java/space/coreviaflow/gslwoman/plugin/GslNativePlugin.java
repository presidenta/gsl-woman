package space.coreviaflow.gslwoman.plugin;

import android.Manifest;
import android.app.ActivityManager;
import android.app.Activity;
import android.app.NotificationManager;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;

/**
 * Мост между веб-частью GSL Woman+ (js/native/native.js) и Android:
 *  schedule — напоминания и будильники на ближайшие дни (работают и при закрытом приложении);
 *  setWidget — данные виджета на неделю; pinWidget — поставить виджет на экран;
 *  labels — подписи кнопок и каналов на языке женщины;
 *  lockScreen / unlockScreen / lockState — закрепление экрана на время живой игры ребёнка (детский кабинет,
 *  js/kids/nophone.js): телефон отдыхает, звонки работают; вышли из закрепления — игра это замечает;
 *  status / requestNotifications / openSettings — что разрешено и где это включить.
 */
@CapacitorPlugin(
    name = "GslNative",
    permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) }
)
public class GslNativePlugin extends Plugin {

    @PluginMethod
    public void schedule(PluginCall call) {
        JSArray items = call.getArray("items");
        try {
            GslScheduler.apply(getContext(), items == null ? new JSONArray() : new JSONArray(items.toString()));
            call.resolve();
        } catch (Exception e) {
            call.reject("schedule: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setWidget(PluginCall call) {
        GslStore.saveWidget(getContext(), call.getData());
        GslWidget.refresh(getContext());
        call.resolve();
    }

    @PluginMethod
    public void labels(PluginCall call) {
        GslStore.saveLabels(getContext(), call.getData());
        GslAlarmReceiver.channels(getContext());
        call.resolve();
    }

    @PluginMethod
    public void pinWidget(PluginCall call) {
        Context c = getContext();
        JSObject ret = new JSObject();
        boolean ok = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager mgr = c.getSystemService(AppWidgetManager.class);
            if (mgr != null && mgr.isRequestPinAppWidgetSupported()) {
                ok = mgr.requestPinAppWidget(new ComponentName(c, GslWidget.class), null, null);
            }
        }
        ret.put("requested", ok);
        call.resolve(ret);
    }

    @PluginMethod
    public void status(PluginCall call) {
        Context c = getContext();
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        JSObject ret = new JSObject();
        ret.put("notifications", nm != null && nm.areNotificationsEnabled());
        ret.put("exact", GslScheduler.canExact(c));
        ret.put("fullScreen", Build.VERSION.SDK_INT < 34 || (nm != null && nm.canUseFullScreenIntent()));
        AppWidgetManager mgr = AppWidgetManager.getInstance(c);
        ret.put("widgets", mgr.getAppWidgetIds(new ComponentName(c, GslWidget.class)).length);
        ret.put("pinSupported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && c.getSystemService(AppWidgetManager.class) != null
            && c.getSystemService(AppWidgetManager.class).isRequestPinAppWidgetSupported());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationsAnswered");
    }

    @PermissionCallback
    private void notificationsAnswered(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("notifications") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    /** Открыть нужный экран настроек телефона: what = exact | fullScreen | notifications. */
    @PluginMethod
    public void openSettings(PluginCall call) {
        Context c = getContext();
        String what = call.getString("what", "notifications");
        Intent i;
        if ("exact".equals(what) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + c.getPackageName()));
        } else if ("fullScreen".equals(what) && Build.VERSION.SDK_INT >= 34) {
            i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + c.getPackageName()));
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, c.getPackageName());
        } else {
            i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + c.getPackageName()));
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            c.startActivity(i);
        } catch (Exception e) {
            c.startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + c.getPackageName()))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        }
        call.resolve();
    }

    /* ЖИВАЯ ИГРА РЕБЁНКА — ТЕЛЕФОН ЗАКРЕПЛЁН (владелец 14.11.2026: «начать игру — и телефон закрыт, кроме звонков»).
       startLockTask без прав администратора устройства — обычное «закрепление экрана» Android: система сама
       спрашивает согласие, другие приложения и шторка закрыты, звонки работают. Выйти можно системным жестом —
       веб-часть каждые несколько секунд спрашивает lockState и считает такой выход «телефон брали». */
    /* Окно приложения — через WebView: getActivity() отдаёт AppCompatActivity, которого нет в пути сборки плагина. */
    private Activity window() {
        Context c = getBridge() == null || getBridge().getWebView() == null ? null : getBridge().getWebView().getContext();
        return c instanceof Activity ? (Activity) c : null;
    }

    @PluginMethod
    public void lockScreen(PluginCall call) {
        Activity activity = window();
        if (activity == null) { call.reject("lockScreen: нет окна"); return; }
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                activity.startLockTask();
                call.resolve();
            } catch (Exception e) {
                call.reject("lockScreen: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void unlockScreen(PluginCall call) {
        Activity activity = window();
        if (activity == null) { call.resolve(); return; }
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                activity.stopLockTask();
            } catch (Exception e) {
                // закрепления уже нет — ничего не делаем
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void lockState(PluginCall call) {
        ActivityManager am = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
        boolean locked;
        if (am == null) {
            locked = false;
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            locked = am.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE;
        } else {
            locked = am.isInLockTaskMode();
        }
        JSObject ret = new JSObject();
        ret.put("locked", locked);
        call.resolve(ret);
    }

    /* КОПИЯ НА ПОЧТУ (веб-часть js/backup/deliver.js, владелец 15.11.2026: «чтобы человек сохранял всё на свою почту»).
       Файл копии приходит строкой base64, ложится во временную папку приложения (cache/gsl-backup — прежние копии
       там стираются) и уходит в «Отправить» Android: почта открывается сразу с адресом человека, темой и файлом.
       Ссылку на файл даёт FileProvider оболочки Capacitor (адрес <пакет>.fileprovider, папка cache — в её
       file_paths.xml): своих ресурсов не добавляем — номера рисунков виджета остаются прежними. */
    @PluginMethod
    public void shareFile(PluginCall call) {
        String data = call.getString("data");
        if (data == null || data.isEmpty()) { call.reject("shareFile: пусто"); return; }
        String name = call.getString("name", "GSL.json").replaceAll("[^A-Za-z0-9._-]", "_");
        String mime = call.getString("mime", "application/json");
        String email = call.getString("email", "");
        String subject = call.getString("subject", "");
        String text = call.getString("text", "");
        Context ctx = getContext();
        try {
            File dir = new File(ctx.getCacheDir(), "gsl-backup");
            if (!dir.exists() && !dir.mkdirs()) { call.reject("shareFile: папка"); return; }
            File[] old = dir.listFiles();
            if (old != null) for (File f : old) f.delete();
            File file = new File(dir, name);
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(Base64.decode(data, Base64.DEFAULT));
            }
            Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", file);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(mime);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            if (email != null && !email.isEmpty()) send.putExtra(Intent.EXTRA_EMAIL, new String[] { email });
            send.putExtra(Intent.EXTRA_SUBJECT, subject);
            send.putExtra(Intent.EXTRA_TEXT, text);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(send, subject);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            ctx.startActivity(chooser);
            JSObject ret = new JSObject();
            ret.put("ok", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("shareFile: " + e.getMessage());
        }
    }
}
