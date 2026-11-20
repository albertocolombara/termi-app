import { caminhoDaNuvem, mosaicoDeNuvens, nuvensDaRota, pesoDaPassagemNoturna } from '../nuvens';

const UTC = (h: number, m = 0) => Date.UTC(2026, 10, 20, h, m);

describe('nuvens reais', () => {
  it('monta o mosaico 2×2 com o avião longe da borda', () => {
    const m = mosaicoDeNuvens({ lat: 41.4, lon: 2.1 }); // Barcelona
    expect(m.lado).toBe(36);
    expect(2.1 - m.oeste).toBeGreaterThanOrEqual(9);
    expect(m.oeste + m.lado - 2.1).toBeGreaterThanOrEqual(9);
    expect(m.norte - 41.4).toBeGreaterThanOrEqual(9);
    expect(m.blocos).toHaveLength(4);
  });

  it('dá a volta em ±180° sem quebrar o mosaico', () => {
    const m = mosaicoDeNuvens({ lat: 0, lon: 179 });
    expect(m.oeste).toBe(162);
    expect(m.blocos.map((b) => b.coluna).sort((a, b) => a - b)).toEqual([0, 0, 19, 19]);
    const n = mosaicoDeNuvens({ lat: 0, lon: -179 });
    expect(n.oeste).toBe(-198);
    expect(n.blocos.every((b) => b.coluna >= 0 && b.coluna < 20)).toBe(true);
  });

  it('não sai da grade nos polos', () => {
    expect(mosaicoDeNuvens({ lat: 89, lon: 0 }).blocos.every((b) => b.linha >= 0)).toBe(true);
    expect(mosaicoDeNuvens({ lat: -89, lon: 0 }).blocos.every((b) => b.linha <= 9)).toBe(true);
  });

  it('junta os blocos da rota sem repetir', () => {
    const rota = nuvensDaRota({ lat: -23.4, lon: -46.5 }, { lat: -8.1, lon: -34.9 }); // GRU → REC
    const chaves = rota.map((b) => `${b.linha}/${b.coluna}`);
    expect(new Set(chaves).size).toBe(chaves.length);
    expect(rota.length).toBeGreaterThanOrEqual(4);
    expect(rota.length).toBeLessThanOrEqual(9);
  });

  it('usa a passagem mais recente pela hora solar local', () => {
    expect(pesoDaPassagemNoturna(0, UTC(6))).toBe(1); // 6h local: a noturna (1h30) é a mais recente
    expect(pesoDaPassagemNoturna(0, UTC(18))).toBe(0); // 18h local: a diurna (13h30)
    expect(pesoDaPassagemNoturna(-45, UTC(9))).toBe(1); // 6h local no Brasil
    expect(pesoDaPassagemNoturna(0, UTC(13, 30))).toBeCloseTo(0.5, 1);
  });

  it('monta o caminho do arquivo', () => {
    expect(caminhoDaNuvem('noite', { linha: 3, coluna: 10 })).toBe('nuvens/noite/3/10.webp');
  });
});
