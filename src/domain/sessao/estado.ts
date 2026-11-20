/**
 * Estado da sessão calculado só pelo relógio (ARCHITECTURE §6; CLAUDE.md §6.4).
 * Nada roda em segundo plano: ao abrir o app, o estado sai de `embarcouEm`, `pousoPrevistoEm`,
 * das pausas e do que o usuário escolheu. PRD: RN-06, RN-09, RN-09a, RN-09b, RN-10; estados E1–E8.
 */
import type { PausaPlanejada } from './pausas';

/** O que o cache diz do avião real agora. */
export type AviaoReal = 'no-ar' | 'pousou' | 'desconhecido';

export type Sessao = {
  embarcouEm: number;
  /** Fixado no embarque: é o fim do tempo do usuário (RN-09). */
  pousoPrevistoEm: number;
  pausas: PausaPlanejada[];
  /** Pausas em que o usuário tocou em "Voltar ao foco": índice da pausa -> quando voltou (ms). */
  voltouAntes?: Record<number, number>;
  /** O usuário escolheu "Continuar até o pouso" no estado Em espera (RN-09a). */
  continuarAtePousoDesde?: number;
  /** Fim da sessão, se já encerrou. */
  encerramento?: { em: number; tipo: 'pousar-antes' | 'pouso' };
};

export type EstadoDaSessao =
  | { tipo: 'em-voo' }
  | { tipo: 'servico-de-bordo'; indice: number; terminaEm: number } // E2
  | { tipo: 'em-solo' } // E8: avião real pousou antes do horário; o foco segue
  | { tipo: 'em-espera' } // E5: horário chegou, avião real no ar; usuário escolhe
  | { tipo: 'continuando-ate-o-pouso' } // RN-09a
  | { tipo: 'pousou'; em: number } // E6: pouso completo
  | { tipo: 'pousou-antes'; em: number }; // E7

export function estadoDaSessao(s: Sessao, agora: number, aviao: AviaoReal): EstadoDaSessao {
  if (s.encerramento) {
    return s.encerramento.tipo === 'pousar-antes'
      ? { tipo: 'pousou-antes', em: s.encerramento.em }
      : { tipo: 'pousou', em: s.encerramento.em };
  }

  if (agora >= s.pousoPrevistoEm) {
    // O tempo do usuário acabou: o pouso completo já está garantido (RN-09).
    if (s.continuarAtePousoDesde !== undefined) {
      return aviao === 'pousou' ? { tipo: 'pousou', em: agora } : { tipo: 'continuando-ate-o-pouso' };
    }
    return aviao === 'no-ar' ? { tipo: 'em-espera' } : { tipo: 'pousou', em: s.pousoPrevistoEm };
  }

  for (let i = 0; i < s.pausas.length; i++) {
    const inicio = s.embarcouEm + s.pausas[i].inicioMin * 60_000;
    const fim = s.embarcouEm + s.pausas[i].fimMin * 60_000;
    const voltou = s.voltouAntes?.[i];
    if (agora >= inicio && agora < fim && (voltou === undefined || voltou > agora)) {
      return { tipo: 'servico-de-bordo', indice: i, terminaEm: fim };
    }
  }

  return aviao === 'pousou' ? { tipo: 'em-solo' } : { tipo: 'em-voo' };
}
