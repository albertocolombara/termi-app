import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import { carimbos, contagens, souvenirsNaMala, voosEncerrados } from './repositorio';

/** Chave comum das leituras do histórico: invalidar depois de encerrar um voo. */
export const CHAVE_HISTORICO = ['historico'] as const;

/** Voos encerrados, do mais recente para o mais antigo. */
export function useVoosEncerrados() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: [...CHAVE_HISTORICO, 'voos'], queryFn: () => voosEncerrados(db) });
}

/** Saldo, carimbos e souvenirs (cabeçalho do Início e menu lateral). */
export function useContagens() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: [...CHAVE_HISTORICO, 'contagens'], queryFn: () => contagens(db) });
}

/** Carimbos do passaporte. */
export function useCarimbos() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: [...CHAVE_HISTORICO, 'carimbos'], queryFn: () => carimbos(db) });
}

/** Souvenirs na mala (ids do catálogo). */
export function useSouvenirsNaMala() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: [...CHAVE_HISTORICO, 'mala'], queryFn: () => souvenirsNaMala(db) });
}
