package space.coreviaflow.gslwoman.plugin;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Ставит напоминания в будильник Android. setAlarmClock — самый надёжный способ: система будит телефон ровно в
 * срок и в режиме сна, показывает значок будильника. Нет права на точные будильники — setAndAllowWhileIdle
 * (сработает, но может опоздать на несколько минут).
 */
final class GslScheduler {
    private GslScheduler() {}

    private static PendingIntent fire(Context c, String key, int flags) {
        Intent i = new Intent(c, GslAlarmReceiver.class).setAction("gsl.alarm." + key).putExtra("key", key);
        return PendingIntent.getBroadcast(c, key.hashCode(), i, flags | PendingIntent.FLAG_IMMUTABLE);
    }

    static boolean canExact(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || (am != null && am.canScheduleExactAlarms());
    }

    /** Снять всё прежнее и поставить новое расписание; в прошлом — пропускается. */
    static void apply(Context c, JSONArray fresh) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        JSONArray old = GslStore.items(c);
        for (int i = 0; i < old.length(); i++) {
            JSONObject o = old.optJSONObject(i);
            if (o == null) continue;
            PendingIntent pi = fire(c, o.optString("key"), PendingIntent.FLAG_NO_CREATE);
            if (pi != null) {
                am.cancel(pi);
                pi.cancel();
            }
        }
        GslStore.saveItems(c, fresh);
        arm(c, am, fresh);
    }

    /** Поставить заново то, что уже сохранено (после перезагрузки). */
    static void rearm(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am != null) arm(c, am, GslStore.items(c));
    }

    private static void arm(Context c, AlarmManager am, JSONArray items) {
        long now = System.currentTimeMillis();
        Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        PendingIntent show = open == null ? null
            : PendingIntent.getActivity(c, 7, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        boolean exact = canExact(c);
        for (int i = 0; i < items.length(); i++) {
            JSONObject o = items.optJSONObject(i);
            if (o == null) continue;
            long at = o.optLong("at", 0);
            if (at <= now) continue;
            PendingIntent pi = fire(c, o.optString("key"), PendingIntent.FLAG_UPDATE_CURRENT);
            try {
                if (exact) am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), pi);
                else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            } catch (SecurityException e) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            }
        }
    }
}
