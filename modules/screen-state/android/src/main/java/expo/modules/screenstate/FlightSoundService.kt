package expo.modules.screenstate

import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer

/**
 * Som de fundo do voo com a tela bloqueada e o app fechado, sem controle de mídia do Android
 * (pedido do Alberto em 20/11/2026: como no FocusFlight, pausar e trocar só pelo app).
 *
 * É um serviço em primeiro plano do tipo mediaPlayback, mas sem MediaSession: por isso o Android
 * não mostra o player (pausar, voltar, duração). A notificação é a do voo, com a contagem até o pouso.
 *
 * - Loop sem corte (ExoPlayer, REPEAT_MODE_ONE) e foco de áudio do próprio ExoPlayer: uma ligação
 *   pausa e devolve o som; outro app de música pausa o som até o Termi ser aberto de novo.
 * - Entra com fade e para sozinho no horário do pouso, com fade, mesmo com o app fechado.
 */
class FlightSoundService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var player: ExoPlayer? = null
  private var targetVolume = 1f
  private var fade: Runnable? = null
  private var lastStartId = 0
  private val landing = Runnable { fadeTo(0f, FADE_OUT_MS) { finish(removeNotification = true) } }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    instance = this
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    lastStartId = startId
    val uri = intent?.getStringExtra(EXTRA_URI)
    val endAt = intent?.getLongExtra(EXTRA_END_AT, 0L) ?: 0L
    val title = intent?.getStringExtra(EXTRA_TITLE) ?: ""
    val text = intent?.getStringExtra(EXTRA_TEXT) ?: ""
    // startForegroundService exige startForeground logo, mesmo se não houver o que tocar.
    val notification = FlightNotification.build(this, title, text, endAt)
    if (Build.VERSION.SDK_INT >= 29) {
      startForeground(FlightNotification.NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
    } else {
      startForeground(FlightNotification.NOTIFICATION_ID, notification)
    }
    if (uri == null || endAt <= System.currentTimeMillis()) {
      finish(removeNotification = uri != null)
      return START_NOT_STICKY
    }
    val volume = intent?.getFloatExtra(EXTRA_VOLUME, 1f) ?: 1f
    val fadeInMs = intent?.getLongExtra(EXTRA_FADE_IN_MS, 0L) ?: 0L
    play(uri, volume, fadeInMs, endAt)
    return START_NOT_STICKY
  }

  private fun play(uri: String, volume: Float, fadeInMs: Long, endAt: Long) {
    handler.removeCallbacks(landing)
    cancelFade()
    player?.release()
    targetVolume = volume
    val attributes = AudioAttributes.Builder()
      .setUsage(C.USAGE_MEDIA)
      .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
      .build()
    val p = ExoPlayer.Builder(this).build()
    p.setAudioAttributes(attributes, true)
    p.repeatMode = Player.REPEAT_MODE_ONE
    p.setMediaItem(MediaItem.fromUri(uri))
    p.volume = if (fadeInMs > 0) 0f else volume
    p.prepare()
    p.playWhenReady = volume > 0f
    player = p
    if (fadeInMs > 0) fadeTo(volume, fadeInMs, null)
    handler.postDelayed(landing, maxOf(0L, endAt - System.currentTimeMillis()))
  }

  fun setVolume(volume: Float) {
    targetVolume = volume
    val p = player ?: return
    if (fade == null) p.volume = volume
    p.playWhenReady = volume > 0f
  }

  /** Volta a tocar se outro app de música tinha pegado o foco de áudio. */
  fun resume() {
    val p = player ?: return
    if (targetVolume > 0f && !p.playWhenReady) p.playWhenReady = true
  }

  fun isPlaying(): Boolean = player?.playWhenReady == true

  fun finish(removeNotification: Boolean) {
    handler.removeCallbacks(landing)
    cancelFade()
    player?.release()
    player = null
    if (Build.VERSION.SDK_INT >= 24) {
      stopForeground(if (removeNotification) STOP_FOREGROUND_REMOVE else STOP_FOREGROUND_DETACH)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(removeNotification)
    }
    // Se um novo som já foi pedido (troca de som), o serviço continua para atendê-lo.
    stopSelfResult(lastStartId)
  }

  private fun fadeTo(to: Float, durationMs: Long, onDone: (() -> Unit)?) {
    cancelFade()
    val p = player
    if (p == null) {
      onDone?.invoke()
      return
    }
    val from = p.volume
    val start = System.currentTimeMillis()
    val step = object : Runnable {
      override fun run() {
        val k = ((System.currentTimeMillis() - start).toFloat() / durationMs).coerceIn(0f, 1f)
        player?.volume = from + (to - from) * k
        if (k < 1f) {
          handler.postDelayed(this, FADE_STEP_MS)
        } else {
          fade = null
          onDone?.invoke()
        }
      }
    }
    fade = step
    handler.post(step)
  }

  private fun cancelFade() {
    fade?.let { handler.removeCallbacks(it) }
    fade = null
  }

  override fun onDestroy() {
    handler.removeCallbacksAndMessages(null)
    player?.release()
    player = null
    if (instance === this) instance = null
    super.onDestroy()
  }

  companion object {
    const val EXTRA_URI = "uri"
    const val EXTRA_VOLUME = "volume"
    const val EXTRA_END_AT = "endAt"
    const val EXTRA_TITLE = "title"
    const val EXTRA_TEXT = "text"
    const val EXTRA_FADE_IN_MS = "fadeInMs"
    private const val FADE_OUT_MS = 1500L
    private const val FADE_STEP_MS = 50L

    /** O serviço em execução (só no processo do app, acessado na thread principal). */
    @Volatile
    var instance: FlightSoundService? = null
  }
}
