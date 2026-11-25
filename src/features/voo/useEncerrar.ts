/**
 * Encerra a sessão (pouso ou pousar antes), credita numa transação e abre a tela de pouso.
 * UC-06 e UC-08. Depois do encerramento, os avisos e a notificação fixa saem.
 */
import { useCallback, useRef } from 'react';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useQueryClient } from '@tanstack/react-query';

import { CHAVE_HISTORICO } from '@/data/historico/useHistorico';
import { encerrarSessao, type SessaoGravada } from '@/data/sessoes/repositorio';
import { CHAVE_SESSAO_EM_ANDAMENTO } from '@/data/sessoes/useSessaoEmAndamento';
import { fimPousandoAntes, fimPousando } from '@/domain/sessao/encerramento';
import { rendimentos } from '@/domain/sessao/rendimentos';
import { cancelarAvisos, esconderNotificacaoFixa } from '@/services/avisos';

export function useEncerrar(sessao: SessaoGravada) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const emAndamento = useRef(false);

  return useCallback(
    /** `continuacao`: fim de "Continuar até o pouso" (RN-09a), com os minutos a mais. */
    async (tipo: 'pouso' | 'pousar-antes', agora = Date.now(), continuacao?: { desde: number }) => {
      if (emAndamento.current) return;
      emAndamento.current = true;
      try {
        const fim = tipo === 'pouso' ? (continuacao ? fimPousando(sessao, agora, continuacao.desde) : fimPousando(sessao)) : fimPousandoAntes(sessao, agora);
        await encerrarSessao(db, { sessaoId: sessao.id, tipo, encerrouEm: fim.encerrouEm, rendimentos: rendimentos(fim), voo: sessao.voo });
        // Pousar antes cancela o aviso de pouso; no pouso ele já tocou ou é inútil.
        await cancelarAvisos();
        try {
          esconderNotificacaoFixa();
        } catch {
          // módulo nativo ausente (ex.: testes): nada a esconder
        }
        await queryClient.invalidateQueries({ queryKey: CHAVE_SESSAO_EM_ANDAMENTO });
        // Início, diário e estatísticas passam a mostrar o voo novo.
        await queryClient.invalidateQueries({ queryKey: CHAVE_HISTORICO });
        router.replace({ pathname: '/voo/pouso', params: { id: sessao.id } });
      } finally {
        emAndamento.current = false;
      }
    },
    [db, queryClient, sessao],
  );
}
