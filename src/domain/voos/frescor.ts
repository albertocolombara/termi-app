/**
 * Os dados ao vivo estão no ar? (RN-12; UC-02, "dados fora do ar").
 * O cache está fora do ar quando nenhuma região foi coletada há menos de `maxIdadeMin`.
 */
export type Frescor = 'ao-vivo' | 'fora-do-ar';

export function frescorDoCache(coletas: number[], agora: number, maxIdadeMin: number): Frescor {
  const maisNova = Math.max(-Infinity, ...coletas);
  return agora - maisNova <= maxIdadeMin * 60_000 ? 'ao-vivo' : 'fora-do-ar';
}
