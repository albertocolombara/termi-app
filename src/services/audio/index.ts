/**
 * Som de fundo do voo em loop. Toca durante a sessão inteira, inclusive com a tela bloqueada ou o
 * app fechado (decidido pelo Alberto em 20/11/2026, ARCHITECTURE §10).
 *
 * - **Android:** serviço nativo próprio (modules/screen-state, FlightSoundService), sem controle de
 *   mídia do sistema: pausar e trocar de som só pelo app, como no FocusFlight (Alberto, 20/11/2026).
 *   A notificação é a do voo, com a contagem até o pouso, e o som para sozinho no horário do pouso.
 * - **iOS e sem o módulo nativo:** expo-audio, só com o app aberto e em segundo plano normal.
 * - **Lofi:** não vem no APK. É uma playlist no servidor (`musica/lofi/playlist.json`, álbum CC0),
 *   tocada embaralhada em streaming, com cache no aparelho. Por enquanto só no Android.
 *
 * Os arquivos têm emenda sem corte (scripts/preparar-sons.sh), então o loop não "pula".
 * O som entra com fade (FADE_IN_MS).
 */
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { env } from '@/config/env';
import type { Som } from '@/domain/sons/catalogo';
import { textosDaNotificacaoFixa } from '@/services/avisos';
import { ScreenState } from '../../../modules/screen-state/src';

const ARQUIVO: Partial<Record<Som, number>> = {
  cruzeiro: require('../../../assets/sons/cruzeiro.m4a'),
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

export type InfoDoSom = {
  rota: string;
  pousoEm: number;
  titulo: string;
  subtitulo: string;
  /** Sinais de cintos (ms): começo e fim de cada serviço de bordo ainda por vir. Tocados pelo serviço nativo. */
  sinais?: number[];
  /** Volume do sinal e do aviso de pouso (0 a 1). */
  volumeDoSinal?: number;
  /** Aviso da comissária no horário do pouso. */
  anunciarPouso?: boolean;
};

/** Fonte do som: um arquivo do APK em loop, ou a playlist do servidor. */
type Fonte = number | 'playlist-lofi';

export function useSomQueToca(som: Som | null, volume: number, tocando: boolean, info: InfoDoSom) {
  const fonte: Fonte | null = som === 'lofi' ? 'playlist-lofi' : som ? (ARQUIVO[som] ?? null) : null;
  const volumeFinal = volume * (som ? (GANHO[som] ?? 1) : 1);
  // Um dos dois caminhos fica sempre desligado (fonte nula), então os hooks não mudam de ordem.
  useSomNativo(NATIVO ? fonte : null, volumeFinal, tocando, info);
  useSomExpoAudio(NATIVO || fonte === 'playlist-lofi' ? null : fonte, volumeFinal, tocando, info);
}

/** Endereços das faixas de lofi no servidor, na ordem da playlist (o serviço embaralha). */
async function faixasDoLofi(): Promise<string[]> {
  if (!env.tilesBaseUrl) return [];
  const r = await fetch(`${env.tilesBaseUrl}/musica/lofi/playlist.json`);
  if (r.status !== 200) return [];
  const p = (await r.json()) as { faixas?: { id: string }[] };
  return (p.faixas ?? []).map((f) => `${env.tilesBaseUrl}/musica/lofi/${f.id}.m4a`);
}

async function urisDaFonte(fonte: Fonte): Promise<string[]> {
  if (fonte === 'playlist-lofi') {
    // Sem rede ao começar: toca o voo de cruzeiro, para o voo não ficar mudo.
    const faixas = await faixasDoLofi().catch(() => []);
    return faixas.length ? faixas : urisDaFonte(ARQUIVO.cruzeiro!);
  }
  const arquivo = Asset.fromModule(fonte);
  await arquivo.downloadAsync();
  return arquivo.localUri ? [arquivo.localUri] : [];
}

function useSomNativo(fonte: Fonte | null, volume: number, tocando: boolean, info: InfoDoSom) {
  const volumeAtual = useRef(volume);
  const [reinicio, setReinicio] = useState(0);
  const { rota, pousoEm } = info;
  // Sinais numa chave de texto: o efeito só roda quando a lista muda de verdade.
  const chaveDosSinais = JSON.stringify([info.sinais ?? [], info.volumeDoSinal ?? 1, !!info.anunciarPouso]);
  const sinaisAtuais = useRef(chaveDosSinais);

  useEffect(() => {
    volumeAtual.current = volume;
    ScreenState.setFlightSoundVolume(volume);
  }, [volume]);

  useEffect(() => {
    sinaisAtuais.current = chaveDosSinais;
    const [sinais, vol, pouso] = JSON.parse(chaveDosSinais) as [number[], number, boolean];
    ScreenState.setFlightSoundCues(sinais, vol, pouso);
  }, [chaveDosSinais]);

  useEffect(() => {
    if (!fonte || !tocando) return;
    let cancelado = false;
    (async () => {
      const uris = await urisDaFonte(fonte);
      if (cancelado || uris.length === 0) return;
      const { titulo, texto } = textosDaNotificacaoFixa(rota, pousoEm);
      const [sinais, vol, pouso] = JSON.parse(sinaisAtuais.current) as [number[], number, boolean];
      ScreenState.startFlightSound(uris, fonte === 'playlist-lofi', volumeAtual.current, pousoEm, titulo, texto, FADE_IN_MS, sinais, vol, pouso);
    })().catch(() => {
      // sem o arquivo (ou sem rede para a playlist) o voo segue sem som
    });
    return () => {
      cancelado = true;
      ScreenState.stopFlightSound();
    };
  }, [fonte, tocando, rota, pousoEm, reinicio]);

  // Ao voltar ao app: recomeça o som se o serviço foi encerrado (outro app de música pegou o foco,
  // ou o sistema encerrou o serviço). Sempre com o app à vista, como pede o Android 17.
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

function useSomExpoAudio(fonte: Fonte | null, volume: number, tocando: boolean, info: InfoDoSom) {
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
