import { requireOptionalNativeModule } from 'expo';

type ScreenStateNative = {
  isInteractive(): boolean;
  isLocked(): boolean;
  isInCall(): boolean;
  lastScreenOffAt(): number;
  lastScreenOnAt(): number;
  showFlightNotification(title: string, text: string, endAt: number): void;
  hideFlightNotification(): void;
  startFlightSound(uris: string[], playlist: boolean, volume: number, endAt: number, title: string, text: string, fadeInMs: number): void;
  /** Sinais de cintos (ms), volume deles e aviso de pouso. Chamar antes de startFlightSound e quando mudarem. */
  setFlightSoundCues(cues: number[], cueVolume: number, landingCue: boolean): void;
  setFlightSoundVolume(volume: number): void;
  resumeFlightSound(): void;
  isFlightSoundRunning(): boolean;
  stopFlightSound(): void;
  /** Últimos fechamentos do app registrados pelo Android 11+ (diagnóstico). */
  recentExits(): SaidaDoApp[];
  /** Pilha do último crash de Java/Kotlin, ou "" (diagnóstico). */
  lastJavaCrash(): string;
  /** Volumes, modo do toque, "Não perturbe" e os canais pedidos, em texto (diagnóstico). */
  audioDosAvisos(canais: string[]): string;
  /** Toca `som` (res/raw, sem extensão) em `emMs`, no volume de alarme. Retorna "exato" ou "inexato". */
  agendarSinal(id: number, emMs: number, som: string): string;
  cancelarSinal(id: number): void;
  cancelarSinais(): void;
  /** Últimos sinais tocados ou não, com o motivo (diagnóstico). */
  sinaisTocados(): string;
};

export type SaidaDoApp = { motivo: string; quando: number; descricao: string; pss: number; pilha: string };

const native = requireOptionalNativeModule<ScreenStateNative>('ScreenState');

// Se o módulo nativo não existir (ex.: Expo Go), o app continua funcionando sem ele.
export const ScreenState: ScreenStateNative & { available: boolean; temSinais: boolean } = {
  available: !!native,
  temSinais: typeof native?.agendarSinal === 'function',
  isInteractive: () => native?.isInteractive() ?? true,
  isLocked: () => native?.isLocked() ?? false,
  isInCall: () => native?.isInCall() ?? false,
  lastScreenOffAt: () => native?.lastScreenOffAt() ?? 0,
  lastScreenOnAt: () => native?.lastScreenOnAt() ?? 0,
  showFlightNotification: (t, x, e) => native?.showFlightNotification(t, x, e),
  hideFlightNotification: () => native?.hideFlightNotification(),
  startFlightSound: (u, l, v, e, t, x, f) => native?.startFlightSound(u, l, v, e, t, x, f),
  setFlightSoundCues: (c, cv, lc) => native?.setFlightSoundCues(c, cv, lc),
  setFlightSoundVolume: (v) => native?.setFlightSoundVolume(v),
  resumeFlightSound: () => native?.resumeFlightSound(),
  isFlightSoundRunning: () => native?.isFlightSoundRunning() ?? false,
  stopFlightSound: () => native?.stopFlightSound(),
  recentExits: () => native?.recentExits() ?? [],
  lastJavaCrash: () => native?.lastJavaCrash() ?? '',
  audioDosAvisos: (c) => native?.audioDosAvisos?.(c) ?? '',
  // Os sinais chegaram no APK de 26/11/2026; num APK anterior as funções não existem.
  agendarSinal: (i, e, s) => native?.agendarSinal?.(i, e, s) ?? '',
  cancelarSinal: (i) => native?.cancelarSinal?.(i),
  cancelarSinais: () => native?.cancelarSinais?.(),
  sinaisTocados: () => native?.sinaisTocados?.() ?? 'indisponível (APK anterior)',
};
