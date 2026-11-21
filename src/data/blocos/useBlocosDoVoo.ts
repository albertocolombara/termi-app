import { useEffect } from 'react';

import { useAjustes } from '@/data/preferencias/ajustes';
import { blocosDaRota, camadasParaBaixar } from '@/domain/voos/blocosDaRota';
import { projetar } from '@/domain/voos/projecao';
import type { Voo } from '@/domain/voos/tipos';

import { baixarBlocos } from './baixarBlocos';

/** Quanto da rota à frente do avião fica baixado (e a cada quanto tempo confere). */
export const MINUTOS_A_FRENTE = 60;
const CONFERE_A_CADA_MS = 10 * 60_000;

/**
 * Baixa a paisagem da rota à frente do avião, só com a tela do voo aberta: a próxima 1 h, e
 * de novo a cada 10 min (build-37: baixar a rota inteira até o destino no começo do voo gastava
 * ~9 MB por hora de rota mesmo para quem pousava antes). Blocos que já existem são pulados.
 */
export function useBlocosDoVoo(voo: Voo, ativo: boolean) {
  const qualidade = useAjustes((a) => a.qualidadeDaJanela);
  useEffect(() => {
    if (!ativo) return;
    const controle = new AbortController();
    const baixarAFrente = () => {
      const agora = Date.now();
      const ate = Math.min(voo.pousoPrevistoEm, agora + MINUTOS_A_FRENTE * 60_000);
      if (ate <= agora) return;
      const blocos = blocosDaRota(projetar(voo, agora), projetar(voo, ate), camadasParaBaixar(qualidade));
      baixarBlocos(blocos, () => {}, controle.signal).catch(() => {});
    };
    baixarAFrente();
    const id = setInterval(baixarAFrente, CONFERE_A_CADA_MS);
    return () => {
      clearInterval(id);
      controle.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voo.hex, ativo, qualidade]);
}
