/**
 * Som de fundo do voo em loop. Toca durante a sessão inteira, inclusive com a tela bloqueada ou o
 * app fechado (decidido pelo Alberto em 20/11/2026, ARCHITECTURE §10).
 *
 * - **Android:** serviço nativo próprio (modules/screen-state, FlightSoundService), sem controle de
 *   mídia do sistema: pausar e trocar de som só pelo app, como no FocusFlight (Alberto, 20/11/2026).
 *   A notificação é a do voo, com a contagem até o pouso, e o som para sozinho no horário do pouso.
 * - **iOS e sem o módulo nativo:** expo-audio, só com o app aberto e em segundo plano normal.
 *
 * Os arquivos têm emenda sem corte (scripts/preparar-sons.sh), então o loop não "pula".
 * O som entra com fade (FADE_IN_MS).
 */
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import type { Som } from '@/domain/sons/catalogo';
import { textosDaNotificacaoFixa } from '@/services/avisos';
import { ScreenState } from '../../../modules/screen-state/src';

const ARQUIVO: Partial<Record<Som, number>> = {
  motores: require('../../../assets/sons/motores.m4a'),
  'ruido-branco': require('../../../assets/sons/ruido-branco.m4a'),
  cabine: require('../../../assets/sons/cabine.m4a'),
  chuva: require('../../../assets/sons/chuva.m4a'),
};

/**
 * Ganho por som, sobre o volume escolhido. Os arquivos já saem com o mesmo volume médio (-20 LUFS),
 * mas o ruído branco soa mais alto pelo espectro cheio (Alberto, build-27): fica ~4 dB abaixo.
 */
const GANHO: Partial<Record<Som, number>> = { 'ruido-branco': 0.6 };

/** O som entra suave, junto com o fim da animação do embarque (Alberto, build-28). */
export const FADE_IN_MS = 1800;

const NATIVO = Platform.OS === 'android' && ScreenState.available;

export type InfoDoSom = { rota: string; pousoEm: number; titulo: string; subtitulo: string };

export function useSomQueToca(som: Som | null, volume: number, tocando: boolean, info: InfoDoSom) {
  const fonte = som ? (ARQUIVO[som] ?? null) : null;
  const volumeFinal = volume * (som ? (GANHO[som] ?? 1) : 1);
  // Um dos dois caminhos fica sempre desligado (fonte nula), então os hooks não mudam de ordem.
  useSomNativo(NATIVO ? fonte : null, volumeFinal, tocando, info);
  useSomExpoAudio(NATIVO ? null : fonte, volumeFinal, tocando, info);
}

function useSomNativo(fonte: number | null, volume: number, tocando: boolean, info: InfoDoSom) {
  const volumeAtual = useRef(volume);
  const [reinicio, setReinicio] = useState(0);
  const { rota, pousoEm } = info;

  useEffect(() => {
    volumeAtual.current = volume;
    ScreenState.setFlightSoundVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (!fonte || !tocando) return;
    let cancelado = false;
    (async () => {
      const arquivo = Asset.fromModule(fonte);
      await arquivo.downloadAsync();
      if (cancelado || !arquivo.localUri) return;
      const { titulo, texto } = textosDaNotificacaoFixa(rota, pousoEm);
      ScreenState.startFlightSound(arquivo.localUri, volumeAtual.current, pousoEm, titulo, texto, FADE_IN_MS);
    })().catch(() => {
      // sem o arquivo o voo segue sem som
    });
    return () => {
      cancelado = true;
      ScreenState.stopFlightSound();
    };
  }, [fonte, tocando, rota, pousoEm, reinicio]);

  // Ao voltar ao app: retoma se outro app de música tinha pegado o foco; recomeça se o sistema
  // encerrou o serviço.
  useEffect(() => {
    if (!fonte || !tocando) return;
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') return;
      if (ScreenState.isFlightSoundRunning()) ScreenState.resumeFlightSound();
      else setReinicio((n) => n + 1);
    });
    return () => sub.remove();
  }, [fonte, tocando]);
}

let modoPronto = false;

function useSomExpoAudio(fonte: number | null, volume: number, tocando: boolean, info: InfoDoSom) {
  const player = useRef<AudioPlayer | null>(null);
  const volumeAtual = useRef(volume);

  useEffect(() => {
    if (!fonte || modoPronto) return;
    modoPronto = true;
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix', shouldPlayInBackground: true }).catch(() => {
      modoPronto = false;
    });
  }, [fonte]);

  // Um player por som enquanto o voo está tocando; trocar de som ou pousar solta o anterior.
  useEffect(() => {
    if (!fonte || !tocando) return;
    const p = createAudioPlayer(fonte);
    p.loop = true;
    p.volume = 0;
    player.current = p;
    try {
      p.setActiveForLockScreen(true, { title: info.titulo, artist: info.subtitulo }, { showSeekForward: false, showSeekBackward: false });
    } catch {
      // sem controles de mídia o som ainda toca com o app aberto
    }
    if (volumeAtual.current > 0) p.play();
    // Fade de entrada em passos de 50 ms.
    const inicio = Date.now();
    const fade = setInterval(() => {
      const k = Math.min(1, (Date.now() - inicio) / FADE_IN_MS);
      p.volume = volumeAtual.current * k;
      if (k >= 1) clearInterval(fade);
    }, 50);
    return () => {
      clearInterval(fade);
      player.current = null;
      // No Android, remove() só tira o player da lista do módulo: sem pausar, o som antigo segue tocando.
      p.pause();
      p.volume = 0;
      try {
        p.clearLockScreenControls();
      } catch {
        // nada a limpar
      }
      p.remove();
    };
    // O título só muda com o voo, e aí o som recomeça de qualquer jeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fonte, tocando]);

  useEffect(() => {
    volumeAtual.current = volume;
    const p = player.current;
    if (!p) return;
    p.volume = volume;
    if (volume > 0) p.play();
    else p.pause();
  }, [volume]);
}
