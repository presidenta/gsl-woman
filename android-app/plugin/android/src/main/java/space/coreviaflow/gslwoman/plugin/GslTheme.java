package space.coreviaflow.gslwoman.plugin;

import android.content.Context;
import android.graphics.Color;

/**
 * Цвета части GSL (W+M)⁺ для родных экранов — виджета и будильника (владелец 13.11.2026: у женщин розовое золото на
 * сливе, у мужчин — классическое золото на графите, как на сайтах). Какая часть, веб-часть присылает подписью side
 * (js/native/native.js → labels); нет её — женская, как было до мужской части. Цвета — те же, что в токенах сайта
 * (styles/tokens.css и styles/side-man.css).
 */
final class GslTheme {
    final boolean man;
    final int bgTop, bgBottom, brand, head, text, gold, goldLight, goldDeep, onGold;
    /** Фон виджета: drawable своей части (у мужской — в конце алфавита, чтобы номера прежних ресурсов не сдвинулись). */
    final int widgetBg;

    private GslTheme(boolean man) {
        this.man = man;
        if (man) {
            bgTop = Color.parseColor("#1a1814");
            bgBottom = Color.parseColor("#0a0a0d");
            brand = Color.parseColor("#b8902f");
            head = Color.parseColor("#f6e7b8");
            text = Color.parseColor("#e6dcc2");
            gold = Color.parseColor("#e3c77c");
            goldLight = Color.parseColor("#fff1bf");
            goldDeep = Color.parseColor("#c8922f");
            onGold = Color.parseColor("#1d1606");
            widgetBg = R.drawable.zz_gsl_widget_man;
        } else {
            bgTop = Color.parseColor("#2a1520");
            bgBottom = Color.parseColor("#150c11");
            brand = Color.parseColor("#c98a70");
            head = Color.parseColor("#f6dcc4");
            text = Color.parseColor("#e8d2c4");
            gold = Color.parseColor("#efc4a6");
            goldLight = Color.parseColor("#f6d3bb");
            goldDeep = Color.parseColor("#d39079");
            onGold = Color.parseColor("#150c11");
            widgetBg = R.drawable.gsl_widget_bg;
        }
    }

    private static final GslTheme WOMAN = new GslTheme(false);
    private static final GslTheme MAN = new GslTheme(true);

    static GslTheme of(Context c) {
        return "man".equals(GslStore.label(c, "side", "woman")) ? MAN : WOMAN;
    }

    /** Название своей части: GSL Woman+ или GSL Man+ (присылает веб-часть подписью brand). */
    static String brand(Context c) {
        return GslStore.label(c, "brand", of(c).man ? "GSL Man+" : "GSL Woman+");
    }
}
