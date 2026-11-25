/**
 * Leitura mais nova do avião da sessão, para corrigir a posição projetada durante o voo.
 * Baixa só o arquivo da região do avião (comprimido, ~5 a 25 KB), não as 12 regiões: antes, a tela
 * do voo relia todas a cada 5 min só para atualizar um avião (build-37, consumo de dados).
 *
 * Se o avião não está na região dele, lê o índice (pequeno) e procura nas regiões cuja área cobre a
 * posição estimada. Assim dá para separar:
 * - `fora-da-area`: o avião está longe das 12 áreas que o coletor lê. É normal num voo longo; a
 *   posição é estimada e o app não avisa (build-51: "sem sinal do radar" o voo todo).
 * - `sem-sinal`: o avião devia estar numa área coletada e não está na leitura.
 * Índice antigo, sem as áreas: procura em todas as regiões, no máximo a cada 20 min.
 */
import { useQuery } from '@tanstack/react-query';

import { env } from '@/config/env';
import { regioesQueCobrem } from '@/domain/voos/cobertura';
import type { Ponto } from '@/domain/voos/geo';
import type { Voo } from '@/domain/voos/tipos';

import { buscarIndice, buscarRegiao, buscarVoosAoVivo } from './cache';

export type Leitura = { voo: Voo | null; situacao: 'ok' | 'fora-da-area' | 'sem-sinal' };

/** Intervalo mínimo entre buscas em todas as regiões (só com índice antigo), por avião. */
export const BUSCA_GERAL_A_CADA_MS = 20 * 60_000;
const ultimaBuscaGeral = new Map<string, number>();

export async function lerAviao(voo: Voo, posicao: Ponto, agora: number, sinal?: AbortSignal): Promise<Leitura> {
  const base = env.flightCacheUrl;
  const naRegiao = (await buscarRegiao(base, voo.regiao, sinal)).find((v) => v.hex === voo.hex);
  if (naRegiao) return { voo: naRegiao, situacao: 'ok' };

  const regioes = await buscarIndice(base, sinal);
  if (regioes.some((r) => r.area)) {
    const cobrem = regioesQueCobrem(regioes, posicao).filter((r) => r.id !== voo.regiao);
    for (const r of cobrem) {
      const achado = (await buscarRegiao(base, r.id, sinal)).find((v) => v.hex === voo.hex);
      if (achado) return { voo: achado, situacao: 'ok' };
    }
    const naPropria = regioesQueCobrem(regioes, posicao).some((r) => r.id === voo.regiao);
    return { voo: null, situacao: cobrem.length || naPropria ? 'sem-sinal' : 'fora-da-area' };
  }

  // Índice antigo (sem áreas): busca geral, no máximo a cada 20 min.
  if (agora - (ultimaBuscaGeral.get(voo.hex) ?? 0) < BUSCA_GERAL_A_CADA_MS) return { voo: null, situacao: 'sem-sinal' };
  ultimaBuscaGeral.set(voo.hex, agora);
  const todos = await buscarVoosAoVivo(base, sinal);
  const achado = todos.voos.find((v) => v.hex === voo.hex);
  return achado ? { voo: achado, situacao: 'ok' } : { voo: null, situacao: 'sem-sinal' };
}

/** `posicao`: onde o avião deve estar agora pela projeção (para saber qual área o cobre). */
export function useVooAoVivo(voo: Voo, posicao: () => Ponto) {
  return useQuery({
    queryKey: ['voos', 'regiao', voo.regiao, voo.hex],
    queryFn: ({ signal }) => lerAviao(voo, posicao(), Date.now(), signal),
    enabled: env.flightCacheUrl !== '' && !!voo.regiao,
    staleTime: 4 * 60_000,
    refetchInterval: 5 * 60_000, // só com o app à vista (focusManager em data/remote/queryClient)
  });
}
