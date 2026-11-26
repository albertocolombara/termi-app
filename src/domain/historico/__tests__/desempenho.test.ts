import type { Aeroporto } from '@/domain/voos/tipos';

import { bagagemDeMao, diasCorridos, horarioDeFoco, mediaEMelhor, milhasDoPeriodo, peloMundo, porcentagens, resumo, semanaDaSequencia } from '../desempenho';
import type { VooComServico } from '../estatisticas';

const lugar = (iata: string, cidade: string, pais: string): Aeroporto => ({ iata, icao: null, nome: null, cidade, pais, lat: 0, lon: 0 });
const BCN = lugar('BCN', 'Barcelona', 'ES');
const LHR = lugar('LHR', 'Londres', 'GB');
const CDG = lugar('CDG', 'Paris', 'FR');

// Quarta-feira, 25/11/2026, 15:00.
const AGORA = new Date(2026, 10, 25, 15, 0).getTime();
const em = (dia: number, hora = 10, mes = 10) => new Date(2026, mes, dia, hora, 0).getTime();

let n = 0;
const voo = (encerrouEm: number, extra: Partial<VooComServico> = {}): VooComServico => ({
  id: String(++n),
  callsign: 'TST1',
  companhiaPais: null,
  origem: BCN,
  destino: LHR,
  embarcouEm: encerrouEm - 60 * 60_000,
  encerrouEm,
  tempoEscolhidoMin: 60,
  minutosFoco: 60,
  milhas: 500,
  resultado: 'pousou',
  categoria: null,
  foco: '',
  intervaloServico: 25,
  ...extra,
});

describe('mediaEMelhor', () => {
  it('média pelos dias já começados da semana e o melhor dia', () => {
    expect(diasCorridos('semana', AGORA)).toBe(3);
    const m = mediaEMelhor([voo(em(23)), voo(em(24), { minutosFoco: 90 }), voo(em(24, 18), { minutosFoco: 30 })], 'semana', AGORA);
    expect(m.media).toBe(60);
    expect(m.unidade).toBe('dia');
    expect(m.melhor?.minutos).toBe(120);
    expect(new Date(m.melhor!.quando).getDate()).toBe(24);
  });

  it('no ano, média por mês', () => {
    const m = mediaEMelhor([voo(em(5, 10, 0), { minutosFoco: 110 })], 'ano', AGORA);
    expect(m.unidade).toBe('mes');
    expect(m.media).toBe(10);
    expect(new Date(m.melhor!.quando).getMonth()).toBe(0);
  });

  it('sem voos, sem melhor dia', () => {
    expect(mediaEMelhor([], 'semana', AGORA)).toEqual({ media: 0, unidade: 'dia', melhor: null });
  });
});

describe('resumo', () => {
  it('sessão média, mais longo e quantos chegaram', () => {
    const r = resumo([voo(em(23), { minutosFoco: 40 }), voo(em(24), { minutosFoco: 80 }), voo(em(25), { minutosFoco: 30, resultado: 'pousou_antes' })], 'semana', AGORA);
    expect(r).toEqual({ voos: 3, pousos: 2, pousosAntes: 1, sessaoMedia: 50, vooMaisLongo: 80, chegaram: 2 / 3 });
  });
});

describe('semanaDaSequencia', () => {
  it('marca os dias com voo, hoje e os que ainda vêm', () => {
    const s = semanaDaSequencia([voo(em(23)), voo(em(25, 9))], AGORA);
    expect(s.map((d) => d.estado)).toEqual(['voou', 'vazio', 'hoje-voou', 'futuro', 'futuro', 'futuro', 'futuro']);
  });
});

describe('horarioDeFoco', () => {
  it('distribui os minutos pelo tempo real do voo e acha a janela de 4 h mais forte', () => {
    // 9h–11h (120 min) e 10h–11h (60 min).
    const h = horarioDeFoco([voo(em(24, 11), { embarcouEm: em(24, 9), minutosFoco: 120 }), voo(em(25, 11))], 'semana', AGORA);
    expect(h.faixas[4]).toBe(60); // 8–10 h
    expect(h.faixas[5]).toBe(120); // 10–12 h
    expect(h.maisForte).toEqual({ de: 8, ate: 12 });
  });

  it('sem voos, sem janela', () => {
    expect(horarioDeFoco([], 'semana', AGORA).maisForte).toBeNull();
  });
});

describe('porcentagens', () => {
  it('fecha 100', () => {
    const p = porcentagens([
      { categoria: 'estudo', minutos: 200 },
      { categoria: 'trabalho', minutos: 120 },
      { categoria: 'leitura', minutos: 50 },
    ]);
    expect(p.map((x) => x.porcento)).toEqual([54, 32, 14]);
    expect(porcentagens([])).toEqual([]);
  });
});

describe('bagagemDeMao', () => {
  it('soma tarefas e conta os voos com tarefas', () => {
    expect(bagagemDeMao([voo(em(23), { tarefas: 3, tarefasFeitas: 2 }), voo(em(24))], 'semana', AGORA)).toEqual({ tarefas: 3, feitas: 2, voosComTarefas: 1, voos: 2 });
  });
});

describe('peloMundo', () => {
  it('km, países novos, cidades e rota mais voada', () => {
    const voos = [
      voo(em(10), { destino: LHR }), // antes da semana: GB já visitado
      voo(em(23), { destino: LHR }),
      voo(em(24), { destino: LHR }),
      voo(em(25, 9), { destino: CDG }),
      voo(em(25, 10), { destino: CDG, resultado: 'pousou_antes' }),
    ];
    const p = peloMundo(voos, 'semana', AGORA);
    expect(p.km).toBe(Math.round(2000 * 1.609344));
    expect(p.paisesNovos).toBe(1);
    expect(p.cidades).toBe(2);
    expect(p.rotaMaisVoada).toEqual({ origem: 'Barcelona', destino: 'Londres', voos: 2 });
  });
});

describe('milhasDoPeriodo', () => {
  it('milhas do período e status pelo total', () => {
    const m = milhasDoPeriodo([voo(em(10), { milhas: 800 }), voo(em(24), { milhas: 300 })], 'semana', AGORA);
    expect(m.doPeriodo).toBe(300);
    expect(m.total).toBe(1100);
    expect(m.status.atual.nome).toBe('Mochileiro');
  });
});
