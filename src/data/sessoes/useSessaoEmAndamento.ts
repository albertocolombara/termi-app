import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import { sessaoEmAndamento } from './repositorio';

export const CHAVE_SESSAO_EM_ANDAMENTO = ['sessao', 'em-andamento'] as const;

/** Sessão aberta no SQLite (sobrevive ao app fechado e ao reinício: o estado sai do relógio). */
export function useSessaoEmAndamento() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: CHAVE_SESSAO_EM_ANDAMENTO, queryFn: () => sessaoEmAndamento(db) });
}
