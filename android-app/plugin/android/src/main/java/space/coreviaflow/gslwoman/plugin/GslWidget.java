package space.coreviaflow.gslwoman.plugin;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Виджет GSL Woman+ на экране телефона. Данные на неделю вперёд присылает приложение (setWidget): по дате
 * виджет сам выбирает сегодняшний день — поэтому новый день наступает на виджете и без открытия приложения
 * (система обновляет его раз в полчаса, updatePeriodMillis). Нажатие — открыть приложение.
 */
public class GslWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, render(c));
    }

    /** Перерисовать все виджеты (пришли новые данные). */
    static void refresh(Context c) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(c);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(c, GslWidget.class));
        for (int id : ids) mgr.updateAppWidget(id, render(c));
    }

    private static JSONObject today(Context c) {
        JSONObject data = GslStore.widget(c);
        JSONArray days = data.optJSONArray("days");
        if (days == null || days.length() == 0) return null;
        String iso = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        JSONObject last = null;
        for (int i = 0; i < days.length(); i++) {
            JSONObject d = days.optJSONObject(i);
            if (d == null) continue;
            if (iso.equals(d.optString("date"))) return d;
            if (d.optString("date").compareTo(iso) < 0) last = d;
        }
        return last;
    }

    static RemoteViews render(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.gsl_widget);
        JSONObject d = today(c);
        if (d == null) {
            v.setTextViewText(R.id.gsl_w_title, GslStore.label(c, "widgetEmptyTitle", "GSL Woman+"));
            v.setTextViewText(R.id.gsl_w_body, GslStore.label(c, "widgetEmpty", "Откройте приложение — здесь появится день программы."));
        } else {
            v.setTextViewText(R.id.gsl_w_eyebrow, d.optString("eyebrow", "GSL Woman+"));
            v.setTextViewText(R.id.gsl_w_title, d.optString("title", ""));
            JSONArray lines = d.optJSONArray("lines");
            StringBuilder sb = new StringBuilder();
            if (lines != null) {
                for (int i = 0; i < lines.length(); i++) {
                    if (sb.length() > 0) sb.append('\n');
                    sb.append(lines.optString(i));
                }
            }
            v.setTextViewText(R.id.gsl_w_body, sb.toString());
        }
        Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (open != null) {
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            v.setOnClickPendingIntent(R.id.gsl_w_root, PendingIntent.getActivity(c, 11, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }
        return v;
    }
}
