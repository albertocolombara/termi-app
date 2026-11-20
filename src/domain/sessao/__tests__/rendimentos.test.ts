import { rendimentos } from '../rendimentos';

const T0 = Date.UTC(2026, 10, 20, 12, 0);
const min = (m: number) => T0 + m * 60_000;

describe('rendimentos', () => {
  it('pouso completo rende o voo inteiro, carimbo e loja (RN-08)', () => {
    expect(rendimentos({ tipo: 'pouso', embarcouEm: T0, pousoPrevistoEm: min(55), encerrouEm: min(55), milhas: 495 })).toEqual({
      minutos: 55,
      milhas: 495,
      dolares: 55,
      carimbo: true,
      lojaDoDestino: true,
    });
  });

  it('continuar até o pouso soma os minutos a mais (RN-09a)', () => {
    expect(rendimentos({ tipo: 'pouso', embarcouEm: T0, pousoPrevistoEm: min(55), encerrouEm: min(63.5), milhas: 560 })).toMatchObject({
      minutos: 63,
      dolares: 63,
    });
  });

  it('pouso completo nunca rende menos que o tempo escolhido', () => {
    expect(rendimentos({ tipo: 'pouso', embarcouEm: T0, pousoPrevistoEm: min(55), encerrouEm: min(50), milhas: 400 }).minutos).toBe(55);
  });

  it('pousou antes rende os minutos até ali, sem carimbo nem loja (RN-10)', () => {
    expect(rendimentos({ tipo: 'pousar-antes', embarcouEm: T0, encerrouEm: min(20.9), milhas: 180.4 })).toEqual({
      minutos: 20,
      milhas: 180,
      dolares: 20,
      carimbo: false,
      lojaDoDestino: false,
    });
  });

  it('nunca fica negativo', () => {
    expect(rendimentos({ tipo: 'pousar-antes', embarcouEm: T0, encerrouEm: T0 - 1000, milhas: -3 })).toMatchObject({ minutos: 0, milhas: 0, dolares: 0 });
  });
});
