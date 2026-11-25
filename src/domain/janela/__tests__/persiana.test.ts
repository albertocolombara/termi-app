import { BORDA_FECHADA, BORDA_INICIAL, deslocamentoDaPersiana } from '../persiana';

describe('deslocamentoDaPersiana', () => {
  it('na posição inicial, a borda de baixo fica em y = 240', () => {
    expect(deslocamentoDaPersiana(0)).toBe(-(BORDA_FECHADA - BORDA_INICIAL));
  });
  it('fechada, não desloca', () => {
    expect(deslocamentoDaPersiana(1)).toBeCloseTo(0);
  });
  it('limita fora de 0 a 1', () => {
    expect(deslocamentoDaPersiana(2)).toBeCloseTo(0);
    expect(deslocamentoDaPersiana(-1)).toBe(deslocamentoDaPersiana(0));
  });
});
