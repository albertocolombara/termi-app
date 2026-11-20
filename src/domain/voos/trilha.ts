/**
 * Trilha real do avião: as posições que o coletor gravou a cada faixa de 20 min (histórico no R2).
 * Serve para a rota voada seguir as curvas do voo de verdade, em vez de uma linha reta da origem.
 */
import { distanciaKm, type Ponto } from './geo';
import type { Voo } from './tipos';

export type Amostra = Ponto & { em: number };

/** Uma trilha não volta no tempo nem passa de 20 h (o voo comercial mais longo tem ~19 h). */
const JANELA_MAX_MS = 20 * 60 * 60_000;
/** Saltos maiores que isso entre amostras seguidas são de outro voo com o mesmo avião. */
const VELOCIDADE_MAX_KMH = 1300;

/**
 * Amostras deste voo (mesmo avião, mesmo destino), em ordem de tempo, até `agora`.
 * Descarta pontos impossíveis (salto acima de 1.300 km/h) e repetidos.
 */
export function trilhaDoVoo(candidatos: (Amostra & { hex: string; destinoLat: number; destinoLon: number })[], voo: Voo, agora: number): Amostra[] {
  const doVoo = candidatos
    .filter(
      (a) =>
        a.hex === voo.hex &&
        a.em <= agora &&
        a.em >= agora - JANELA_MAX_MS &&
        distanciaKm({ lat: a.destinoLat, lon: a.destinoLon }, voo.destino) < 5,
    )
    .sort((a, b) => a.em - b.em);
  const trilha: Amostra[] = [];
  for (const a of doVoo) {
    const ultima = trilha[trilha.length - 1];
    if (ultima) {
      if (a.em === ultima.em) continue;
      const horas = (a.em - ultima.em) / 3_600_000;
      if (distanciaKm(ultima, a) / horas > VELOCIDADE_MAX_KMH) continue;
    }
    trilha.push({ lat: a.lat, lon: a.lon, em: a.em });
  }
  return trilha;
}

/** Comprimento de uma linha de pontos, em km. */
export function comprimentoKm(pontos: Ponto[]): number {
  let km = 0;
  for (let i = 1; i < pontos.length; i++) km += distanciaKm(pontos[i - 1], pontos[i]);
  return km;
}

/**
 * Quanto da rota inteira (origem → destino) o avião já voou, de 0 a 1.
 * Voado = origem → trilha → posição atual; falta = posição atual → destino em linha reta (grande círculo).
 */
export function progressoNaRota(origem: Ponto, trilha: Ponto[], aviao: Ponto, destino: Ponto): number {
  const voado = comprimentoKm([origem, ...trilha, aviao]);
  const falta = distanciaKm(aviao, destino);
  if (voado + falta <= 0) return 1;
  return Math.min(1, Math.max(0, voado / (voado + falta)));
}
