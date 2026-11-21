/**
 * Leitura mais nova do avião da sessão, para corrigir a posição projetada durante o voo.
 * Baixa só o arquivo da região do avião (20 a 145 KB), não as 12 regiões (~0,7 MB): antes,
 * a tela do voo relia todas a cada 5 min só para atualizar um avião (build-37, consumo de dados).
 */
import { useQuery } from '@tanstack/react-query';

import { env } from '@/config/env';
import type { Voo } from '@/domain/voos/tipos';

import { buscarRegiao } from './cache';

export function useVooAoVivo(voo: Voo) {
  return useQuery({
    queryKey: ['voos', 'regiao', voo.regiao, voo.hex],
    queryFn: async ({ signal }) => (await buscarRegiao(env.flightCacheUrl, voo.regiao, signal)).find((v) => v.hex === voo.hex) ?? null,
    enabled: env.flightCacheUrl !== '' && !!voo.regiao,
    staleTime: 4 * 60_000,
    refetchInterval: 5 * 60_000, // só com a tela aberta
  });
}
