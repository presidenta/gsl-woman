package space.coreviaflow.gslwoman.plugin;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** После перезагрузки, обновления приложения и перевода часов Android забывает будильники — ставим их заново
    из сохранённого расписания и перерисовываем виджет. */
public class GslBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        GslScheduler.rearm(c);
        GslWidget.refresh(c);
    }
}
