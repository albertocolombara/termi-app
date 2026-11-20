/**
 * Etapas reais da tela de embarque (UC-02 passos 7–8; UC-03).
 *
 * 1. Localizar o avião: relê o cache de voos e confere se o voo ainda está no ar (UC-02 E2).
 * 2. Baixar a paisagem da rota: blocos do R2 da posição atual até o destino (A4: pode falhar).
 * 3. Preparar a janela: grava a sessão (uma transação), agenda os avisos e mostra a notificação fixa.
 *
 * Nada é gravado antes da etapa 3: cancelar o embarque não deixa registro (UC-02 A5).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useQueryClient } from '@tanstack/react-query';

import { env } from '@/config/env';
import { baixarBlocos } from '@/data/blocos/baixarBlocos';
import { baixarNuvensDaRota } from '@/data/nuvens/nuvens';
import { useAjustes } from '@/data/preferencias/ajustes';
import { criarSessao } from '@/data/sessoes/repositorio';
import { CHAVE_SESSAO_EM_ANDAMENTO } from '@/data/sessoes/useSessaoEmAndamento';
import { buscarVoosDisponiveis } from '@/data/voos/useVoos';
import { DURACAO_MINIMA_MIN } from '@/domain/sessao/duracao';
import { nuvensDaRota } from '@/domain/janela/nuvens';
import { MOTIVO_VAZIO } from '@/domain/sessao/motivo';
import { agendaDePausas, horariosDasPausas, PAUSA_MAXIMA_MIN } from '@/domain/sessao/pausas';
import { blocosSuficientes, camadasParaBaixar, dividirBlocos, MINUTOS_NO_EMBARQUE } from '@/domain/voos/blocosDaRota';
import { minutosAtePouso } from '@/domain/voos/elegibilidade';
import { distanciaKm } from '@/domain/voos/geo';
import { projetar } from '@/domain/voos/projecao';
import type { Voo } from '@/domain/voos/tipos';
import { agendarAvisosDoVoo, mostrarNotificacaoFixa } from '@/services/avisos';

import { codigoDoLugar, nomeDoLugar } from './formato';
import { useNovoVoo } from './novoVoo';

export type EtapaDoEmbarque =
  | { tipo: 'localizando' }
  | { tipo: 'baixando'; voo: Voo; faltaKm: number; feitos: number; total: number }
  | { tipo: 'preparando'; voo: Voo; faltaKm: number; comGlobo: boolean }
  | { tipo: 'paisagem-falhou'; voo: Voo; faltaKm: number }
  | { tipo: 'voo-sumiu' }
  | { tipo: 'sem-internet' }
  | { tipo: 'embarcou'; sessaoId: string };

export function useEmbarque({ caminhoRapido }: { caminhoRapido: boolean }) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const { vooHex, motivo, setMotivo, setVoo } = useNovoVoo();
  const ajustes = useAjustes();
  const [etapa, setEtapa] = useState<EtapaDoEmbarque>({ tipo: 'localizando' });
  const controle = useRef<AbortController | null>(null);
  const vooRef = useRef<{ voo: Voo; faltaKm: number; vooDeOntem: boolean } | null>(null);

  const preparar = useCallback(
    async (voo: Voo, faltaKm: number, vooDeOntem: boolean, comGlobo: boolean, sinal: AbortSignal) => {
      setEtapa({ tipo: 'preparando', voo, faltaKm, comGlobo });
      const embarcouEm = Date.now();
      const pousoPrevistoEm = voo.pousoPrevistoEm;
      const sessaoId = await criarSessao(db, {
        voo,
        embarcouEm,
        pousoPrevistoEm,
        intervaloServico: ajustes.servicoDeBordo,
        motivo: caminhoRapido ? MOTIVO_VAZIO : motivo,
        vooDeOntem,
      });
      if (sinal.aborted) return; // a sessão já está gravada; a tela em voo a encontra ao abrir o app
      const duracaoMin = Math.round((pousoPrevistoEm - embarcouEm) / 60_000);
      const pausas = horariosDasPausas(embarcouEm, agendaDePausas(duracaoMin, ajustes.servicoDeBordo));
      try {
        await agendarAvisosDoVoo({ pousoEm: pousoPrevistoEm, minutosDeVoo: duracaoMin, cidadeDestino: nomeDoLugar(voo.destino), pausas, pausaMin: PAUSA_MAXIMA_MIN, avisoDePouso: ajustes.avisoDePouso });
        mostrarNotificacaoFixa(`${codigoDoLugar(voo.origem)} → ${codigoDoLugar(voo.destino)}`, pousoPrevistoEm);
      } catch {
        // Sem permissão de avisos o voo segue; os Ajustes avisam que os avisos podem não tocar (UC-05 E1).
      }
      await queryClient.invalidateQueries({ queryKey: CHAVE_SESSAO_EM_ANDAMENTO });
      setMotivo(MOTIVO_VAZIO);
      setVoo(null);
      setEtapa({ tipo: 'embarcou', sessaoId });
    },
    [ajustes, caminhoRapido, db, motivo, queryClient, setMotivo, setVoo],
  );

  const baixar = useCallback(
    async (voo: Voo, faltaKm: number, vooDeOntem: boolean, sinal: AbortSignal) => {
      const agora = Date.now();
      // Só os primeiros minutos da rota seguram o embarque; o resto baixa durante o voo (useBlocosDoVoo).
      const limite = Math.min(voo.pousoPrevistoEm, agora + MINUTOS_NO_EMBARQUE * 60_000);
      const blocos = dividirBlocos(projetar(voo, agora), projetar(voo, limite), voo.destino, camadasParaBaixar(ajustes.qualidadeDaJanela)).noEmbarque;
      setEtapa({ tipo: 'baixando', voo, faltaKm, feitos: 0, total: blocos.length });
      const r = await baixarBlocos(blocos, (p) => setEtapa({ tipo: 'baixando', voo, faltaKm, ...p }), sinal);
      if (sinal.aborted) return;
      // Nuvens reais da rota inteira (~0,3 a 1 MB). Se falhar, a janela usa as nuvens geradas.
      await baixarNuvensDaRota(nuvensDaRota(projetar(voo, agora), voo.destino), sinal).catch(() => {});
      if (sinal.aborted) return;
      if (!blocosSuficientes(r.total, r.falhas)) {
        setEtapa({ tipo: 'paisagem-falhou', voo, faltaKm });
        return;
      }
      await preparar(voo, faltaKm, vooDeOntem, false, sinal);
    },
    [ajustes.qualidadeDaJanela, preparar],
  );

  const comecar = useCallback(async () => {
    controle.current?.abort();
    const c = new AbortController();
    controle.current = c;
    setEtapa({ tipo: 'localizando' });
    let dados;
    try {
      dados = await queryClient.fetchQuery({
        queryKey: ['voos', 'disponiveis'],
        queryFn: ({ signal }) => buscarVoosDisponiveis(env.flightCacheUrl, Date.now(), env.flightCacheMaxAgeMin, signal),
        staleTime: 0,
      });
    } catch {
      if (!c.signal.aborted) setEtapa({ tipo: 'sem-internet' });
      return;
    }
    if (c.signal.aborted) return;
    const agora = Date.now();
    const voo = dados.voos.find((v) => v.hex === vooHex);
    // O avião precisa ainda estar no ar e com pelo menos o tempo mínimo de foco pela frente.
    if (!voo || minutosAtePouso(voo, agora) < DURACAO_MINIMA_MIN) {
      setEtapa({ tipo: 'voo-sumiu' });
      return;
    }
    const faltaKm = distanciaKm(projetar(voo, agora), voo.destino);
    vooRef.current = { voo, faltaKm, vooDeOntem: dados.origem === 'ontem' };
    await baixar(voo, faltaKm, dados.origem === 'ontem', c.signal);
  }, [baixar, queryClient, vooHex]);

  useEffect(() => {
    // Começa uma vez ao abrir a tela; ao sair, cancela o que estiver em andamento.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    comecar();
    return () => controle.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tentarDeNovo = useCallback(() => {
    const v = vooRef.current;
    if (!v) return comecar();
    const c = new AbortController();
    controle.current = c;
    return baixar(v.voo, v.faltaKm, v.vooDeOntem, c.signal);
  }, [baixar, comecar]);

  const embarcarComGlobo = useCallback(() => {
    const v = vooRef.current;
    if (!v) return;
    const c = new AbortController();
    controle.current = c;
    return preparar(v.voo, v.faltaKm, v.vooDeOntem, true, c.signal);
  }, [preparar]);

  const cancelar = useCallback(() => controle.current?.abort(), []);

  return { etapa, tentarDeNovo, embarcarComGlobo, cancelar, recomecar: comecar };
}
