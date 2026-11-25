import type { Aeroporto } from '@/domain/voos/tipos';

import { estatisticas, inicioDoPeriodoAnterior, minutosCurtos, sequencias, type VooComServico } from '../estatisticas';

const A: Aeroporto = { iata: 'BCN', icao: null, nome: null, cidade: 'Barcelona', pais: 'ES', lat: 41.3, lon: 2.08 };
const B: Aeroporto = { iata: 'LHR', icao: null, nome: null, cidade: 'Londres', pais: 'GB', lat: 51.47, lon: -0.45 };

// Quarta-feira, 25/11/2026, 15:00.
const AGORA = new Date(2026, 10, 25, 15, 0).getTime();
const em = (dia: number, hora = 10, mes = 10) => new Date(2026, mes, dia, hora, 0).getTime();

let n = 0;
const voo = (encerrouEm: number, extra: Partial<VooComServico> = {}): VooComServico => ({
  id: String(++n),
  callsign: 'TST1',
  companhiaPais: null,
  origem: A,
  destino: B,
  embarcouEm: encerrouEm - 52 * 60_000,
  encerrouEm,
  tempoEscolhidoMin: 52,
  minutosFoco: 52,
  milhas: 400,
  resultado: 'pousou',
  categoria: null,
  foco: '',
  intervaloServico: 25,
  ...extra,
});

describe('estatisticas', () => {
  it('soma a semana e compara com a anterior', () => {
    const voos = [voo(em(23)), voo(em(25, 9), { minutosFoco: 30 }), voo(em(18), { minutosFoco: 40 })];
    const e = estatisticas(voos, 'semana', AGORA);
    expect(e.minutos).toBe(82);
    expect(e.minutosAnterior).toBe(40);
    expect(e.voos).toBe(2);
  });

  it('separa pousos e pousos antes', () => {
    const e = estatisticas([voo(em(24)), voo(em(25, 8), { resultado: 'pousou_antes', minutosFoco: 20 })], 'semana', AGORA);
    expect(e.pousos).toBe(1);
    expect(e.pousosAntes).toBe(1);
  });

  it('conta os serviços de bordo que começaram durante o voo (RN-07: 52 min tem 1)', () => {
    const e = estatisticas([voo(em(24)), voo(em(25, 8), { intervaloServico: 'desligado' })], 'semana', AGORA);
    expect(e.servicos).toBe(1);
    const curto = voo(em(24, 12), { embarcouEm: em(24, 12) - 20 * 60_000, resultado: 'pousou_antes' });
    expect(estatisticas([curto], 'semana', AGORA).servicos).toBe(0);
  });

  it('barras da semana de segunda a domingo, com hoje em destaque', () => {
    const e = estatisticas([voo(em(23)), voo(em(25, 9))], 'semana', AGORA);
    expect(e.barras.map((b) => b.rotulo)).toEqual(['S', 'T', 'Q', 'Q', 'S', 'S', 'D']);
    expect(e.barras[0].minutos).toBe(52);
    expect(e.barras[2]).toMatchObject({ minutos: 52, atual: true });
  });

  it('barras do dia em faixas de 3 h, do mês por semana e do ano por mês', () => {
    expect(estatisticas([voo(em(25, 10))], 'dia', AGORA).barras[3]).toMatchObject({ rotulo: '9h', minutos: 52 });
    const mes = estatisticas([voo(em(25))], 'mes', AGORA).barras;
    expect(mes.map((b) => b.rotulo)).toEqual(['1–7', '8–14', '15–21', '22–28', '29–30']);
    expect(mes[3]).toMatchObject({ minutos: 52, atual: true });
    const ano = estatisticas([voo(em(3, 10, 1))], 'ano', AGORA).barras;
    expect(ano).toHaveLength(12);
    expect(ano[1].minutos).toBe(52);
    expect(ano[10].atual).toBe(true);
  });

  it('minutos por categoria, da maior para a menor', () => {
    const e = estatisticas(
      [voo(em(24), { categoria: 'estudo', minutosFoco: 30 }), voo(em(24, 12), { categoria: 'trabalho', minutosFoco: 90 }), voo(em(25, 9))],
      'semana',
      AGORA,
    );
    expect(e.categorias).toEqual([
      { categoria: 'trabalho', minutos: 90 },
      { categoria: 'estudo', minutos: 30 },
    ]);
  });
});

describe('sequencias', () => {
  it('conta dias seguidos até hoje e o recorde', () => {
    const voos = [em(10), em(11), em(12), em(13), em(23), em(24), em(25, 8)].map((t) => voo(t));
    expect(sequencias(voos, AGORA)).toEqual({ sequencia: 3, recorde: 4 });
  });

  it('a sequência continua se o último voo foi ontem e zera se foi antes', () => {
    expect(sequencias([voo(em(23)), voo(em(24))], AGORA).sequencia).toBe(2);
    expect(sequencias([voo(em(22)), voo(em(23))], AGORA).sequencia).toBe(0);
    expect(sequencias([], AGORA)).toEqual({ sequencia: 0, recorde: 0 });
  });
});

describe('formatos', () => {
  it('período anterior', () => {
    expect(inicioDoPeriodoAnterior('semana', AGORA)).toBe(new Date(2026, 10, 16).getTime());
    expect(inicioDoPeriodoAnterior('mes', AGORA)).toBe(new Date(2026, 9, 1).getTime());
  });
  it('minutos curtos das barras', () => {
    expect(minutosCurtos(40)).toBe('40m');
    expect(minutosCurtos(90)).toBe('1h 30');
    expect(minutosCurtos(120)).toBe('2h');
  });
});
