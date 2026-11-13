package space.coreviaflow.gslwoman.plugin;

import android.Manifest;
import android.app.NotificationManager;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

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

/**
 * Мост между веб-частью GSL Woman+ (js/native/native.js) и Android:
 *  schedule — напоминания и будильники на ближайшие дни (работают и при закрытом приложении);
 *  setWidget — данные виджета на неделю; pinWidget — поставить виджет на экран;
 *  labels — подписи кнопок и каналов на языке женщины;
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
}
