/** Formatação de horários e distâncias para as telas do voo (pt-BR, relógio do aparelho). */
export const horaLocal = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const metros = (pes: number | null) => (pes === null ? null : `${Math.round(pes * 0.3048).toLocaleString('pt-BR')} m`);

export const km = (n: number) => `${Math.round(n).toLocaleString('pt-BR')} km`;

/** Nome do destino na tela: cidade, senão o aeroporto, senão o código. */
export const nomeDoLugar = (a: { cidade: string | null; nome: string | null; iata: string | null; icao: string | null }) =>
  a.cidade ?? a.nome ?? a.iata ?? a.icao ?? '—';

export const codigoDoLugar = (a: { iata: string | null; icao: string | null }) => a.iata ?? a.icao ?? '—';

/** Velocidade em km/h a partir de nós. */
export const kmh = (nos: number | null) => (nos === null ? '—' : `${Math.round(nos * 1.852).toLocaleString('pt-BR')} km/h`);

/** Duração para leitura rápida: "45 min" até 59; depois "2h 43" (ou "3h" redondo). */
export function duracao(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}`;
}

/** Duração por extenso, para leitores de tela: "2 horas e 43 minutos". */
export function duracaoPorExtenso(min: number): string {
  if (min < 60) return `${min} ${min === 1 ? 'minuto' : 'minutos'}`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  const horas = `${h} ${h === 1 ? 'hora' : 'horas'}`;
  return m === 0 ? horas : `${horas} e ${m} ${m === 1 ? 'minuto' : 'minutos'}`;
}
