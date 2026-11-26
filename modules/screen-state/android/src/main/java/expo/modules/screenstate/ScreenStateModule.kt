package expo.modules.screenstate

import android.app.ActivityManager
import android.app.ApplicationExitInfo
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
      instalarRegistroDeCrash(ctx)
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
    // Os sinais (cintos e aviso de pouso) vêm antes, por setFlightSoundCues: o Expo aceita até 8 argumentos.
    Function("startFlightSound") { uris: List<String>, playlist: Boolean, volume: Double, endAt: Double, title: String, text: String, fadeInMs: Double ->
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
      }
      if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(intent) else ctx.startService(intent)
    }

    Function("setFlightSoundVolume") { volume: Double ->
      main.post { FlightSoundService.instance?.setVolume(volume.toFloat()) }
    }

    Function("setFlightSoundCues") { cues: List<Double>, cueVolume: Double, landingCue: Boolean ->
      val c = FlightCues(cues.map { it.toLong() }.toLongArray(), cueVolume.toFloat(), landingCue)
      FlightSoundService.cues = c
      main.post { FlightSoundService.instance?.setCues(c.times, c.volume, c.landing) }
    }

    Function("resumeFlightSound") {
      main.post { FlightSoundService.instance?.resume() }
    }

    Function("isFlightSoundRunning") {
      FlightSoundService.instance != null
    }

    /** Para o som; a notificação do voo fica (com a contagem) se o voo continua. */
    // Diagnóstico (ferramenta de desenvolvimento): os últimos fechamentos do app, como o Android
    // registrou (Android 11+). Em erro de Java/JS vem a mensagem; em erro nativo, os nomes legíveis
    // da pilha (o tombstone é binário). Nada de dados pessoais: só motivo, hora e pilha.
    Function("recentExits") {
      if (Build.VERSION.SDK_INT < 30) return@Function emptyList<Map<String, Any>>()
      val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      am.getHistoricalProcessExitReasons(context.packageName, 0, 5).map { info -> saidaParaMapa(info) }
    }

    // Pilha do último crash de Java/Kotlin (qualquer thread), gravada antes de o app fechar.
    Function("lastJavaCrash") {
      try {
        java.io.File(context.filesDir, ARQUIVO_DO_CRASH).takeIf { it.exists() }?.readText() ?: ""
      } catch (_: Exception) {
        ""
      }
    }

    // Diagnóstico dos sinais: volumes, modo do toque, "Não perturbe" e como cada canal ficou gravado
    // no aparelho (o Android não deixa o app mudar o som de um canal depois de criado).
    Function("audioDosAvisos") { canais: List<String> ->
      val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      fun volume(stream: Int) = "${am.getStreamVolume(stream)}/${am.getStreamMaxVolume(stream)}"
      val linhas = mutableListOf(
        "volume alarme=${volume(AudioManager.STREAM_ALARM)} midia=${volume(AudioManager.STREAM_MUSIC)} notificacao=${volume(AudioManager.STREAM_NOTIFICATION)} toque=${volume(AudioManager.STREAM_RING)}",
        "modo do toque=" + when (am.ringerMode) {
          AudioManager.RINGER_MODE_SILENT -> "silencioso"
          AudioManager.RINGER_MODE_VIBRATE -> "vibrar"
          else -> "normal"
        },
        "nao perturbe=" + when (nm.currentInterruptionFilter) {
          NotificationManager.INTERRUPTION_FILTER_ALL -> "desligado"
          NotificationManager.INTERRUPTION_FILTER_PRIORITY -> "so prioridade"
          NotificationManager.INTERRUPTION_FILTER_ALARMS -> "so alarmes"
          NotificationManager.INTERRUPTION_FILTER_NONE -> "silencio total"
          else -> "?"
        },
        "notificacoes do app=" + (if (nm.areNotificationsEnabled()) "ligadas" else "desligadas"),
      )
      if (Build.VERSION.SDK_INT >= 26) {
        for (id in canais) {
          val c = nm.getNotificationChannel(id)
          linhas += if (c == null) {
            "canal $id: nao existe"
          } else {
            "canal $id: importancia=${c.importance} som=${c.sound ?: "nenhum"} uso=${c.audioAttributes?.usage ?: "-"} ignoraNaoPerturbe=${c.canBypassDnd()}"
          }
        }
      }
      linhas.joinToString("\n")
    }

    // Sinais tocados pelo app como despertador (SinalDeBordo.kt).
    Function("agendarSinal") { id: Int, emMs: Double, som: String -> SinalDeBordo.agendar(context, id, emMs.toLong(), som) }
    Function("cancelarSinal") { id: Int -> SinalDeBordo.cancelar(context, id) }
    Function("cancelarSinais") { SinalDeBordo.cancelarTodos(context) }
    Function("sinaisTocados") { SinalDeBordo.tocados(context) }

    Function("stopFlightSound") {
      FlightSoundService.parar(removerNotificacao = false)
      main.post { FlightSoundService.instance?.finish(removeNotification = false) }
    }
  }

  private val main = Handler(Looper.getMainLooper())


  private fun saidaParaMapa(info: ApplicationExitInfo): Map<String, Any> {
    val motivo = when (info.reason) {
      ApplicationExitInfo.REASON_CRASH -> "crash"
      ApplicationExitInfo.REASON_CRASH_NATIVE -> "crash_nativo"
      ApplicationExitInfo.REASON_ANR -> "anr"
      ApplicationExitInfo.REASON_LOW_MEMORY -> "memoria"
      ApplicationExitInfo.REASON_USER_REQUESTED -> "usuario"
      ApplicationExitInfo.REASON_EXIT_SELF -> "saiu"
      ApplicationExitInfo.REASON_SIGNALED -> "sinal"
      else -> "outro_${info.reason}"
    }
    var pilha = ""
    try {
      info.traceInputStream?.use { entrada ->
        val bytes = entrada.readBytes().let { if (it.size > 512_000) it.copyOf(512_000) else it }
        pilha = if (info.reason == ApplicationExitInfo.REASON_CRASH_NATIVE) textoLegivel(bytes) else String(bytes).take(12_000)
      }
    } catch (_: Exception) {
    }
    return mapOf(
      "motivo" to motivo,
      "quando" to info.timestamp.toDouble(),
      "descricao" to (info.description ?: ""),
      "pss" to info.pss.toDouble(),
      "pilha" to pilha,
    )
  }

  /** Trechos de texto (4+ caracteres legíveis) de um tombstone binário: nomes de bibliotecas e funções. */
  private fun textoLegivel(bytes: ByteArray): String {
    val partes = ArrayList<String>()
    val atual = StringBuilder()
    for (b in bytes) {
      val c = b.toInt() and 0xff
      if (c in 32..126) {
        atual.append(c.toChar())
      } else {
        if (atual.length >= 4) partes.add(atual.toString())
        atual.setLength(0)
      }
    }
    if (atual.length >= 4) partes.add(atual.toString())
    return partes.joinToString("\n").take(12_000)
  }

  companion object {
    private const val ARQUIVO_DO_CRASH = "ultimo-crash-java.txt"
    @Volatile private var registroInstalado = false

    /**
     * Guarda a pilha de qualquer exceção não tratada (thread, mensagem, causas) num arquivo e passa
     * adiante para o tratamento padrão, que fecha o app como antes. Só diagnóstico: sem dados pessoais.
     */
    fun instalarRegistroDeCrash(ctx: Context) {
      if (registroInstalado) return
      registroInstalado = true
      val pasta = ctx.applicationContext.filesDir
      val anterior = Thread.getDefaultUncaughtExceptionHandler()
      Thread.setDefaultUncaughtExceptionHandler { thread, erro ->
        try {
          val texto = java.io.StringWriter()
          erro.printStackTrace(java.io.PrintWriter(texto))
          java.io.File(pasta, ARQUIVO_DO_CRASH).writeText(
            "${java.util.Date()} thread=${thread.name}\n" + texto.toString().take(20_000),
          )
        } catch (_: Throwable) {
        }
        anterior?.uncaughtException(thread, erro)
      }
    }
  }
}
