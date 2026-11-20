/**
 * Dial de tempo de foco. PRD: RN-01, RN-02; UC-02. Figma: "Dial de tempo / com voos".
 *
 * - Uma volta = 15 min a 6 h, de 5 em 5 min (70 posições; o topo é 15 min).
 * - Uma barra por posição: comprimento = voos no ar que pousam naquele tempo.
 * - Barras dentro da janela aceita (±10 min do tempo escolhido) ficam em destaque.
 * - A faixa acima de 3 h é da primeira classe: aparece marcada, sem abrir paywall (RN-20).
 */
import { DURACAO_MAXIMA_PRIMEIRA_MIN, DURACAO_MINIMA_MIN } from '../sessao/duracao';
import { minutosAtePouso, TOLERANCIA_ELEGIVEL_MIN } from './elegibilidade';
import type { Voo } from './tipos';

export const PASSO_DIAL_MIN = 5;
export const POSICOES_DIAL = (DURACAO_MAXIMA_PRIMEIRA_MIN - DURACAO_MINIMA_MIN) / PASSO_DIAL_MIN + 1; // 70

export type BarraDoDial = { minutos: number; voos: number; naJanela: boolean };

/** Ângulo (graus, 0 = topo, horário) de um tempo no dial. */
export function anguloDoTempo(minutos: number): number {
  return ((minutos - DURACAO_MINIMA_MIN) / PASSO_DIAL_MIN) * (360 / POSICOES_DIAL);
}

const limitar = (m: number) => Math.min(DURACAO_MAXIMA_PRIMEIRA_MIN, Math.max(DURACAO_MINIMA_MIN, m));

/**
 * Tempo pelo ângulo do dedo. Não dá a volta: perto do topo, fica no extremo de onde veio
 * (quem gira de 5h55 para frente para em 6 h, não pula para 15 min).
 */
export function tempoDoAngulo(angulo: number, anterior: number): number {
  const a = ((angulo % 360) + 360) % 360;
  const bruto = DURACAO_MINIMA_MIN + Math.round(a / (360 / POSICOES_DIAL)) * PASSO_DIAL_MIN;
  const novo = bruto > DURACAO_MAXIMA_PRIMEIRA_MIN ? DURACAO_MINIMA_MIN : bruto; // a última fatia volta ao topo
  const meio = (DURACAO_MINIMA_MIN + DURACAO_MAXIMA_PRIMEIRA_MIN) / 2;
  if (Math.abs(novo - anterior) > meio) return anterior > meio ? DURACAO_MAXIMA_PRIMEIRA_MIN : DURACAO_MINIMA_MIN;
  return limitar(novo);
}

/** Barras do dial a partir dos voos do cache. */
export function barrasDoDial(voos: Voo[], agora: number, escolhido: number): BarraDoDial[] {
  const contagem = new Map<number, number>();
  for (const v of voos) {
    const m = Math.round(minutosAtePouso(v, agora) / PASSO_DIAL_MIN) * PASSO_DIAL_MIN;
    if (m >= DURACAO_MINIMA_MIN && m <= DURACAO_MAXIMA_PRIMEIRA_MIN) contagem.set(m, (contagem.get(m) ?? 0) + 1);
  }
  return Array.from({ length: POSICOES_DIAL }, (_, i) => {
    const minutos = DURACAO_MINIMA_MIN + i * PASSO_DIAL_MIN;
    return { minutos, voos: contagem.get(minutos) ?? 0, naJanela: Math.abs(minutos - escolhido) <= TOLERANCIA_ELEGIVEL_MIN };
  });
}

/** Texto do tempo no dial: "~50 min", "~1h30", "~6 h". */
export function rotuloDoTempo(minutos: number): string {
  if (minutos < 60) return `~${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `~${h} h` : `~${h}h${String(m).padStart(2, '0')}`;
}
