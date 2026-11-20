/**
 * Som de fundo do voo em loop (expo-audio). Toca só com a tela do voo aberta e na frente:
 * tocar em segundo plano pede o serviço de mídia em primeiro plano (ARCHITECTURE §10), que espera aprovação.
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

let modoPronto = false;

export function useSomQueToca(som: Som | null, volume: number, ativo: boolean) {
  const fonte = som ? (ARQUIVO[som] ?? null) : null;
  const player = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    if (modoPronto) return;
    modoPronto = true;
    // Mistura com outros apps (a música do usuário não para) e toca mesmo no modo silencioso.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => {
      modoPronto = false;
    });
  }, []);

  // Um player por som; trocar de som solta o anterior.
  useEffect(() => {
    if (!fonte) return;
    const p = createAudioPlayer(fonte);
    p.loop = true;
    player.current = p;
    return () => {
      player.current = null;
      p.remove();
    };
  }, [fonte]);

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    p.volume = volume;
    if (ativo && volume > 0) p.play();
    else p.pause();
  }, [fonte, ativo, volume]);
}
