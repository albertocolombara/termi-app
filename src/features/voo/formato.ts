/** Formatação de horários e distâncias para as telas do voo (pt-BR, relógio do aparelho). */
export const horaLocal = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const metros = (pes: number | null) => (pes === null ? null : `${Math.round(pes * 0.3048).toLocaleString('pt-BR')} m`);

export const km = (n: number) => `${Math.round(n).toLocaleString('pt-BR')} km`;

/** Nome do destino na tela: cidade, senão o aeroporto, senão o código. */
export const nomeDoLugar = (a: { cidade: string | null; nome: string | null; iata: string | null; icao: string | null }) =>
  a.cidade ?? a.nome ?? a.iata ?? a.icao ?? '—';

export const codigoDoLugar = (a: { iata: string | null; icao: string | null }) => a.iata ?? a.icao ?? '—';
