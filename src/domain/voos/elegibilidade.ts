/**
 * Voos elegíveis para o tempo escolhido no dial. PRD: RN-01, RN-02; UC-02.
 *
 * - Elegível: no ar e com pouso previsto a até 10 min do tempo escolhido.
 * - Ordem: menor diferença primeiro.
 * - O tempo do foco é o do voo escolhido (RN-09), então o voo também precisa caber na
 *   duração permitida da classe (mínimo de 15 min; econômica até 3 h; primeira até 6 h).
 */
import { validarDuracao, type Classe } from '../sessao/duracao';
import type { Voo } from './tipos';

export const TOLERANCIA_ELEGIVEL_MIN = 10;

export type VooElegivel = { voo: Voo; minutosAtePouso: number; diferencaMin: number };

export const minutosAtePouso = (voo: Voo, agora: number) => Math.round((voo.pousoPrevistoEm - agora) / 60_000);

export function voosElegiveis(voos: Voo[], tempoEscolhidoMin: number, agora: number, classe: Classe): VooElegivel[] {
  const vistos = new Set<string>();
  return voos
    .map((voo) => {
      const min = minutosAtePouso(voo, agora);
      return { voo, minutosAtePouso: min, diferencaMin: Math.abs(min - tempoEscolhidoMin) };
    })
    .filter((e) => e.diferencaMin <= TOLERANCIA_ELEGIVEL_MIN && validarDuracao(e.minutosAtePouso, classe).ok)
    .sort((a, b) => a.diferencaMin - b.diferencaMin || a.minutosAtePouso - b.minutosAtePouso)
    .filter((e) => (vistos.has(e.voo.hex) ? false : (vistos.add(e.voo.hex), true))); // mesmo avião em duas regiões
}

/**
 * Sem voo elegível: tempos próximos que têm voos (UC-02, fluxo "nenhum voo encaixa").
 * Cada sugestão é a duração de um voo de verdade, arredondada a 5 min, sem repetir;
 * as mais perto do tempo escolhido primeiro, devolvidas em ordem crescente.
 */
export function temposProximos(voos: Voo[], tempoEscolhidoMin: number, agora: number, classe: Classe, quantos = 3): number[] {
  const tempos = new Set<number>();
  for (const v of voos) {
    const t = Math.round(minutosAtePouso(v, agora) / 5) * 5;
    if (validarDuracao(t, classe).ok && validarDuracao(minutosAtePouso(v, agora), classe).ok) tempos.add(t);
  }
  return [...tempos]
    .sort((a, b) => Math.abs(a - tempoEscolhidoMin) - Math.abs(b - tempoEscolhidoMin) || a - b)
    .slice(0, quantos)
    .sort((a, b) => a - b);
}
