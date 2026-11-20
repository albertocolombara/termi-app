import { agendaDePausas } from '../pausas';
import { minutosAte, progressoDaSessao, proximaPausa } from '../progresso';

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
});
