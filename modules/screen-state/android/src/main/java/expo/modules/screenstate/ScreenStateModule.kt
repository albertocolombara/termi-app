package expo.modules.screenstate

import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * O que o JS não consegue saber sozinho no Android:
 * - se a tela foi desligada (bloqueio) ou se o usuário trocou de app;
 * - se há uma ligação em andamento;
 * - mostrar o voo numa notificação fixa com contagem regressiva que anda sem o app rodar.
 */
class ScreenStateModule : Module() {
  private var lastScreenOffAt = 0.0
  private var lastScreenOnAt = 0.0
  private var receiver: BroadcastReceiver? = null

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("Sem contexto do app")

  override fun definition() = ModuleDefinition {
    Name("ScreenState")

    OnCreate {
      val ctx = appContext.reactContext ?: return@OnCreate
      val r = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, intent: Intent?) {
          val now = System.currentTimeMillis().toDouble()
          when (intent?.action) {
            Intent.ACTION_SCREEN_OFF -> lastScreenOffAt = now
            Intent.ACTION_SCREEN_ON -> lastScreenOnAt = now
          }
        }
      }
      val filter = IntentFilter().apply {
        addAction(Intent.ACTION_SCREEN_OFF)
        addAction(Intent.ACTION_SCREEN_ON)
      }
      if (Build.VERSION.SDK_INT >= 33) {
        ctx.registerReceiver(r, filter, Context.RECEIVER_EXPORTED)
      } else {
        ctx.registerReceiver(r, filter)
      }
      receiver = r
    }

    OnDestroy {
      try {
        receiver?.let { appContext.reactContext?.unregisterReceiver(it) }
      } catch (_: Exception) {
      }
      receiver = null
    }

    Function("isInteractive") {
      (context.getSystemService(Context.POWER_SERVICE) as PowerManager).isInteractive
    }

    Function("isLocked") {
      (context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).isKeyguardLocked
    }

    Function("isInCall") {
      val mode = (context.getSystemService(Context.AUDIO_SERVICE) as AudioManager).mode
      mode == AudioManager.MODE_IN_CALL ||
        mode == AudioManager.MODE_IN_COMMUNICATION ||
        mode == AudioManager.MODE_RINGTONE
    }

    Function("lastScreenOffAt") { lastScreenOffAt }

    Function("lastScreenOnAt") { lastScreenOnAt }

    Function("showFlightNotification") { title: String, text: String, endAt: Double ->
      val ctx = context
      val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      nm.notify(FlightNotification.NOTIFICATION_ID, FlightNotification.build(ctx, title, text, endAt.toLong()))
    }

    Function("hideFlightNotification") {
      val ctx = context
      FlightSoundService.parar(removerNotificacao = true)
      main.post { FlightSoundService.instance?.finish(removeNotification = true) }
      val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      nm.cancel(FlightNotification.NOTIFICATION_ID)
    }

    // Som de fundo sem controle de mídia (FlightSoundService). Só chamar com o app aberto:
    // o Android não deixa iniciar serviço em primeiro plano a partir do segundo plano.
    // `uris`: um arquivo em loop, ou várias faixas (`playlist`) tocadas embaralhadas em sequência.
    // `cues`: horários (ms) do sinal de cintos; `landingCue`: aviso da comissária no pouso.
    Function("startFlightSound") { uris: List<String>, playlist: Boolean, volume: Double, endAt: Double, title: String, text: String, fadeInMs: Double, cues: List<Double>, cueVolume: Double, landingCue: Boolean ->
      val ctx = context
      val intent = Intent(ctx, FlightSoundService::class.java).apply {
        putStringArrayListExtra(FlightSoundService.EXTRA_URIS, ArrayList(uris))
        putExtra(FlightSoundService.EXTRA_PLAYLIST, playlist)
        putExtra(FlightSoundService.EXTRA_VOLUME, volume.toFloat())
        putExtra(FlightSoundService.EXTRA_END_AT, endAt.toLong())
        putExtra(FlightSoundService.EXTRA_TITLE, title)
        putExtra(FlightSoundService.EXTRA_TEXT, text)
        putExtra(FlightSoundService.EXTRA_FADE_IN_MS, fadeInMs.toLong())
        putExtra(FlightSoundService.EXTRA_SEQ, FlightSoundService.pedidos.incrementAndGet())
        putExtra(FlightSoundService.EXTRA_CUES, cues.map { it.toLong() }.toLongArray())
        putExtra(FlightSoundService.EXTRA_CUE_VOLUME, cueVolume.toFloat())
        putExtra(FlightSoundService.EXTRA_LANDING_CUE, landingCue)
      }
      if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(intent) else ctx.startService(intent)
    }

    Function("setFlightSoundVolume") { volume: Double ->
      main.post { FlightSoundService.instance?.setVolume(volume.toFloat()) }
    }

    Function("setFlightSoundCues") { cues: List<Double>, cueVolume: Double, landingCue: Boolean ->
      main.post { FlightSoundService.instance?.setCues(cues.map { it.toLong() }.toLongArray(), cueVolume.toFloat(), landingCue) }
    }

    Function("resumeFlightSound") {
      main.post { FlightSoundService.instance?.resume() }
    }

    Function("isFlightSoundRunning") {
      FlightSoundService.instance != null
    }

    /** Para o som; a notificação do voo fica (com a contagem) se o voo continua. */
    Function("stopFlightSound") {
      FlightSoundService.parar(removerNotificacao = false)
      main.post { FlightSoundService.instance?.finish(removeNotification = false) }
    }
  }

  private val main = Handler(Looper.getMainLooper())

}
