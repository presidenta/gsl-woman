package space.coreviaflow.gslwoman.plugin;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Что родная часть помнит без приложения: расписание напоминаний (чтобы поставить его заново после перезагрузки
 * и найти текст сработавшего), данные виджета и подписи кнопок. Всё присылает веб-часть (js/native/native.js).
 */
final class GslStore {
    private static final String PREFS = "gsl_native";
    private static final String ITEMS = "items";
    private static final String WIDGET = "widget";
    private static final String LABELS = "labels";

    private GslStore() {}

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static void saveItems(Context c, JSONArray items) {
        prefs(c).edit().putString(ITEMS, items.toString()).apply();
    }

    static JSONArray items(Context c) {
        try {
            return new JSONArray(prefs(c).getString(ITEMS, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    /** Напоминание по номеру; нет — null. */
    static JSONObject item(Context c, String key) {
        JSONArray all = items(c);
        for (int i = 0; i < all.length(); i++) {
            JSONObject o = all.optJSONObject(i);
            if (o != null && key.equals(o.optString("key"))) return o;
        }
        return null;
    }

    static void saveWidget(Context c, JSONObject data) {
        prefs(c).edit().putString(WIDGET, data.toString()).apply();
    }

    static JSONObject widget(Context c) {
        try {
            return new JSONObject(prefs(c).getString(WIDGET, "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    static void saveLabels(Context c, JSONObject labels) {
        prefs(c).edit().putString(LABELS, labels.toString()).apply();
    }

    /** Подпись на языке женщины (присылает веб-часть); нет — запасная. */
    static String label(Context c, String name, String fallback) {
        try {
            return new JSONObject(prefs(c).getString(LABELS, "{}")).optString(name, fallback);
        } catch (Exception e) {
            return fallback;
        }
    }
}
