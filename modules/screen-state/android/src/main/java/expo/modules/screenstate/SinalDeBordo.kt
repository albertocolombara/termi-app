package expo.modules.screenstate

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.PowerManager

/**
 * Sinal de apertar cintos e aviso de pouso tocados pelo próprio app, como um despertador.
 *
 * Por quê (26/11/2026, Samsung M35, Android 14+): o som do canal da notificação não tocou, nem no
 * silencioso nem no modo normal, com o canal certo (som gravado, uso ALARM) e o volume de alarme em
 * 11/15. Despertadores não dependem do som da notificação: tocam o áudio eles mesmos na hora do alarme.
 *
 * Como: AlarmManager.setAlarmClock (o mesmo alarme exato das notificações) chama [Receptor], que toca o
 * arquivo de res/raw com MediaPlayer no volume de alarme e pede foco de áudio passageiro (outros sons
 * baixam enquanto toca). A notificação continua aparecendo, num canal sem som.
 *
 * "Não perturbe" é respeitado: não toca em silêncio total, nem em "só prioridade" sem alarmes liberados.
 * Os alarmes não sobrevivem a reiniciar o aparelho; o app agenda de novo ao abrir.
 */
object SinalDeBordo {
  private const val PREFS = "termi_sinais"
  private const val CHAVE_IDS = "ids"
  private const val CHAVE_TOCADOS = "tocados"
  private const val EXTRA_SOM = "som"
  private const val EXTRA_ID = "id"
  private const val ACAO = "expo.modules.screenstate.SINAL_DE_BORDO"

  private fun intencao(ctx: Context, id: Int, som: String): PendingIntent {
    val i = Intent(ctx, Receptor::class.java).setAction(ACAO).putExtra(EXTRA_SOM, som).putExtra(EXTRA_ID, id)
    return PendingIntent.getBroadcast(ctx, id, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  /** Agenda o som `som` (nome em res/raw, sem extensão) para `emMs`. Retorna como foi agendado. */
  fun agendar(ctx: Context, id: Int, emMs: Long, som: String): String {
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pi = intencao(ctx, id, som)
    val modo = try {
      if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, emMs, pi)
        "inexato"
      } else {
        am.setAlarmClock(AlarmManager.AlarmClockInfo(emMs, null), pi)
        "exato"
      }
    } catch (_: SecurityException) {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, emMs, pi)
      "inexato"
    }
    val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val ids = (prefs.getStringSet(CHAVE_IDS, emptySet()) ?: emptySet()).toMutableSet()
    ids += "$id:$som"
    prefs.edit().putStringSet(CHAVE_IDS, ids).apply()
    return modo
  }

  fun cancelar(ctx: Context, id: Int) {
    val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val ids = (prefs.getStringSet(CHAVE_IDS, emptySet()) ?: emptySet()).toMutableSet()
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    ids.filter { it.substringBefore(':') == id.toString() }.forEach {
      am.cancel(intencao(ctx, id, it.substringAfter(':')))
      ids.remove(it)
    }
    prefs.edit().putStringSet(CHAVE_IDS, ids).apply()
  }

  fun cancelarTodos(ctx: Context) {
    val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    (prefs.getStringSet(CHAVE_IDS, emptySet()) ?: emptySet()).forEach {
      val id = it.substringBefore(':').toIntOrNull() ?: return@forEach
      am.cancel(intencao(ctx, id, it.substringAfter(':')))
    }
    prefs.edit().putStringSet(CHAVE_IDS, emptySet()).apply()
  }

  /** Últimos sinais (diagnóstico): "hora som resultado", do mais novo ao mais velho. */
  fun tocados(ctx: Context): String =
    ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(CHAVE_TOCADOS, "") ?: ""

  private fun registrar(ctx: Context, texto: String) {
    val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val hora = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.ROOT).format(java.util.Date())
    val linhas = listOf("$hora $texto") + (prefs.getString(CHAVE_TOCADOS, "") ?: "").lines().filter { it.isNotBlank() }
    prefs.edit().putString(CHAVE_TOCADOS, linhas.take(10).joinToString("\n")).apply()
  }

  private fun naoPerturbeBloqueia(ctx: Context): Boolean {
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    return when (nm.currentInterruptionFilter) {
      NotificationManager.INTERRUPTION_FILTER_NONE -> true
      NotificationManager.INTERRUPTION_FILTER_PRIORITY ->
        (nm.notificationPolicy.priorityCategories and NotificationManager.Policy.PRIORITY_CATEGORY_ALARMS) == 0
      else -> false
    }
  }

  class Receptor : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
      val som = intent.getStringExtra(EXTRA_SOM) ?: return
      val id = intent.getIntExtra(EXTRA_ID, 0)
      cancelar(ctx, id)
      if (naoPerturbeBloqueia(ctx)) {
        registrar(ctx, "$som nao tocou: nao perturbe")
        return
      }
      // O som de fundo do voo já toca os próprios sinais por cima dele.
      if (FlightSoundService.instance != null) {
        registrar(ctx, "$som nao tocou: som de fundo tocando")
        return
      }
      val raw = ctx.resources.getIdentifier(som, "raw", ctx.packageName)
      if (raw == 0) {
        registrar(ctx, "$som nao tocou: arquivo ausente")
        return
      }
      val pendente = goAsync()
      val wake = (ctx.getSystemService(Context.POWER_SERVICE) as PowerManager)
        .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "termi:sinal")
        .apply { acquire(15_000) }
      val atributos = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
      val audio = ctx.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val foco = if (Build.VERSION.SDK_INT >= 26) {
        AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK).setAudioAttributes(atributos).build()
      } else {
        null
      }
      var terminou = false
      fun terminar(player: MediaPlayer?) {
        if (terminou) return
        terminou = true
        try { player?.release() } catch (_: Exception) {}
        if (foco != null && Build.VERSION.SDK_INT >= 26) audio.abandonAudioFocusRequest(foco)
        if (wake.isHeld) wake.release()
        pendente.finish()
      }
      try {
        if (foco != null && Build.VERSION.SDK_INT >= 26) audio.requestAudioFocus(foco)
        val afd = ctx.resources.openRawResourceFd(raw)
        val player = MediaPlayer()
        player.setAudioAttributes(atributos)
        player.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
        afd.close()
        player.setOnCompletionListener { terminar(it) }
        player.setOnErrorListener { mp, what, _ ->
          registrar(ctx, "$som erro do player $what")
          terminar(mp)
          true
        }
        player.prepare()
        player.start()
        registrar(ctx, "$som tocou (alarme ${audio.getStreamVolume(AudioManager.STREAM_ALARM)}/${audio.getStreamMaxVolume(AudioManager.STREAM_ALARM)})")
        // Segurança: o receptor tem ~10 s; os sons têm 3 s e 6 s.
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({ terminar(player) }, 9_000)
      } catch (e: Exception) {
        registrar(ctx, "$som erro: ${e.javaClass.simpleName}")
        terminar(null)
      }
    }
  }
}
