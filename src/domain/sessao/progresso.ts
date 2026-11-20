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
