/**
 * Classe do usuário (econômica ou primeira). Único lugar que decide o direito a recursos premium
 * (CLAUDE.md §6.8). Por enquanto todos estão na econômica: o RevenueCat entra na Fase 4.
 */
import type { Classe } from '@/domain/sessao/duracao';

export function useClasse(): Classe {
  return 'economica';
}
