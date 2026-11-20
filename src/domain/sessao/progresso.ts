/**
 * Contas da tela em voo, só pelo relógio (sem timers em segundo plano).
 */
import type { PausaPlanejada } from './pausas';

/** Fração do tempo do usuário já voada (0 a 1), entre o embarque e o pouso: anda o avião da barra de rota. */
export function progressoDaSessao(embarcouEm: number, pousoPrevistoEm: number, agora: number): number {
  const total = pousoPrevistoEm - embarcouEm;
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (agora - embarcouEm) / total));
}

/** Minutos que faltam (arredondados para cima, nunca negativos). */
export const minutosAte = (instante: number, agora: number) => Math.max(0, Math.ceil((instante - agora) / 60_000));

/** A próxima pausa que ainda não começou, com os minutos até ela; `null` se não há mais pausas. */
export function proximaPausa(embarcouEm: number, pausas: PausaPlanejada[], agora: number): { indice: number; emMin: number } | null {
  for (let i = 0; i < pausas.length; i++) {
    const inicio = embarcouEm + pausas[i].inicioMin * 60_000;
    if (inicio > agora) return { indice: i, emMin: minutosAte(inicio, agora) };
  }
  return null;
}

/**
 * A pausa do serviço de bordo em andamento agora (E2), com o que falta dela; `null` fora das pausas.
 * `voltouAntes` lista os índices em que o usuário tocou em "Voltar ao foco" (RN-06): essas pausas acabam ali.
 */
export function pausaEmAndamento(
  embarcouEm: number,
  pausas: PausaPlanejada[],
  agora: number,
  voltouAntes: readonly number[] = [],
): { indice: number; fimEm: number; restanteMs: number } | null {
  for (let i = 0; i < pausas.length; i++) {
    const inicio = embarcouEm + pausas[i].inicioMin * 60_000;
    const fimEm = embarcouEm + pausas[i].fimMin * 60_000;
    if (agora >= inicio && agora < fimEm && !voltouAntes.includes(i)) return { indice: i, fimEm, restanteMs: fimEm - agora };
  }
  return null;
}

/** A pausa que terminou há menos de `janelaMs` (para o aviso "De volta ao foco", E1); `null` se nenhuma. */
export function pausaRecemTerminada(
  embarcouEm: number,
  pausas: PausaPlanejada[],
  agora: number,
  janelaMs: number,
): { indice: number; fimEm: number } | null {
  for (let i = pausas.length - 1; i >= 0; i--) {
    const fimEm = embarcouEm + pausas[i].fimMin * 60_000;
    if (agora >= fimEm && agora - fimEm < janelaMs) return { indice: i, fimEm };
  }
  return null;
}

/** Contagem regressiva no formato m:ss (ex.: 4:12). */
export function relogioRegressivo(restanteMs: number): string {
  const s = Math.max(0, Math.ceil(restanteMs / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
