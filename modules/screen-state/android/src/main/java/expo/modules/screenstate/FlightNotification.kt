package expo.modules.screenstate

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build

/**
 * Notificação fixa do voo: rota e contagem regressiva até o pouso, que anda sem o app rodar.
 * A mesma notificação serve sozinha (voo sem som) ou como a do serviço do som de fundo.
 */
internal object FlightNotification {
  const val CHANNEL_ID = "voo_em_andamento"
  const val NOTIFICATION_ID = 4210

  fun build(ctx: Context, title: String, text: String, endAt: Long): Notification {
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= 26) {
      val channel = NotificationChannel(CHANNEL_ID, "Voo em andamento", NotificationManager.IMPORTANCE_LOW)
      channel.setShowBadge(false)
      channel.setSound(null, null)
      nm.createNotificationChannel(channel)
    }
    val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
    val pending = PendingIntent.getActivity(
      ctx, 0, launch,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
    val builder = if (Build.VERSION.SDK_INT >= 26) {
      Notification.Builder(ctx, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(ctx)
    }
    builder
      .setSmallIcon(ctx.applicationInfo.icon)
      .setContentTitle(title)
      .setContentText(text)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setContentIntent(pending)
      .setShowWhen(true)
      .setWhen(endAt)
      .setUsesChronometer(true)
    if (Build.VERSION.SDK_INT >= 24) builder.setChronometerCountDown(true)
    if (Build.VERSION.SDK_INT >= 26) {
      builder.setTimeoutAfter(maxOf(1000L, endAt - System.currentTimeMillis()))
    }
    if (Build.VERSION.SDK_INT >= 31) {
      // Aparece na hora, sem o atraso de 10 s das notificações de serviço em primeiro plano.
      builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
    }
    return builder.build()
  }
}
