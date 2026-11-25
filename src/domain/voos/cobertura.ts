/**
 * Cobertura do radar. O coletor lê 12 áreas do mundo (um ponto e 463 km em volta, a cada 20 min).
 * Fora delas não existe leitura: num voo longo o avião passa boa parte do tempo fora e a posição
 * é estimada, sem que isso seja "perder o sinal" (build-51: aviso de sem sinal o voo todo).
 */
import { distanciaKm, type Ponto } from './geo';

export type Area = { lat: number; lon: number; raioKm: number };

/**
 * Margem para dentro da borda: perto do limite o avião pode ter ficado de fora da última leitura
 * (ela é de até 20 min atrás e a posição de agora é estimada).
 */
export const MARGEM_DA_BORDA_KM = 60;

/** As regiões cuja área cobre o ponto (com a margem da borda). */
export function regioesQueCobrem<R extends { id: string; area: Area | null }>(regioes: readonly R[], ponto: Ponto, margemKm = MARGEM_DA_BORDA_KM): R[] {
  return regioes.filter((r) => r.area !== null && distanciaKm(ponto, r.area) <= r.area.raioKm - margemKm);
}
