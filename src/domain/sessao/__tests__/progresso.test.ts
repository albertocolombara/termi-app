import { agendaDePausas } from '../pausas';
import { minutosAte, pausaEmAndamento, pausaRecemTerminada, progressoDaSessao, proximaPausa, relogioRegressivo } from '../progresso';

const T0 = 1_800_000_000_000;
const MIN = 60_000;

describe('progresso da sessão', () => {
  it('vai de 0 no embarque a 1 no pouso, sem passar dos limites', () => {
    expect(progressoDaSessao(T0, T0 + 50 * MIN, T0 - MIN)).toBe(0);
    expect(progressoDaSessao(T0, T0 + 50 * MIN, T0 + 25 * MIN)).toBeCloseTo(0.5);
    expect(progressoDaSessao(T0, T0 + 50 * MIN, T0 + 60 * MIN)).toBe(1);
    expect(progressoDaSessao(T0, T0, T0)).toBe(1);
  });

  it('conta os minutos para cima e nunca negativo', () => {
    expect(minutosAte(T0 + 61_000, T0)).toBe(2);
    expect(minutosAte(T0 - 1, T0)).toBe(0);
  });

  it('acha a próxima pausa do serviço de bordo', () => {
    const pausas = agendaDePausas(90, 25); // 25–30 e 55–60
    expect(proximaPausa(T0, pausas, T0 + 10 * MIN)).toEqual({ indice: 0, emMin: 15 });
    expect(proximaPausa(T0, pausas, T0 + 26 * MIN)).toEqual({ indice: 1, emMin: 29 });
    expect(proximaPausa(T0, pausas, T0 + 56 * MIN)).toBeNull();
    expect(proximaPausa(T0, [], T0)).toBeNull();
  });

  it('sabe quando o serviço de bordo está em andamento e quanto falta', () => {
    const pausas = agendaDePausas(90, 25); // 25–30 e 55–60
    expect(pausaEmAndamento(T0, pausas, T0 + 24 * MIN)).toBeNull();
    expect(pausaEmAndamento(T0, pausas, T0 + 25 * MIN)).toEqual({ indice: 0, fimEm: T0 + 30 * MIN, restanteMs: 5 * MIN });
    expect(pausaEmAndamento(T0, pausas, T0 + 28 * MIN)?.restanteMs).toBe(2 * MIN);
    expect(pausaEmAndamento(T0, pausas, T0 + 30 * MIN)).toBeNull();
    expect(pausaEmAndamento(T0, pausas, T0 + 57 * MIN)?.indice).toBe(1);
  });

  it('"Voltar ao foco" encerra só aquela pausa', () => {
    const pausas = agendaDePausas(90, 25);
    expect(pausaEmAndamento(T0, pausas, T0 + 26 * MIN, [0])).toBeNull();
    expect(pausaEmAndamento(T0, pausas, T0 + 56 * MIN, [0])?.indice).toBe(1);
  });

  it('acha a pausa que acabou de terminar, dentro da janela do aviso', () => {
    const pausas = agendaDePausas(90, 25);
    expect(pausaRecemTerminada(T0, pausas, T0 + 29 * MIN, MIN)).toBeNull();
    expect(pausaRecemTerminada(T0, pausas, T0 + 30 * MIN, MIN)).toEqual({ indice: 0, fimEm: T0 + 30 * MIN });
    expect(pausaRecemTerminada(T0, pausas, T0 + 31 * MIN, MIN)).toBeNull();
    expect(pausaRecemTerminada(T0, pausas, T0 + 60.5 * MIN, MIN)?.indice).toBe(1);
  });

  it('mostra a contagem regressiva em m:ss', () => {
    expect(relogioRegressivo(5 * MIN)).toBe('5:00');
    expect(relogioRegressivo(252_000)).toBe('4:12');
    expect(relogioRegressivo(1)).toBe('0:01');
    expect(relogioRegressivo(-5)).toBe('0:00');
  });
});
