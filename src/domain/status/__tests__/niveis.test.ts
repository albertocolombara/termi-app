import { NIVEIS, statusDeViajante } from '../niveis';

describe('statusDeViajante (RN-15)', () => {
  it('começa como Turista, a caminho de Mochileiro', () => {
    expect(statusDeViajante(0)).toEqual({ atual: NIVEIS[0], proximo: NIVEIS[1], faltam: 1000, progresso: 0 });
  });

  it('sobe de nível exatamente no limite', () => {
    expect(statusDeViajante(1000).atual.nome).toBe('Mochileiro');
    expect(statusDeViajante(999).atual.nome).toBe('Turista');
  });

  it('mostra quanto falta e o progresso dentro do nível (exemplo do Figma: 4.820 milhas)', () => {
    const s = statusDeViajante(4820);
    expect(s.atual.nome).toBe('Mochileiro');
    expect(s.proximo?.nome).toBe('Viajante');
    expect(s.faltam).toBe(180);
    expect(s.progresso).toBeCloseTo(0.955, 3);
  });

  it('no último nível não há próximo', () => {
    expect(statusDeViajante(500_000)).toMatchObject({ proximo: null, faltam: 0, progresso: 1 });
    expect(statusDeViajante(500_000).atual.nome).toBe('Nômade');
  });

  it('trata valores inválidos como zero', () => {
    expect(statusDeViajante(-50).atual.nome).toBe('Turista');
    expect(statusDeViajante(Number.NaN).faltam).toBe(1000);
  });
});
