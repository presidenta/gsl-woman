package space.coreviaflow.gslwoman.plugin;

import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Будильник на весь экран (как в «Кванте»): поверх блокировки, звук будильника по кругу, вибрация. «Открыть» —
 * в приложение, «Готово» — закрыть. Звук сам смолкает через три минуты. Разметка собрана кодом — своих ресурсов
 * экран не требует. Цвета — GSL Woman+: слива и розовое золото.
 */
public class GslAlarmActivity extends Activity {
    private static final long RING_MS = 3 * 60 * 1000;
    private MediaPlayer player;
    private Vibrator vibrator;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private String key;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        build(getIntent());
        ring();
        handler.postDelayed(this::quiet, RING_MS);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        build(intent);
    }

    private int dp(float v) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()));
    }

    private Button button(String text, boolean gold) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setTextColor(gold ? Color.parseColor("#150c11") : Color.parseColor("#efc4a6"));
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(dp(28));
        if (gold) bg.setColors(new int[] { Color.parseColor("#f6d3bb"), Color.parseColor("#d39079") });
        else bg.setStroke(dp(1), Color.parseColor("#efc4a6"));
        if (gold) bg.setOrientation(GradientDrawable.Orientation.LEFT_RIGHT);
        b.setBackground(bg);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(56));
        lp.topMargin = dp(12);
        b.setLayoutParams(lp);
        return b;
    }

    private void build(Intent intent) {
        key = intent.getStringExtra("key");
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(dp(28), dp(40), dp(28), dp(40));
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
            new int[] { Color.parseColor("#2a1520"), Color.parseColor("#150c11") });
        root.setBackground(bg);

        TextView brand = new TextView(this);
        brand.setText("GSL Woman+");
        brand.setTextColor(Color.parseColor("#c98a70"));
        brand.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        brand.setLetterSpacing(0.15f);
        brand.setGravity(Gravity.CENTER);

        TextView head = new TextView(this);
        head.setText(title == null ? "" : title);
        head.setTextColor(Color.parseColor("#f6dcc4"));
        head.setTextSize(TypedValue.COMPLEX_UNIT_SP, 30);
        head.setTypeface(Typeface.SERIF, Typeface.BOLD);
        head.setGravity(Gravity.CENTER);
        head.setPadding(0, dp(18), 0, dp(14));

        TextView text = new TextView(this);
        text.setText(body == null ? "" : body);
        text.setTextColor(Color.parseColor("#e8d2c4"));
        text.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        text.setLineSpacing(0, 1.25f);
        text.setGravity(Gravity.CENTER);
        text.setPadding(0, 0, 0, dp(28));

        Button open = button(GslStore.label(this, "open", "Открыть"), true);
        open.setOnClickListener(v -> {
            Intent app = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (app != null) {
                app.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                startActivity(app);
            }
            done();
        });
        Button ok = button(GslStore.label(this, "done", "Готово"), false);
        ok.setOnClickListener(v -> done());

        root.addView(brand);
        root.addView(head);
        root.addView(text);
        root.addView(open);
        root.addView(ok);
        setContentView(root);
    }

    private void ring() {
        try {
            Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            player.setDataSource(this, uri);
            player.setLooping(true);
            player.prepare();
            player.start();
        } catch (Exception e) {
            player = null; // звука нет — экран и вибрация всё равно будят
        }
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null) {
            long[] pattern = { 0, 700, 500, 700, 1200 };
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            else vibrator.vibrate(pattern, 0);
        }
    }

    private void quiet() {
        if (player != null) {
            try { player.stop(); } catch (Exception ignored) { }
            player.release();
            player = null;
        }
        if (vibrator != null) vibrator.cancel();
    }

    private void done() {
        quiet();
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null && key != null) nm.cancel(key.hashCode());
        finish();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        quiet();
        super.onDestroy();
    }
}
