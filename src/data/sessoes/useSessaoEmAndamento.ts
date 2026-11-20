import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import { sessaoEmAndamento, sessaoEncerrada } from './repositorio';

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
