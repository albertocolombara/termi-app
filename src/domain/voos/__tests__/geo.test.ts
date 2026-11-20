import { distanciaKm, interpolar, kmParaMilhas, rumo } from '../geo';

const LONDRES = { lat: 51.47, lon: -0.45 };
const NOVA_YORK = { lat: 40.64, lon: -73.78 };

describe('geo', () => {
  it('mede a distância pelo grande círculo', () => {
    expect(distanciaKm(LONDRES, NOVA_YORK)).toBeCloseTo(5540, -2); // ~5.540 km (Heathrow–JFK na esfera)
    expect(distanciaKm(LONDRES, LONDRES)).toBe(0);
  });

  it('converte para milhas terrestres (~540 por hora de jato)', () => {
    expect(kmParaMilhas(869)).toBeCloseTo(540, 0);
  });

  it('interpola pelo grande círculo', () => {
    const meio = interpolar(LONDRES, NOVA_YORK, 0.5);
    expect(distanciaKm(LONDRES, meio)).toBeCloseTo(distanciaKm(meio, NOVA_YORK), 0);
    expect(meio.lat).toBeGreaterThan(51); // a rota sobe ao norte, não é reta no mapa
    expect(interpolar(LONDRES, NOVA_YORK, 0)).toEqual(expect.objectContaining({ lat: expect.closeTo(LONDRES.lat, 6) }));
  });

  it('calcula o rumo', () => {
    expect(rumo({ lat: 0, lon: 0 }, { lat: 10, lon: 0 })).toBeCloseTo(0, 5);
    expect(rumo({ lat: 0, lon: 0 }, { lat: 0, lon: 10 })).toBeCloseTo(90, 5);
  });
});
