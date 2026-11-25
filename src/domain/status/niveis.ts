/**
 * Status de viajante pelas milhas acumuladas. PRD: RN-15, RF-33.
 * Milhas não se gastam: o nível só sobe. Nenhum nível dá dinheiro do jogo.
 */

export type Nivel = { id: NivelId; nome: string; milhas: number };

export type NivelId = 'turista' | 'mochileiro' | 'viajante' | 'explorador' | 'desbravador' | 'cidadao-do-mundo' | 'nomade';

/** Tabela da RN-15, em ordem crescente de milhas. */
export const NIVEIS: readonly Nivel[] = [
  { id: 'turista', nome: 'Turista', milhas: 0 },
  { id: 'mochileiro', nome: 'Mochileiro', milhas: 1_000 },
  { id: 'viajante', nome: 'Viajante', milhas: 5_000 },
  { id: 'explorador', nome: 'Explorador', milhas: 15_000 },
  { id: 'desbravador', nome: 'Desbravador', milhas: 35_000 },
  { id: 'cidadao-do-mundo', nome: 'Cidadão do mundo', milhas: 70_000 },
  { id: 'nomade', nome: 'Nômade', milhas: 120_000 },
];

export type StatusDeViajante = {
  atual: Nivel;
  /** Próximo nível; nulo no último (Nômade). */
  proximo: Nivel | null;
  /** Milhas que faltam para o próximo nível (0 no último). */
  faltam: number;
  /** Progresso dentro do nível atual, de 0 a 1 (1 no último). */
  progresso: number;
};

export function statusDeViajante(milhasAcumuladas: number): StatusDeViajante {
  const milhas = Math.max(0, Math.floor(Number.isFinite(milhasAcumuladas) ? milhasAcumuladas : 0));
  let i = 0;
  while (i + 1 < NIVEIS.length && milhas >= NIVEIS[i + 1].milhas) i++;
  const atual = NIVEIS[i];
  const proximo = NIVEIS[i + 1] ?? null;
  if (!proximo) return { atual, proximo: null, faltam: 0, progresso: 1 };
  return {
    atual,
    proximo,
    faltam: proximo.milhas - milhas,
    progresso: (milhas - atual.milhas) / (proximo.milhas - atual.milhas),
  };
}

export type EtapaDaProgressao = {
  nivel: Nivel;
  /** alcancado: já passou; atual: onde a pessoa está; futuro: ainda não chegou. */
  estado: 'alcancado' | 'atual' | 'futuro';
  /** Milhas que faltam para chegar ao nível (0 nos alcançados e no atual). */
  faltam: number;
};

/** Todos os níveis da RN-15 com o estado de cada um, para a tela de progressão de milhas. */
export function progressaoDeNiveis(milhasAcumuladas: number): EtapaDaProgressao[] {
  const milhas = Math.max(0, Math.floor(Number.isFinite(milhasAcumuladas) ? milhasAcumuladas : 0));
  const { atual } = statusDeViajante(milhas);
  return NIVEIS.map((nivel) => ({
    nivel,
    estado: nivel.id === atual.id ? 'atual' : nivel.milhas <= milhas ? 'alcancado' : 'futuro',
    faltam: Math.max(0, nivel.milhas - milhas),
  }));
}
