import { distanciaKm } from '../geo';
import { milhasVoadas, projetar } from '../projecao';
import { AGORA, voo } from './fabrica';

describe('projetar', () => {
  const v = voo(60);

  it('começa na posição coletada e chega ao destino no pouso previsto', () => {
    const p0 = projetar(v, AGORA);
    expect(p0.lat).toBeCloseTo(v.lat, 6);
    const fim = projetar(v, v.pousoPrevistoEm);
    expect(distanciaKm(fim, v.destino)).toBeLessThan(0.01);
    expect(fim.noSolo).toBe(true);
    expect(fim.altitudePes).toBe(0);
  });

  it('desce nos últimos 30 min e mantém o cruzeiro antes', () => {
    expect(projetar(v, AGORA + 20 * 60_000).altitudePes).toBe(35000);
    expect(projetar(v, AGORA + 45 * 60_000).altitudePes).toBe(17500);
  });

  it('fica no destino depois do pouso previsto', () => {
    expect(projetar(v, AGORA + 90 * 60_000).fracao).toBe(1);
  });
});

describe('milhasVoadas', () => {
  it('soma a distância real voada no intervalo', () => {
    const v = voo(60);
    const total = milhasVoadas(v, AGORA, v.pousoPrevistoEm);
    const metade = milhasVoadas(v, AGORA, AGORA + 30 * 60_000);
    expect(total).toBe(Math.round(distanciaKm(v, v.destino) / 1.609344));
    expect(metade).toBeCloseTo(total / 2, -1);
    expect(milhasVoadas(v, AGORA, AGORA)).toBe(0);
  });
});
