import type { Voo } from '../tipos';

export const AGORA = Date.UTC(2026, 10, 20, 12, 0);

/** Voo de teste: coletado agora, pousando em `min` minutos. */
export function voo(min: number, extra: Partial<Voo> = {}): Voo {
  return {
    hex: `h${min}`,
    callsign: `TST${min}`,
    companhia: 'TST',
    companhiaPais: 'BR',
    aeronave: 'A320',
    origem: { iata: 'GRU', icao: 'SBGR', nome: 'Guarulhos', lat: -23.43, lon: -46.47 },
    destino: { iata: 'GIG', icao: 'SBGL', nome: 'Galeão', lat: -22.81, lon: -43.25 },
    lat: -23.2,
    lon: -45.5,
    altitudePes: 35000,
    velocidadeNos: 430,
    rumo: 75,
    distanciaRestanteKm: 230,
    pousoPrevistoEm: AGORA + min * 60_000,
    coletadoEm: AGORA,
    ...extra,
  };
}
