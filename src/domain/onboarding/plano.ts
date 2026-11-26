/**
 * Plano de voo do onboarding (Figma "Onboarding · v3", OB3–OB7). PRD: RF-02; UC-01.
 * Regras puras: o que cada escolha muda e a projeção de milhas mostrada no OB5 e no OB7.
 */
import { CATEGORIAS, type Categoria } from '@/domain/sessao/motivo';
import type { IntervaloServicoDeBordo } from '@/domain/sessao/pausas';
import { NIVEIS, statusDeViajante, type Nivel } from '@/domain/status/niveis';

/** Média de velocidade de cruzeiro dos jatos usada na projeção (milhas por hora de voo). */
export const MILHAS_POR_HORA = 540;
/** Circunferência da Terra no equador, em milhas (aprox.). */
export const VOLTA_AO_MUNDO_MILHAS = 24_900;
/** Período da projeção do OB7. */
export const DIAS_DA_PROJECAO = 30;

// ───────── OB3 · No que você precisa focar ─────────

/** Marcadas por padrão no OB3 (Figma). */
export const CATEGORIAS_PADRAO: readonly Categoria[] = ['estudo', 'trabalho'];

/** Alterna uma categoria, mantendo a ordem do catálogo. */
export function alternarCategoria(atuais: readonly Categoria[], c: Categoria): Categoria[] {
  const set = new Set(atuais);
  if (set.has(c)) set.delete(c);
  else set.add(c);
  return CATEGORIAS.filter((x) => set.has(x));
}

// ───────── OB4 · Por quanto tempo você foca ─────────

export const OPCOES_DE_TEMPO = ['15', '25', '50', '90'] as const;
export type OpcaoDeTempo = (typeof OPCOES_DE_TEMPO)[number];
export const OPCAO_DE_TEMPO_PADRAO: OpcaoDeTempo = '25';

/**
 * Tempo em que o dial abre e intervalo do serviço de bordo para cada resposta.
 * "90 min ou mais" abre o dial em 90; 15 e 25 usam o intervalo de 25 (padrão); 50 e 90, o de 50.
 */
export function planoDoTempo(o: OpcaoDeTempo): { tempoMin: number; servicoDeBordo: IntervaloServicoDeBordo } {
  switch (o) {
    case '15':
      return { tempoMin: 15, servicoDeBordo: 25 };
    case '25':
      return { tempoMin: 25, servicoDeBordo: 25 };
    case '50':
      return { tempoMin: 50, servicoDeBordo: 50 };
    case '90':
      return { tempoMin: 90, servicoDeBordo: 50 };
  }
}

// ───────── OB5 · Meta diária ─────────

export const METAS_DIARIAS_H = [1, 2, 4, 6] as const;
export type MetaDiariaH = (typeof METAS_DIARIAS_H)[number];
export const META_DIARIA_PADRAO: MetaDiariaH = 2;

export function milhasPorDia(metaH: number): number {
  return Math.round(Math.max(0, metaH) * MILHAS_POR_HORA);
}

// ───────── OB7 · Onde você chega em 30 dias ─────────

export type Projecao = {
  horas: number;
  milhas: number;
  /** Voltas ao mundo (fração). */
  voltas: number;
  /** Status que a pessoa alcança com essas milhas, saindo de Turista. */
  status: Nivel;
  /** Horas de foco até esse status. */
  horasAteOStatus: number;
};

export function projecao(metaH: number, dias = DIAS_DA_PROJECAO): Projecao {
  const horas = Math.max(0, metaH) * dias;
  const milhas = milhasPorDia(metaH) * dias;
  const { atual } = statusDeViajante(milhas);
  // Turista é o ponto de partida: se não sair dele, mostra o próximo nível como meta.
  const status = atual.milhas > 0 ? atual : NIVEIS[1];
  return {
    horas,
    milhas,
    voltas: milhas / VOLTA_AO_MUNDO_MILHAS,
    status,
    horasAteOStatus: Math.ceil(status.milhas / MILHAS_POR_HORA),
  };
}

/** Texto do primeiro item do OB7, pelo número de voltas. */
export type ComparacaoComOMundo = { tipo: 'parte'; porcento: number } | { tipo: 'mais-que'; voltas: number };

export function comparacaoComOMundo(voltas: number): ComparacaoComOMundo {
  if (voltas < 1) return { tipo: 'parte', porcento: Math.floor(voltas * 100) };
  return { tipo: 'mais-que', voltas: Math.floor(voltas) };
}
