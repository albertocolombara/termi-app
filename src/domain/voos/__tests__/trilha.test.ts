import { comprimentoKm, progressoNaRota, trilhaDoVoo } from '../trilha';
import { AGORA, voo } from './fabrica';

const MIN = 60_000;

describe('trilha do voo', () => {
  const v = voo(60);
  const amostra = (minAtras: number, lat: number, lon: number, extra: Partial<{ hex: string; destinoLat: number; destinoLon: number }> = {}) => ({
    hex: v.hex,
    destinoLat: v.destino.lat,
    destinoLon: v.destino.lon,
    lat,
    lon,
    em: AGORA - minAtras * MIN,
    ...extra,
  });

  it('ordena pelo tempo e fica só com o mesmo avião e destino', () => {
    const t = trilhaDoVoo(
      [amostra(20, 1, 1), amostra(40, 0.5, 0.5), amostra(30, 9, 9, { hex: 'outro' }), amostra(10, 1.2, 1.2, { destinoLat: 50, destinoLon: 5 })],
      v,
      AGORA,
    );
    expect(t.map((a) => a.lat)).toEqual([0.5, 1]);
  });

  it('descarta saltos impossíveis e amostras do futuro', () => {
    const t = trilhaDoVoo([amostra(40, 0, 0), amostra(20, 40, 40), amostra(0, 0.5, 0.5), amostra(-5, 1, 1)], v, AGORA);
    expect(t.map((a) => a.lat)).toEqual([0, 0.5]);
  });

  it('mede a rota voada pela trilha, não em linha reta', () => {
    const origem = { lat: 0, lon: 0 };
    const reta = progressoNaRota(origem, [], { lat: 0, lon: 5 }, { lat: 0, lon: 10 });
    expect(reta).toBeCloseTo(0.5, 2);
    const desvio = progressoNaRota(origem, [{ lat: 3, lon: 2.5 }], { lat: 0, lon: 5 }, { lat: 0, lon: 10 });
    expect(desvio).toBeGreaterThan(reta);
    expect(progressoNaRota(origem, [], { lat: 0, lon: 10 }, { lat: 0, lon: 10 })).toBe(1);
    expect(comprimentoKm([origem])).toBe(0);
  });
});
