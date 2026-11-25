/**
 * Persiana da janela v3 (visao-do-produto.md, "Persiana interativa"). Começa um pouco abaixada,
 * cobrindo o topo do vidro; um toque fecha, outro volta à posição inicial.
 * Medidas em pixels da render de 1080 × 1440 do Blender.
 */

/** Onde a camada recortada da persiana fica na imagem (posição fechada). */
export const PERSIANA = { x: 67, y: 0, largura: 946, altura: 1362 } as const;
/** Máscara fixa que recorta a persiana no vão da janela. */
export const MASCARA_DA_PERSIANA = { x: 110, y: 128, largura: 860, altura: 1206 } as const;

/** Borda de baixo da persiana: na posição inicial e fechada. */
export const BORDA_INICIAL = 240;
export const BORDA_FECHADA = 1343;
/** Duração da animação de abrir e fechar (sugestão do documento: ~0,6 s, easing suave). */
export const DURACAO_DA_PERSIANA_MS = 600;

/**
 * Deslocamento vertical da camada (desenhada fechada) para `fechada` entre 0 (inicial) e 1 (fechada).
 * Negativo: sobe a persiana.
 */
export function deslocamentoDaPersiana(fechada: number): number {
  'worklet';
  const f = Math.min(1, Math.max(0, fechada));
  const borda = BORDA_INICIAL + f * (BORDA_FECHADA - BORDA_INICIAL);
  return -(BORDA_FECHADA - borda);
}
