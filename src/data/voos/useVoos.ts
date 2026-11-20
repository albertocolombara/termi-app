/**
 * Voos disponíveis agora: ao vivo, ou o voo de ontem quando os dados ao vivo estão fora do ar (RN-12).
 * Sem internet, a consulta falha e a tela mostra o estado "Sem internet" (o cache do app fica para depois).
 */
import { useQuery } from '@tanstack/react-query';

import { env } from '@/config/env';
import { frescorDoCache } from '@/domain/voos/frescor';
import type { Voo } from '@/domain/voos/tipos';

import { buscarVoosAoVivo, buscarVoosDeOntem, type Regiao } from './cache';

export type VoosDisponiveis = {
  voos: Voo[];
  origem: 'ao-vivo' | 'ontem';
  regioes: Regiao[];
  atribuicao: string | null;
  consultadoEm: number;
};

export async function buscarVoosDisponiveis(base: string, agora: number, maxIdadeMin: number, sinal?: AbortSignal): Promise<VoosDisponiveis> {
  const vivo = await buscarVoosAoVivo(base, sinal);
  if (frescorDoCache(vivo.regioes.map((r) => r.coletadoEm), agora, maxIdadeMin) === 'ao-vivo') {
    return { ...vivo, origem: 'ao-vivo', consultadoEm: agora };
  }
  const ontem = await buscarVoosDeOntem(base, vivo.regioes.map((r) => r.id), agora, sinal);
  return { voos: ontem, origem: 'ontem', regioes: vivo.regioes, atribuicao: vivo.atribuicao, consultadoEm: agora };
}

export function useVoosDisponiveis() {
  return useQuery({
    queryKey: ['voos', 'disponiveis'],
    queryFn: ({ signal }) => buscarVoosDisponiveis(env.flightCacheUrl, Date.now(), env.flightCacheMaxAgeMin, signal),
    enabled: env.flightCacheUrl !== '',
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000, // só com a tela aberta; sem trabalho em segundo plano
  });
}
