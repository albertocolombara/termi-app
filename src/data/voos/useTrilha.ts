import { useQuery } from '@tanstack/react-query';

import { env } from '@/config/env';
import { distanciaKm } from '@/domain/voos/geo';
import { trilhaDoVoo, type Amostra } from '@/domain/voos/trilha';
import type { Voo } from '@/domain/voos/tipos';

import { buscarAmostrasDoHistorico } from './cache';

/**
 * Trilha real do voo desde a decolagem, lida do histórico do R2 (uma amostra a cada 20 min).
 * Atualiza a cada 20 min com o app aberto. Sem histórico, devolve lista vazia (o globo usa a linha reta).
 */
export function useTrilha(voo: Voo) {
  return useQuery({
    queryKey: ['trilha', voo.hex, voo.destino.lat, voo.destino.lon],
    queryFn: async ({ signal }): Promise<Amostra[]> => {
      const agora = Date.now();
      // Horas desde a decolagem, estimadas pela distância da origem a ~700 km/h, com folga.
      const horas = Math.min(20, Math.ceil(distanciaKm(voo.origem, voo) / 700) + 1);
      const amostras = await buscarAmostrasDoHistorico(env.flightCacheUrl, voo.regiao, agora, horas, signal, voo.hex);
      return trilhaDoVoo(amostras, voo, agora);
    },
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000, // ao voltar à tela do voo, não lê tudo de novo
    refetchInterval: 20 * 60_000,
    enabled: !!env.flightCacheUrl,
  });
}
