/**
 * Som de fundo do voo em loop (expo-audio). Toca durante a sessão inteira, inclusive com a tela
 * bloqueada ou o app em segundo plano (decidido pelo Alberto em 20/11/2026, ARCHITECTURE §10).
 *
 * No Android, o som em segundo plano usa o serviço de mídia do expo-audio (serviço em primeiro plano
 * do tipo mediaPlayback) e aparece como controle de mídia na notificação, como um player de música.
 * Sem o controle na tela de bloqueio, o sistema corta o som em ~3 min.
 * Os arquivos têm emenda sem corte (scripts/preparar-sons.sh), então o loop não "pula".
 */
import { useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import type { Som } from '@/domain/sons/catalogo';

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

let modoPronto = false;

export type InfoDoSom = { titulo: string; subtitulo: string };

export function useSomQueToca(som: Som | null, volume: number, tocando: boolean, info: InfoDoSom) {
  const fonte = som ? (ARQUIVO[som] ?? null) : null;
  const player = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    if (modoPronto) return;
    modoPronto = true;
    // Segue em segundo plano e no modo silencioso. Os controles da tela de bloqueio pedem "doNotMix":
    // se o usuário puser a música dele, o som do voo pausa (e ele volta pelo controle na notificação).
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix', shouldPlayInBackground: true }).catch(() => {
      modoPronto = false;
    });
  }, []);

  // Um player por som enquanto o voo está tocando; trocar de som ou pousar solta o anterior.
  useEffect(() => {
    if (!fonte || !tocando) return;
    const p = createAudioPlayer(fonte);
    p.loop = true;
    player.current = p;
    try {
      p.setActiveForLockScreen(true, { title: info.titulo, artist: info.subtitulo }, { showSeekForward: false, showSeekBackward: false });
    } catch {
      // sem controles de mídia o som ainda toca com o app aberto
    }
    return () => {
      player.current = null;
      // No Android, remove() só tira o player da lista do módulo: o ExoPlayer só é liberado quando o
      // coletor de lixo do JS passa. Sem pausar antes, o som antigo continua tocando junto com o novo.
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
    const p = player.current;
    if (!p) return;
    p.volume = volume * (som ? (GANHO[som] ?? 1) : 1);
    if (volume > 0) p.play();
    else p.pause();
  }, [fonte, som, tocando, volume]);
}
