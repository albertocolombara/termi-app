/**
 * Posição projetada do avião entre as coletas do cache (a cada 20 min por região).
 * O app nunca consulta o provedor de voos: projeta a partir da última foto (ARCHITECTURE §9).
 *
 * Modelo: o avião segue pelo grande círculo da posição coletada até o destino e chega
 * no `pousoPrevistoEm`. Assim, posição e horário de pouso nunca se contradizem.
 * A altitude fica na de cruzeiro e desce em linha reta nos últimos 30 min.
 */
import { distanciaKm, interpolar, kmParaMilhas, rumo, type Ponto } from './geo';
import type { Voo } from './tipos';

export const DESCIDA_MIN = 30;

export type PosicaoProjetada = Ponto & {
  /** 0 a 1: quanto do trecho (da coleta ao destino) já foi voado. */
  fracao: number;
  altitudePes: number | null;
  rumo: number;
  /** O avião já chegou ao destino pela projeção. */
  noSolo: boolean;
};

export function projetar(voo: Voo, agora: number): PosicaoProjetada {
  const total = voo.pousoPrevistoEm - voo.coletadoEm;
  const fracao = total <= 0 ? 1 : Math.min(1, Math.max(0, (agora - voo.coletadoEm) / total));
  const de: Ponto = { lat: voo.lat, lon: voo.lon };
  const p = interpolar(de, voo.destino, fracao);
  const faltaMin = (voo.pousoPrevistoEm - agora) / 60_000;
  let altitudePes = voo.altitudePes;
  if (altitudePes !== null && faltaMin < DESCIDA_MIN) altitudePes = Math.max(0, Math.round((altitudePes * Math.max(0, faltaMin)) / DESCIDA_MIN));
  const noSolo = fracao >= 1;
  return { ...p, fracao, altitudePes: noSolo ? 0 : altitudePes, rumo: noSolo ? voo.rumo ?? 0 : rumo(p, voo.destino), noSolo };
}

/** Milhas da distância real voada entre dois instantes da sessão (RN-08, RN-10). */
export function milhasVoadas(voo: Voo, de: number, ate: number): number {
  if (ate <= de) return 0;
  return Math.round(kmParaMilhas(distanciaKm(projetar(voo, de), projetar(voo, ate))));
}
