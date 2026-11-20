import { blocosDaRota, blocosSuficientes, caminhoDoBloco, grausPorBloco, mosaicoEmVolta } from '../blocosDaRota';

const BCN = { lat: 41.2971, lon: 2.0785 };
const LHR = { lat: 51.47, lon: -0.4543 };

describe('blocos da rota', () => {
  it('usa a grade do GIBS: 288/2^z graus por bloco', () => {
    expect(grausPorBloco(10)).toBeCloseTo(0.28125);
    expect(grausPorBloco(8)).toBeCloseTo(1.125);
  });

  it('monta o mosaico 4×4 em volta do ponto, como a janela', () => {
    const m = mosaicoEmVolta({ lat: 0.1, lon: 0.1 }, 10);
    expect(m).toHaveLength(16);
    // linha do ponto = floor(89.9/0.28125) = 319; coluna = floor(180.1/0.28125) = 640
    expect(m[0]).toEqual({ linha: 317, coluna: 638 });
    expect(m[15]).toEqual({ linha: 320, coluna: 641 });
  });

  it('dá a volta na linha de data', () => {
    const colunas = mosaicoEmVolta({ lat: 10, lon: 179.9 }, 10).map((b) => b.coluna);
    expect(Math.max(...colunas)).toBe(1279);
    expect(Math.min(...colunas)).toBe(0);
  });

  it('não repete blocos e fica perto de ~250 por hora de voo', () => {
    const blocos = blocosDaRota(BCN, LHR); // ~1.150 km, ~1h20 de jato
    const chaves = blocos.map(caminhoDoBloco);
    expect(new Set(chaves).size).toBe(chaves.length);
    expect(blocos.length).toBeGreaterThan(200);
    expect(blocos.length).toBeLessThan(450);
    expect(chaves[0]).toMatch(/^blocos\/(w10|w8|i9)\/\d+\/\d+\.webp$/);
  });

  it('num ponto parado devolve só os mosaicos daquele ponto', () => {
    expect(blocosDaRota(BCN, BCN)).toHaveLength(16 * 3);
  });

  it('aceita até 5% de falhas no download', () => {
    expect(blocosSuficientes(300, 15)).toBe(true);
    expect(blocosSuficientes(300, 16)).toBe(false);
    expect(blocosSuficientes(0, 0)).toBe(false);
  });
});
