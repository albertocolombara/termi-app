/**
 * O que cada fim de voo rende. PRD: RN-03, RN-08, RN-09, RN-09a, RN-10, RN-13.
 *
 * - Pouso completo: minutos do voo inteiro (pausas incluídas), mais os de "Continuar até o pouso";
 *   milhas da distância real voada; carimbo; $1 por minuto; loja do destino.
 * - Pousou antes: minutos até ali, milhas do trecho voado, $1 por minuto voado; sem carimbo nem loja.
 * - Nunca negativo e nunca tira nada: minutos são inteiros arredondados para baixo.
 */

export const DOLARES_POR_MINUTO = 1;

export type Rendimentos = {
  minutos: number;
  milhas: number;
  dolares: number;
  carimbo: boolean;
  lojaDoDestino: boolean;
};

export type FimDoVoo =
  | { tipo: 'pouso'; embarcouEm: number; pousoPrevistoEm: number; encerrouEm: number; milhas: number }
  | { tipo: 'pousar-antes'; embarcouEm: number; encerrouEm: number; milhas: number };

export function rendimentos(fim: FimDoVoo): Rendimentos {
  const milhas = Math.max(0, Math.round(fim.milhas));
  if (fim.tipo === 'pousar-antes') {
    const minutos = Math.max(0, Math.floor((fim.encerrouEm - fim.embarcouEm) / 60_000));
    return { minutos, milhas, dolares: minutos * DOLARES_POR_MINUTO, carimbo: false, lojaDoDestino: false };
  }
  // Pouso completo: nunca menos que o tempo escolhido, mesmo se o registro de fim vier antes do horário.
  const fimEfetivo = Math.max(fim.encerrouEm, fim.pousoPrevistoEm);
  const minutos = Math.max(0, Math.floor((fimEfetivo - fim.embarcouEm) / 60_000));
  return { minutos, milhas, dolares: minutos * DOLARES_POR_MINUTO, carimbo: true, lojaDoDestino: true };
}
