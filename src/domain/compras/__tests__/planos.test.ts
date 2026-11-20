import { economiaDoAnual, emReais, PRECO_CENTAVOS } from '../planos';

describe('planos da primeira classe', () => {
  it('calcula a economia do anual a partir dos preços (RN-19, RN-21)', () => {
    expect(economiaDoAnual()).toBe(50);
    expect(economiaDoAnual({ ...PRECO_CENTAVOS, anual: 14_900 })).toBe(17);
    expect(economiaDoAnual({ ...PRECO_CENTAVOS, anual: 20_000 })).toBe(0);
    expect(economiaDoAnual({ ...PRECO_CENTAVOS, mensal: 0 })).toBe(0);
  });

  it('formata em reais', () => {
    expect(emReais(8990)).toBe('R$ 89,90');
    expect(emReais(17990)).toBe('R$ 179,90');
    expect(emReais(1490)).toBe('R$ 14,90');
  });
});
