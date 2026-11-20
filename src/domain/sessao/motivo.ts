/**
 * Motivo da viagem (RF-13): categoria, no que vai focar e a "bagagem de mão" (checklist de tarefas).
 * Tudo opcional. Fica salvo no diário de bordo.
 */

export const CATEGORIAS = ['estudo', 'trabalho', 'leitura', 'criacao', 'outro'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export type Tarefa = { texto: string; feita: boolean };

export type MotivoDaViagem = {
  categoria: Categoria | null;
  foco: string;
  tarefas: Tarefa[];
};

/** Limites só para o texto caber nas telas e no diário. */
export const FOCO_MAX_CARACTERES = 80;
export const TAREFA_MAX_CARACTERES = 60;
export const TAREFAS_MAX = 10;

export const MOTIVO_VAZIO: MotivoDaViagem = { categoria: null, foco: '', tarefas: [] };

/** Limpa o que o usuário digitou: tira espaços nas pontas, descarta tarefas vazias e corta nos limites. */
export function normalizarMotivo(m: MotivoDaViagem): MotivoDaViagem {
  const tarefas = m.tarefas
    .map((t) => ({ texto: t.texto.trim().slice(0, TAREFA_MAX_CARACTERES), feita: t.feita }))
    .filter((t) => t.texto.length > 0)
    .slice(0, TAREFAS_MAX);
  return {
    categoria: m.categoria && CATEGORIAS.includes(m.categoria) ? m.categoria : null,
    foco: m.foco.trim().slice(0, FOCO_MAX_CARACTERES),
    tarefas,
  };
}

export function motivoVazio(m: MotivoDaViagem): boolean {
  const n = normalizarMotivo(m);
  return n.categoria === null && n.foco === '' && n.tarefas.length === 0;
}

/** Acrescenta uma tarefa, se couber e não for vazia. Devolve a lista sem mudança caso contrário. */
export function adicionarTarefa(tarefas: Tarefa[], texto: string): Tarefa[] {
  const limpo = texto.trim().slice(0, TAREFA_MAX_CARACTERES);
  if (!limpo || tarefas.length >= TAREFAS_MAX) return tarefas;
  return [...tarefas, { texto: limpo, feita: false }];
}
