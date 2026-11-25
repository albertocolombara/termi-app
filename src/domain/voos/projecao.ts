/**
 * Posição projetada do avião entre as coletas do cache (a cada 20 min por região).
 * O app nunca consulta o provedor de voos: projeta a partir da última foto (ARCHITECTURE §9).
 *
 * Modelo: o avião segue pelo grande círculo da posição coletada até o destino e chega
 * no `pousoPrevistoEm`. Assim, posição e horário de pouso nunca se contradizem.
 * A altitude fica na de cruzeiro e desce em linha reta nos últimos 30 min.
 * Se a coleta pegou o avião ainda subindo, perto da origem, ele sobe até uma altitude de cruzeiro
 * típica para a distância da rota (build-56: voo lido a 1.410 m logo após a decolagem ficou com essa
 * altitude o voo todo, porque saiu das áreas lidas pelo coletor).
 */
import { distanciaKm, interpolar, kmParaMilhas, rumo, type Ponto } from './geo';
import type { Voo } from './tipos';

export const DESCIDA_MIN = 30;
/** Subida típica de jato comercial. */
const SUBIDA_PES_POR_MIN = 2000;
/** Até essa distância da origem (e no primeiro terço da rota), altitude baixa é subida, não descida. */
const PERTO_DA_ORIGEM_KM = 400;

/** Altitude de cruzeiro típica pela distância da rota. Estimativa: o real varia por avião e vento. */
export function cruzeiroTipicoPes(rotaKm: number): number {
  if (rotaKm < 500) return 24000;
  if (rotaKm < 1500) return 32000;
  return 36000;
}

function altitudeEstimada(voo: Voo, agora: number, faltaMin: number): number | null {
  let alt = voo.altitudePes;
  if (alt === null) return null;
  const rotaKm = distanciaKm(voo.origem, voo.destino);
  const cruzeiro = cruzeiroTipicoPes(rotaKm);
  const subindo = alt < cruzeiro && distanciaKm(voo.origem, voo) <= Math.min(PERTO_DA_ORIGEM_KM, rotaKm / 3);
  if (subindo) alt = Math.min(cruzeiro, alt + (SUBIDA_PES_POR_MIN * Math.max(0, agora - voo.coletadoEm)) / 60_000);
  if (faltaMin < DESCIDA_MIN) alt = (alt * Math.max(0, faltaMin)) / DESCIDA_MIN;
  return Math.max(0, Math.round(alt));
}

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
  const altitudePes = altitudeEstimada(voo, agora, faltaMin);
  const noSolo = fracao >= 1;
  return { ...p, fracao, altitudePes: noSolo ? 0 : altitudePes, rumo: noSolo ? voo.rumo ?? 0 : rumo(p, voo.destino), noSolo };
}

/** Milhas da distância real voada entre dois instantes da sessão (RN-08, RN-10). */
export function milhasVoadas(voo: Voo, de: number, ate: number): number {
  if (ate <= de) return 0;
  return Math.round(kmParaMilhas(distanciaKm(projetar(voo, de), projetar(voo, ate))));
}
