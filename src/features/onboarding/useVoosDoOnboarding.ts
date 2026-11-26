/** Voos do cache para as ilustrações do onboarding. Só lê o cache (CLAUDE.md §7). */
import { useEffect, useMemo } from 'react';

import { useVoosDisponiveis } from '@/data/voos/useVoos';
import { baixarBlocos } from '@/data/blocos/baixarBlocos';
import { useAjustes } from '@/data/preferencias/ajustes';
import { vooDaJanela, vooEmDestaque } from '@/domain/onboarding/voos';
import { blocosDaRota, camadasParaBaixar } from '@/domain/voos/blocosDaRota';
import { sun } from '@/janela/geo';
import type { Voo } from '@/domain/voos/tipos';
import { duracao, nomeDoLugar } from '@/features/voo/formato';
import { useRelogio } from '@/features/voo/useRelogio';
import { t } from '@/i18n';
import { minutosAtePouso } from '@/domain/voos/elegibilidade';
import { projetar } from '@/domain/voos/projecao';

const SEM_VOOS: Voo[] = [];

export function useVoosDoOnboarding(intervaloMs = 10_000) {
  const { agora, ativo } = useRelogio(intervaloMs);
  const consulta = useVoosDisponiveis();
  const voos = consulta.data?.voos ?? SEM_VOOS;
  // Hora da consulta: as escolhas de voo ficam estáveis enquanto a lista não muda.
  const consultadoEm = consulta.data?.consultadoEm ?? 0;
  return { voos, aoVivo: consulta.data?.origem === 'ao-vivo', carregando: consulta.isPending, agora, ativo, consultadoEm };
}

/** Voo em destaque no globo (OB1 e OB2), com a etiqueta "CALLSIGN · Origem → Destino · 52 min". */
export function useDestaque(voos: Voo[], consultadoEm: number, agora: number) {
  // Escolhido uma vez por lista: não troca de avião a cada minuto.
  const voo = useMemo(() => vooEmDestaque(voos, consultadoEm), [voos, consultadoEm]);
  if (!voo) return null;
  const p = projetar(voo, agora);
  return {
    voo,
    origem: { lat: voo.origem.lat, lon: voo.origem.lon },
    destino: { lat: voo.destino.lat, lon: voo.destino.lon },
    aviao: { lat: p.lat, lon: p.lon, rumo: p.rumo },
    rotulo: t('onboarding.rotuloDoDestaque', {
      callsign: voo.callsign,
      origem: nomeDoLugar(voo.origem),
      destino: nomeDoLugar(voo.destino),
      tempo: duracao(Math.max(0, minutosAtePouso(voo, agora))),
    }),
  };
}

/** Voo da janela do OB10 (de dia ou no pôr do sol), o mesmo enquanto a lista não muda. */
export function useVooDaJanela(voos: Voo[], consultadoEm: number) {
  return useMemo(() => vooDaJanela(voos, consultadoEm, (lat, lon, ms) => (sun(ms, lat, lon).el * 180) / Math.PI), [voos, consultadoEm]);
}

/**
 * Paisagem dos próximos minutos do voo da janela, baixada antes de o OB10 abrir (do OB8 em diante),
 * só o trecho que aparece na tela, não a rota inteira.
 */
export function usePaisagemDaJanela(voo: Voo | null, ativo: boolean) {
  const qualidade = useAjustes((a) => a.qualidadeDaJanela);
  useEffect(() => {
    if (!voo || !ativo) return;
    const controle = new AbortController();
    const agora = Date.now();
    const ate = Math.min(voo.pousoPrevistoEm, agora + MINUTOS_DE_PAISAGEM * 60_000);
    if (ate > agora) baixarBlocos(blocosDaRota(projetar(voo, agora), projetar(voo, ate), camadasParaBaixar(qualidade)), () => {}, controle.signal).catch(() => {});
    return () => controle.abort();
  }, [voo, ativo, qualidade]);
}

const MINUTOS_DE_PAISAGEM = 6;
