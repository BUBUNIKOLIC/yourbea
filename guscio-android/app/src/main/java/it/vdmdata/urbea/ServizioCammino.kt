/*  IL GPS CON IL TELEFONO IN TASCA — Yourbea, 21/10/2026
    ============================================================
    Chi non vede cammina col telefono in tasca e lo schermo spento. Android
    allora smette di dare la posizione a un'app che non e' in primo piano:
    e' la stessa cosa che su iPhone faceva «sparire» l'app, e Vince l'ha
    scoperto per strada.
    L'unico modo consentito di tenere il GPS vivo e' un servizio in primo
    piano con la sua notifica. La notifica non e' un fastidio: e' il patto,
    e dice all'utente che l'app lo sta seguendo. Dice anche come fermarla.
*/

package it.vdmdata.urbea

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

class ServizioCammino : Service() {

  companion object { private const val CANALE = "yourbea-cammino"; private const val AVVISO = 41 }

  override fun onBind(i: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    if (Build.VERSION.SDK_INT >= 26) {
      val c = NotificationChannel(CANALE, "Yourbea ti accompagna", NotificationManager.IMPORTANCE_LOW)
      c.setShowBadge(false)
      (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(c)
    }
  }

  override fun onStartCommand(i: Intent?, bandiere: Int, id: Int): Int {
    val apri = PendingIntent.getActivity(this, 0, Intent(this, Guscio::class.java),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    /* IL TASTO PER CHIUDERLA. La sorella di Vince, il 22/10, non ha
       trovato il modo di chiudere l'app e l'ha disinstallata. Una
       notifica fissa senza una via d'uscita e' una trappola: qui c'e'. */
    val chiudi = PendingIntent.getActivity(this, 1,
      Intent(this, Guscio::class.java).setAction("it.vdmdata.urbea.CHIUDI")
        .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val avviso: Notification = Notification.Builder(this, CANALE)
      .setContentTitle(getString(R.string.cammino_titolo))
      .setContentText(getString(R.string.cammino_testo))
      .setSmallIcon(android.R.drawable.ic_menu_mylocation)
      .setContentIntent(apri)
      .addAction(Notification.Action.Builder(null, "Chiudi Yourbea", chiudi).build())
      .setOngoing(true)
      .build()
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(AVVISO, avviso, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
    } else {
      startForeground(AVVISO, avviso)
    }
    return START_STICKY
  }
}
