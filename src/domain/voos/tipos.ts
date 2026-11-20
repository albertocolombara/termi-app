/**
 * Voo como vem do cache no R2 (ARCHITECTURE §9, contrato aprovado em 19/11/2026).
 * Horários aqui já convertidos para ms (o JSON traz ISO 8601).
 */
export type Aeroporto = {
  iata: string | null;
  icao: string | null;
  nome: string | null;
  lat: number;
  lon: number;
};

export type Voo = {
  hex: string;
  callsign: string;
  companhia: string | null;
  /** ISO 3166-1 alfa-2, para a bandeira na cauda (nunca logo ou pintura real). */
  companhiaPais: string | null;
  aeronave: string | null;
  origem: Aeroporto;
  destino: Aeroporto;
  lat: number;
  lon: number;
  altitudePes: number | null;
  velocidadeNos: number | null;
  rumo: number | null;
  distanciaRestanteKm: number;
  /** ms */
  pousoPrevistoEm: number;
  /** ms: quando a região foi coletada (a posição vale para esse instante). */
  coletadoEm: number;
};
