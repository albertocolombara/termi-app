import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import { CHAVE_HISTORICO } from '@/data/historico/useHistorico';

import { comprarSouvenir, pousosCompletos, souvenirDaMala, type PedidoDeCompra } from './loja';

/** Pousos completos (países cuja loja já abriu), do mais recente ao mais antigo. */
export function usePousosCompletos() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: [...CHAVE_HISTORICO, 'pousos'], queryFn: () => pousosCompletos(db) });
}

/** Compra numa transação e atualiza saldo, mala e contagens. */
export function useComprarSouvenir() {
  const db = useSQLiteContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Omit<PedidoDeCompra, 'quando'>) => comprarSouvenir(db, { ...p, quando: Date.now() }),
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE_HISTORICO }),
  });
}

/** Detalhes de um souvenir comprado (M1b). */
export function useSouvenirDaMala(souvenirId: string) {
  const db = useSQLiteContext();
  return useQuery({ queryKey: [...CHAVE_HISTORICO, 'souvenir', souvenirId], queryFn: () => souvenirDaMala(db, souvenirId) });
}
