package space.coreviaflow.gslwoman.plugin;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import org.json.JSONObject;

/**
 * Сработало напоминание. loud — будильник: уведомление с полноэкранным окном (GslAlarmActivity поверх блокировки,
 * звук будильника, вибрация). Иначе — обычное уведомление. Нажатие на уведомление открывает приложение.
 */
public class GslAlarmReceiver extends BroadcastReceiver {
    static final String CH_REMIND = "gsl_remind";
    static final String CH_ALARM = "gsl_alarm";

    @Override
    public void onReceive(Context c, Intent intent) {
        String key = intent.getStringExtra("key");
        if (key == null) return;
        JSONObject item = GslStore.item(c, key);
        if (item == null) return;
        show(c, key, item.optString("title", "GSL Woman+"), item.optString("body", ""), item.optBoolean("loud", false));
    }

    static void channels(Context c) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel remind = new NotificationChannel(CH_REMIND,
            GslStore.label(c, "channelRemind", "Напоминания"), NotificationManager.IMPORTANCE_DEFAULT);
        nm.createNotificationChannel(remind);
        NotificationChannel alarm = new NotificationChannel(CH_ALARM,
            GslStore.label(c, "channelAlarm", "Будильник"), NotificationManager.IMPORTANCE_HIGH);
        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        alarm.setSound(sound, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        alarm.enableVibration(true);
        alarm.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(alarm);
    }

    static PendingIntent openApp(Context c, int code) {
        Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (open == null) open = new Intent();
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(c, code, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void show(Context c, String key, String title, String body, boolean loud) {
        channels(c);
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        int id = key.hashCode();
        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(c, loud ? CH_ALARM : CH_REMIND)
            : new Notification.Builder(c);
        b.setSmallIcon(loud ? android.R.drawable.ic_lock_idle_alarm : android.R.drawable.ic_popup_reminder)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new Notification.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(openApp(c, id));
        if (loud) {
            Intent full = new Intent(c, GslAlarmActivity.class)
                .putExtra("key", key).putExtra("title", title).putExtra("body", body)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
            PendingIntent fullPi = PendingIntent.getActivity(c, id, full,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            b.setCategory(Notification.CATEGORY_ALARM).setFullScreenIntent(fullPi, true).setOngoing(true);
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) b.setPriority(Notification.PRIORITY_MAX);
        }
        try {
            nm.notify(id, b.build());
        } catch (SecurityException e) {
            // Уведомления запрещены в настройках телефона — показать нечего; раздел «Виджет и будильник» об этом скажет
        }
    }
}
