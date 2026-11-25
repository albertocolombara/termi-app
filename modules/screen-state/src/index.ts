import { requireOptionalNativeModule } from 'expo';

type ScreenStateNative = {
  isInteractive(): boolean;
  isLocked(): boolean;
  isInCall(): boolean;
  lastScreenOffAt(): number;
  lastScreenOnAt(): number;
  showFlightNotification(title: string, text: string, endAt: number): void;
  hideFlightNotification(): void;
  startFlightSound(
    uris: string[],
    playlist: boolean,
    volume: number,
    endAt: number,
    title: string,
    text: string,
    fadeInMs: number,
    cues: number[],
    cueVolume: number,
    landingCue: boolean,
  ): void;
  setFlightSoundCues(cues: number[], cueVolume: number, landingCue: boolean): void;
  setFlightSoundVolume(volume: number): void;
  resumeFlightSound(): void;
  isFlightSoundRunning(): boolean;
  stopFlightSound(): void;
};

const native = requireOptionalNativeModule<ScreenStateNative>('ScreenState');

// Se o módulo nativo não existir (ex.: Expo Go), o app continua funcionando sem ele.
export const ScreenState: ScreenStateNative & { available: boolean } = {
  available: !!native,
  isInteractive: () => native?.isInteractive() ?? true,
  isLocked: () => native?.isLocked() ?? false,
  isInCall: () => native?.isInCall() ?? false,
  lastScreenOffAt: () => native?.lastScreenOffAt() ?? 0,
  lastScreenOnAt: () => native?.lastScreenOnAt() ?? 0,
  showFlightNotification: (t, x, e) => native?.showFlightNotification(t, x, e),
  hideFlightNotification: () => native?.hideFlightNotification(),
  startFlightSound: (u, l, v, e, t, x, f, c, cv, lc) => native?.startFlightSound(u, l, v, e, t, x, f, c, cv, lc),
  setFlightSoundCues: (c, cv, lc) => native?.setFlightSoundCues(c, cv, lc),
  setFlightSoundVolume: (v) => native?.setFlightSoundVolume(v),
  resumeFlightSound: () => native?.resumeFlightSound(),
  isFlightSoundRunning: () => native?.isFlightSoundRunning() ?? false,
  stopFlightSound: () => native?.stopFlightSound(),
};
