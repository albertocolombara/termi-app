import type { Aeroporto } from '@/domain/voos/tipos';

import { dataRelativa, inicioDoPeriodo, resumoDoDiario, rotasVoadas, voosDoPeriodo, type VooDoDiario } from '../historico';

const aeroporto = (iata: string, lat: number, lon: number): Aeroporto => ({ iata, icao: null, nome: null, cidade: iata, pais: null, lat, lon });
const BCN = aeroporto('BCN', 41.3, 2.08);
const LHR = aeroporto('LHR', 51.47, -0.45);
const GRU = aeroporto('GRU', -23.43, -46.47);

// Quarta-feira, 25/11/2026, 15:00 no horário do aparelho.
const AGORA = new Date(2026, 10, 25, 15, 0).getTime();
const em = (dia: number, hora = 10) => new Date(2026, 10, dia, hora, 0).getTime();

const voo = (id: string, origem: Aeroporto, destino: Aeroporto, encerrouEm: number, extra: Partial<VooDoDiario> = {}): VooDoDiario => ({
  id,
  callsign: `TST${id}`,
  companhiaPais: null,
  origem,
  destino,
  embarcouEm: encerrouEm - 50 * 60_000,
  encerrouEm,
  tempoEscolhidoMin: 50,
  minutosFoco: 50,
  milhas: 400,
  resultado: 'pousou',
  categoria: null,
  foco: '',
  ...extra,
});

describe('rotasVoadas', () => {
  it('junta voos no mesmo trecho e mostra o mais recente', () => {
    const rotas = rotasVoadas([voo('1', BCN, LHR, em(20)), voo('2', GRU, BCN, em(21)), voo('3', BCN, LHR, em(24))]);
    expect(rotas.map((r) => r.chave)).toEqual(['BCN>LHR', 'GRU>BCN']);
    expect(rotas[0]).toMatchObject({ voos: 2, ultimoVoo: { id: '3' } });
  });

  it('ida e volta são trechos diferentes', () => {
    expect(rotasVoadas([voo('1', BCN, LHR, em(20)), voo('2', LHR, BCN, em(21))])).toHaveLength(2);
  });

  it('sem voos, sem rotas', () => {
    expect(rotasVoadas([])).toEqual([]);
  });
});

describe('resumoDoDiario', () => {
  it('soma voos, minutos e milhas, inclusive quem pousou antes', () => {
    expect(
      resumoDoDiario([voo('1', BCN, LHR, em(20)), voo('2', BCN, LHR, em(21), { resultado: 'pousou_antes', minutosFoco: 20, milhas: 150 })]),
    ).toEqual({ voos: 2, minutos: 70, milhas: 550 });
  });
});

describe('períodos', () => {
  it('a semana começa na segunda-feira', () => {
    expect(inicioDoPeriodo('semana', AGORA)).toBe(new Date(2026, 10, 23).getTime());
    expect(inicioDoPeriodo('dia', AGORA)).toBe(new Date(2026, 10, 25).getTime());
    expect(inicioDoPeriodo('mes', AGORA)).toBe(new Date(2026, 10, 1).getTime());
    expect(inicioDoPeriodo('ano', AGORA)).toBe(new Date(2026, 0, 1).getTime());
  });

  it('domingo ainda é da semana que começou na segunda anterior', () => {
    expect(inicioDoPeriodo('semana', new Date(2026, 10, 29, 20).getTime())).toBe(new Date(2026, 10, 23).getTime());
  });

  it('filtra os voos do período', () => {
    const voos = [voo('1', BCN, LHR, em(2)), voo('2', BCN, LHR, em(22)), voo('3', BCN, LHR, em(24)), voo('4', BCN, LHR, em(25, 9))];
    expect(voosDoPeriodo(voos, 'dia', AGORA).map((v) => v.id)).toEqual(['4']);
    expect(voosDoPeriodo(voos, 'semana', AGORA).map((v) => v.id)).toEqual(['3', '4']);
    expect(voosDoPeriodo(voos, 'mes', AGORA)).toHaveLength(4);
  });
});

describe('dataRelativa', () => {
  it('hoje, ontem e data curta', () => {
    expect(dataRelativa(em(25, 8), AGORA)).toBe('hoje');
    expect(dataRelativa(em(24, 23), AGORA)).toBe('ontem');
    expect(dataRelativa(em(20), AGORA)).toBe('20 nov');
  });
});
