import { comprarSouvenir, creditoDeVoo, saldo, type Lancamento } from '../livroCaixa';

describe('livro-caixa', () => {
  const l: Lancamento[] = [creditoDeVoo('s1', 120), creditoDeVoo('s2', 95)];

  it('o saldo é a soma dos lançamentos', () => {
    expect(saldo([])).toBe(0);
    expect(saldo(l)).toBe(215);
  });

  it('compra com saldo suficiente vira lançamento negativo', () => {
    const r = comprarSouvenir(l, 'BR', 200);
    expect(r).toEqual({ ok: true, lancamento: { tipo: 'compra_souvenir', valor: -200, souvenirId: 'BR' } });
    if (r.ok) expect(saldo([...l, r.lancamento])).toBe(15);
  });

  it('sem saldo, diz quanto falta', () => {
    expect(comprarSouvenir(l, 'RARA', 500)).toEqual({ ok: false, faltam: 285 });
  });

  it('recusa valores inválidos', () => {
    expect(() => creditoDeVoo('s', -1)).toThrow();
    expect(() => comprarSouvenir(l, 'BR', 0)).toThrow();
  });
});
