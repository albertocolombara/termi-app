/**
 * Leitura mais nova do avião da sessão, para corrigir a posição projetada durante o voo.
 * Baixa só o arquivo da região do avião (comprimido, ~5 a 25 KB), não as 12 regiões: antes, a tela
 * do voo relia todas a cada 5 min só para atualizar um avião (build-37, consumo de dados).
 *
 * Se o avião não está mais na região dele (saiu dela ou passou por um trecho sem radar), procura
 * nas outras regiões, no máximo a cada 20 min (o tempo de uma volta do coletor). Antes ficava
 * pedindo só a região antiga e, uma vez perdido, o voo nunca mais voltava a ser corrigido
 * (pergunta do Alberto, build-48).
 */
import { useQuery } from '@tanstack/react-query';

import { env } from '@/config/env';
import type { Voo } from '@/domain/voos/tipos';

import { buscarRegiao, buscarVoosAoVivo } from './cache';

/** Intervalo mínimo entre buscas em todas as regiões, por avião. */
export const BUSCA_GERAL_A_CADA_MS = 20 * 60_000;
const ultimaBuscaGeral = new Map<string, number>();

export async function lerAviao(voo: Voo, agora: number, sinal?: AbortSignal): Promise<Voo | null> {
  const naRegiao = (await buscarRegiao(env.flightCacheUrl, voo.regiao, sinal)).find((v) => v.hex === voo.hex);
  if (naRegiao) return naRegiao;
  if (agora - (ultimaBuscaGeral.get(voo.hex) ?? 0) < BUSCA_GERAL_A_CADA_MS) return null;
  ultimaBuscaGeral.set(voo.hex, agora);
  const todos = await buscarVoosAoVivo(env.flightCacheUrl, sinal);
  return todos.voos.find((v) => v.hex === voo.hex) ?? null;
}

export function useVooAoVivo(voo: Voo) {
  return useQuery({
    queryKey: ['voos', 'regiao', voo.regiao, voo.hex],
    queryFn: ({ signal }) => lerAviao(voo, Date.now(), signal),
    enabled: env.flightCacheUrl !== '' && !!voo.regiao,
    staleTime: 4 * 60_000,
    refetchInterval: 5 * 60_000, // só com a tela aberta
  });
}
