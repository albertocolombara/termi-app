/**
 * Duração do voo (tempo de foco). PRD: RN-01, RF-09.
 * O tempo de foco é a própria duração do voo: as pausas do serviço de bordo não descontam (RN-03).
 */

export type Classe = 'economica' | 'primeira';

/** Tempo mínimo de foco, em minutos (decidido em 19/11/2026). */
export const DURACAO_MINIMA_MIN = 15;
/** Teto da econômica: voos de até 3 h, inclusive. */
export const DURACAO_MAXIMA_ECONOMICA_MIN = 180;
/** Teto da primeira classe na v1: 6 h. */
export const DURACAO_MAXIMA_PRIMEIRA_MIN = 360;

export function duracaoMaxima(classe: Classe): number {
  return classe === 'primeira' ? DURACAO_MAXIMA_PRIMEIRA_MIN : DURACAO_MAXIMA_ECONOMICA_MIN;
}

export type ResultadoDuracao =
  | { ok: true }
  | { ok: false; motivo: 'abaixo-do-minimo' | 'acima-do-maximo' }
  | { ok: false; motivo: 'primeira-classe' };

/**
 * Valida uma duração escolhida no dial.
 * Na econômica, acima de 3 h o dial mostra "primeira classe" (sem abrir paywall): motivo `primeira-classe`.
 */
export function validarDuracao(minutos: number, classe: Classe): ResultadoDuracao {
  if (!Number.isFinite(minutos) || minutos < DURACAO_MINIMA_MIN) return { ok: false, motivo: 'abaixo-do-minimo' };
  if (minutos > DURACAO_MAXIMA_PRIMEIRA_MIN) return { ok: false, motivo: 'acima-do-maximo' };
  if (minutos > duracaoMaxima(classe)) return { ok: false, motivo: 'primeira-classe' };
  return { ok: true };
}
