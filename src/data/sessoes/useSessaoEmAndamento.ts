import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import type { MotivoDaViagem } from '@/domain/sessao/motivo';

import { motivoDaSessao, salvarMotivoDaSessao, sessaoEmAndamento, sessaoEncerrada } from './repositorio';

export const CHAVE_SESSAO_EM_ANDAMENTO = ['sessao', 'em-andamento'] as const;

/** Sessão aberta no SQLite (sobrevive ao app fechado e ao reinício: o estado sai do relógio). */
export function useSessaoEmAndamento() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: CHAVE_SESSAO_EM_ANDAMENTO, queryFn: () => sessaoEmAndamento(db) });
}

/** Sessão encerrada, para a tela de pouso (E6/E7). */
export function useSessaoEncerrada(id: string | undefined) {
  const db = useSQLiteContext();
  return useQuery({ queryKey: ['sessao', id], queryFn: () => sessaoEncerrada(db, id ?? ''), enabled: !!id });
}

/** Motivo da viagem da sessão em voo (04B), lido e salvo no SQLite. */
export function useMotivoDaSessao(id: string) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const chave = ['sessao', id, 'motivo'];
  const q = useQuery({ queryKey: chave, queryFn: () => motivoDaSessao(db, id) });
  const salvar = useMutation({
    mutationFn: (m: MotivoDaViagem) => salvarMotivoDaSessao(db, id, m),
    onMutate: (m) => queryClient.setQueryData(chave, m),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chave }),
  });
  return { motivo: q.data, salvar: salvar.mutate };
}
