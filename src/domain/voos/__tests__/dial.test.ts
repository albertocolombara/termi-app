import { anguloDoTempo, barrasDoDial, POSICOES_DIAL, rotuloDoTempo, tempoDoAngulo } from '../dial';
import { AGORA, voo } from './fabrica';

describe('dial de tempo', () => {
  it('uma volta vai de 15 min a 6 h, de 5 em 5', () => {
    expect(POSICOES_DIAL).toBe(70);
    expect(anguloDoTempo(15)).toBe(0);
    expect(anguloDoTempo(50)).toBeCloseTo(36, 5);
    expect(tempoDoAngulo(36, 45)).toBe(50);
    expect(tempoDoAngulo(0, 20)).toBe(15);
  });

  it('não dá a volta pelo topo', () => {
    expect(tempoDoAngulo(2, 355)).toBe(360); // vindo de 5h55, para em 6 h
    expect(tempoDoAngulo(358, 20)).toBe(15); // vindo de 20 min, para em 15
  });

  it('conta voos por tempo e marca a janela aceita (±10 min)', () => {
    const b = barrasDoDial([voo(49), voo(51), voo(53), voo(90), voo(8)], AGORA, 50);
    const em = (m: number) => b.find((x) => x.minutos === m)!;
    expect(em(50).voos).toBe(2); // 49 e 51
    expect(em(55).voos).toBe(1);
    expect(em(90).voos).toBe(1);
    expect(b.reduce((s, x) => s + x.voos, 0)).toBe(4); // o de 8 min fica fora
    expect(b.filter((x) => x.naJanela).map((x) => x.minutos)).toEqual([40, 45, 50, 55, 60]);
  });

  it('escreve o tempo como no Figma', () => {
    expect(rotuloDoTempo(50)).toBe('~50 min');
    expect(rotuloDoTempo(90)).toBe('~1h30');
    expect(rotuloDoTempo(360)).toBe('~6 h');
  });
});
