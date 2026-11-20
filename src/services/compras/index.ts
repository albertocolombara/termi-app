/**
 * Classe do usuário (econômica ou primeira). Único lugar que decide o direito a recursos premium
 * (CLAUDE.md §6.8). O RevenueCat entra na Fase 4.
 *
 * Enquanto isso, só em builds de desenvolvimento e preview, dá para trocar a classe para testar
 * (pedido do Alberto em 20/11/2026). Em produção a troca não existe e a classe é sempre a do RevenueCat.
 */
import { Storage } from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import { mostrarFerramentasDev } from '@/config/env';
import type { Classe } from '@/domain/sessao/duracao';

const CHAVE = 'teste.classe';

function classeSalva(): Classe {
  if (!mostrarFerramentasDev) return 'economica';
  try {
    return Storage.getItemSync(CHAVE) === 'primeira' ? 'primeira' : 'economica';
  } catch {
    return 'economica';
  }
}

const useClasseDeTeste = create<{ classe: Classe; trocar: (c: Classe) => void }>((set) => ({
  classe: classeSalva(),
  trocar: (classe) => {
    if (!mostrarFerramentasDev) return;
    try {
      Storage.setItemSync(CHAVE, classe);
    } catch {
      // sem persistência: vale só nesta sessão do app
    }
    set({ classe });
  },
}));

export function useClasse(): Classe {
  return useClasseDeTeste((s) => s.classe);
}

/** Só para teste (dev e preview): troca entre econômica e primeira classe. */
export function useTrocarClasseDeTeste() {
  return useClasseDeTeste((s) => s.trocar);
}
