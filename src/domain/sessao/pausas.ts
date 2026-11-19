/**
 * Agenda do serviço de bordo (pausa do Pomodoro). PRD: RN-05, RN-06, RN-07; UC-05.
 *
 * - Intervalos: a cada 25 min (padrão), a cada 50 min ou desligado.
 * - Pausa de no máximo 5 min, em qualquer intervalo.
 * - Nenhuma pausa em voos de até 30 min.
 * - Folga mínima: precisa sobrar pelo menos 10 min de voo depois que a pausa termina.
 * - O voo segue no horário: as pausas não mudam o pouso nem descontam minutos.
 */

export type IntervaloServicoDeBordo = 25 | 50 | 'desligado';

export const INTERVALO_PADRAO: IntervaloServicoDeBordo = 25;
export const PAUSA_MAXIMA_MIN = 5;
export const VOO_SEM_PAUSA_ATE_MIN = 30;
export const FOLGA_MINIMA_DEPOIS_DA_PAUSA_MIN = 10;

/** Pausa em minutos desde o embarque. */
export type PausaPlanejada = { inicioMin: number; fimMin: number };

export function agendaDePausas(duracaoMin: number, intervalo: IntervaloServicoDeBordo): PausaPlanejada[] {
  if (intervalo === 'desligado' || duracaoMin <= VOO_SEM_PAUSA_ATE_MIN) return [];

  const pausas: PausaPlanejada[] = [];
  // Ciclo = foco + pausa (25 + 5 = 30 min; 50 + 5 = 55 min).
  for (let inicio = intervalo; ; inicio += intervalo + PAUSA_MAXIMA_MIN) {
    const fim = inicio + PAUSA_MAXIMA_MIN;
    if (fim + FOLGA_MINIMA_DEPOIS_DA_PAUSA_MIN > duracaoMin) break;
    pausas.push({ inicioMin: inicio, fimMin: fim });
  }
  return pausas;
}

/** Converte a agenda em horários absolutos (ms), a partir do embarque. */
export function horariosDasPausas(embarcouEm: number, pausas: PausaPlanejada[]) {
  return pausas.map((p) => ({ inicio: embarcouEm + p.inicioMin * 60_000, fim: embarcouEm + p.fimMin * 60_000 }));
}
