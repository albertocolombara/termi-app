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
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import java.io.File

/**
 * Som de fundo do voo com a tela bloqueada e o app fechado, sem controle de mídia do Android
 * (pedido do Alberto em 20/11/2026: como no FocusFlight, pausar e trocar só pelo app).
 *
 * É um serviço em primeiro plano do tipo mediaPlayback, mas sem MediaSession: por isso o Android
 * não mostra o player (pausar, voltar, duração). A notificação é a do voo, com a contagem até o pouso.
 *
 * - Loop sem corte (ExoPlayer, REPEAT_MODE_ONE) e foco de áudio do próprio ExoPlayer: uma ligação
 *   pausa e devolve o som, com o serviço mantido. Outro app de música (perda definitiva do foco)
 *   encerra o serviço, como pede o Android 17 ("Background audio hardening"); o som volta quando o
 *   Termi é aberto de novo, num serviço novo iniciado com o app à vista.
 * - Entra com fade e para sozinho no horário do pouso, com fade, mesmo com o app fechado.
 * - Playlist (lofi): faixas do servidor tocadas embaralhadas, em streaming, com cache de 60 MB no
 *   aparelho (as já ouvidas não baixam de novo) e buffer longo (uma faixa inteira à frente), para
 *   seguir tocando com a tela bloqueada mesmo se a rede oscilar. Faixa que falha é pulada.
 * - Sinais (pedido do Alberto em 25/11/2026, build-58: pelo canal de notificação o som não tocava):
 *   o próprio serviço toca o sinal de apertar cintos no começo e no fim de cada serviço de bordo e
 *   o aviso da comissária no pouso. 1 s antes, o som de fundo baixa com fade; depois do sinal, volta.
 *   No pouso, depois do aviso, o som de fundo sai com fade e o serviço termina.
 */
class FlightSoundService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var player: ExoPlayer? = null
  private var targetVolume = 1f
  private var fade: Runnable? = null
  private var lastStartId = 0
  private var falhasSeguidas = 0
  private val landing = Runnable { fadeTo(0f, FADE_OUT_MS) { finish(removeNotification = true) } }
  private var cuePlayer: ExoPlayer? = null
  private var cueVolume = 1f
  private var landingCue = false
  private val cueRunnables = mutableListOf<Runnable>()

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    instance = this
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    lastStartId = startId
    val uris = intent?.getStringArrayListExtra(EXTRA_URIS)?.takeIf { it.isNotEmpty() }
    val playlist = intent?.getBooleanExtra(EXTRA_PLAYLIST, false) ?: false
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
    if (uris == null || endAt <= System.currentTimeMillis()) {
      finish(removeNotification = uris != null)
      return START_NOT_STICKY
    }
    // Parado antes de o serviço começar: o pedido de parar chegou com o de tocar ainda na fila
    // (build-41, primeiro voo depois de atualizar: o som seguiu fora do voo depois de "Pousar antes").
    val seq = intent?.getLongExtra(EXTRA_SEQ, 0L) ?: 0L
    if (seq <= paradoAte) {
      finish(removeNotification = removerAoParar)
      return START_NOT_STICKY
    }
    val volume = intent?.getFloatExtra(EXTRA_VOLUME, 1f) ?: 1f
    val fadeInMs = intent?.getLongExtra(EXTRA_FADE_IN_MS, 0L) ?: 0L
    play(uris, playlist, volume, fadeInMs, endAt)
    val c = cues
    setCues(c.times, c.volume, c.landing, endAt)
    return START_NOT_STICKY
  }

  private fun play(uris: List<String>, playlist: Boolean, volume: Float, fadeInMs: Long, endAt: Long) {
    handler.removeCallbacks(landing)
    cancelFade()
    player?.release()
    targetVolume = volume
    falhasSeguidas = 0
    val attributes = AudioAttributes.Builder()
      .setUsage(C.USAGE_MEDIA)
      .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
      .build()
    val builder = ExoPlayer.Builder(this)
    if (playlist) {
      val fonte = CacheDataSource.Factory()
        .setCache(cache(this))
        .setUpstreamDataSourceFactory(DefaultDataSource.Factory(this))
      builder.setMediaSourceFactory(DefaultMediaSourceFactory(this).setDataSourceFactory(fonte))
      // Buffer de até 10 min à frente (~7 MB): uma faixa inteira já baixada.
      builder.setLoadControl(DefaultLoadControl.Builder().setBufferDurationsMs(240_000, 600_000, 2_500, 5_000).build())
    }
    val p = builder.build()
    p.setAudioAttributes(attributes, true)
    if (playlist) {
      // Embaralha a lista antes: com o embaralhamento do ExoPlayer, a primeira faixa era sempre a mesma.
      p.shuffleModeEnabled = true
      p.setMediaItems(uris.shuffled().map { MediaItem.fromUri(it) })
      p.repeatMode = Player.REPEAT_MODE_ALL
    } else {
      p.setMediaItem(MediaItem.fromUri(uris[0]))
      p.repeatMode = Player.REPEAT_MODE_ONE
    }
    p.addListener(object : Player.Listener {
      override fun onPlayWhenReadyChanged(playWhenReady: Boolean, reason: Int) {
        if (!playWhenReady && reason == Player.PLAY_WHEN_READY_CHANGE_REASON_AUDIO_FOCUS_LOSS) {
          // A notificação do voo fica, com a contagem até o pouso.
          finish(removeNotification = false)
        }
      }

      override fun onIsPlayingChanged(isPlaying: Boolean) {
        if (isPlaying) falhasSeguidas = 0
      }

      override fun onPlayerError(error: PlaybackException) {
        // Sem rede, uma faixa fora do cache falha: pula para a próxima (as do cache tocam).
        val q = player ?: return
        falhasSeguidas++
        if (playlist && falhasSeguidas < q.mediaItemCount) {
          q.seekToNextMediaItem()
          q.prepare()
        } else {
          finish(removeNotification = false)
        }
      }
    })
    p.volume = if (fadeInMs > 0) 0f else volume
    p.prepare()
    p.playWhenReady = volume > 0f
    player = p
    if (fadeInMs > 0) fadeTo(volume, fadeInMs, null)
    endAtAtual = endAt
  }

  private var endAtAtual = 0L

  /**
   * Agenda os sinais do serviço de bordo (`cues`, em ms) e o aviso de pouso. Substitui os anteriores
   * (ex.: o usuário voltou ao foco antes do fim da pausa e o sinal do fim sai da lista).
   */
  fun setCues(cues: LongArray, volume: Float, landingAnnouncement: Boolean, endAt: Long = endAtAtual) {
    // Sem som tocando (serviço ainda começando ou já parado): nada a agendar.
    if (endAt <= 0L || player == null) return
    cueRunnables.forEach { handler.removeCallbacks(it) }
    cueRunnables.clear()
    cueVolume = volume
    landingCue = landingAnnouncement
    endAtAtual = endAt
    val now = System.currentTimeMillis()
    for (t in cues) {
      if (t <= now || t >= endAt) continue
      val r = Runnable { playCue(RAW_CINTO, then = { fadeTo(targetVolume, DUCK_MS, null) }) }
      val duck = Runnable { duckForCue() }
      handler.postDelayed(duck, maxOf(0L, t - DUCK_MS - now))
      handler.postDelayed(r, t - now)
      cueRunnables += duck
      cueRunnables += r
    }
    // Pouso: com o aviso, baixa o som 1 s antes, toca o aviso e só então tira o som de fundo.
    handler.removeCallbacks(landing)
    if (landingCue && cueVolume > 0f) {
      val duck = Runnable { duckForCue() }
      val anuncio = Runnable { playCue(RAW_POUSO, then = { fadeTo(0f, FADE_OUT_MS) { finish(removeNotification = true) } }) }
      handler.postDelayed(duck, maxOf(0L, endAt - DUCK_MS - now))
      handler.postDelayed(anuncio, maxOf(0L, endAt - now))
      cueRunnables += duck
      cueRunnables += anuncio
    } else {
      handler.postDelayed(landing, maxOf(0L, endAt - now))
    }
  }

  private fun duckForCue() {
    if (cueVolume <= 0f) return
    fadeTo(targetVolume * DUCK_FACTOR, DUCK_MS, null)
  }

  /** Toca um som do APK (res/raw) por cima do som de fundo, sem pegar o foco de áudio dele. */
  private fun playCue(nome: String, then: () -> Unit) {
    val id = resources.getIdentifier(nome, "raw", packageName)
    if (id == 0 || cueVolume <= 0f) {
      then()
      return
    }
    cuePlayer?.release()
    val cp = ExoPlayer.Builder(this).build()
    cp.setAudioAttributes(
      AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_SONIFICATION).build(),
      false,
    )
    cp.setMediaItem(MediaItem.fromUri(android.net.Uri.parse("android.resource://$packageName/$id")))
    cp.volume = cueVolume
    cp.addListener(object : Player.Listener {
      override fun onPlaybackStateChanged(state: Int) {
        if (state == Player.STATE_ENDED) {
          cp.release()
          if (cuePlayer === cp) cuePlayer = null
          then()
        }
      }

      override fun onPlayerError(error: PlaybackException) {
        cp.release()
        if (cuePlayer === cp) cuePlayer = null
        then()
      }
    })
    cp.prepare()
    cp.playWhenReady = true
    cuePlayer = cp
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
    cueRunnables.forEach { handler.removeCallbacks(it) }
    cueRunnables.clear()
    cuePlayer?.release()
    cuePlayer = null
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
    cuePlayer?.release()
    cuePlayer = null
    if (instance === this) instance = null
    super.onDestroy()
  }

  companion object {
    const val EXTRA_URIS = "uris"
    const val EXTRA_PLAYLIST = "playlist"
    const val EXTRA_VOLUME = "volume"
    const val EXTRA_END_AT = "endAt"
    const val EXTRA_TITLE = "title"
    const val EXTRA_TEXT = "text"
    const val EXTRA_FADE_IN_MS = "fadeInMs"
    const val EXTRA_SEQ = "seq"
    /** Sinais do voo atual, definidos pelo app (setFlightSoundCues) antes e durante o som. */
    class Cues(val times: LongArray, val volume: Float, val landing: Boolean)

    @Volatile
    var cues = Cues(LongArray(0), 1f, false)

    private const val RAW_CINTO = "aviso_cinto"
    private const val RAW_POUSO = "aviso_pouso"
    /** O som de fundo baixa para 20% durante o sinal, com fade de 1 s antes e depois. */
    private const val DUCK_FACTOR = 0.2f
    private const val DUCK_MS = 1000L
    private const val FADE_OUT_MS = 1500L
    private const val FADE_STEP_MS = 50L

    private var cacheDeMusica: SimpleCache? = null

    /** Um só cache por processo (o SimpleCache não aceita duas instâncias na mesma pasta). */
    @Synchronized
    fun cache(ctx: android.content.Context): SimpleCache =
      cacheDeMusica ?: SimpleCache(
        File(ctx.cacheDir, "musica"),
        LeastRecentlyUsedCacheEvictor(60L * 1024 * 1024),
        StandaloneDatabaseProvider(ctx),
      ).also { cacheDeMusica = it }

    /** Número de cada pedido de tocar; o serviço ignora os pedidos até paradoAte (parados antes de começar). */
    val pedidos = java.util.concurrent.atomic.AtomicLong(0)

    @Volatile
    var paradoAte = 0L

    @Volatile
    var removerAoParar = false

    /** Para o som (o que toca e o que ainda está na fila para começar). */
    fun parar(removerNotificacao: Boolean) {
      removerAoParar = removerNotificacao
      paradoAte = pedidos.get()
    }

    /** O serviço em execução (só no processo do app, acessado na thread principal). */
    @Volatile
    var instance: FlightSoundService? = null
  }
}
