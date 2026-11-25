import { regioesQueCobrem } from '../cobertura';

const chicago = { id: 'chicago', area: { lat: 41.9, lon: -87.9, raioKm: 463 } };
const novaYork = { id: 'nova-york', area: { lat: 40.6, lon: -73.8, raioKm: 463 } };
const antiga = { id: 'sem-area', area: null };

describe('regioesQueCobrem', () => {
  it('acha a área que cobre o ponto, com margem para dentro da borda', () => {
    expect(regioesQueCobrem([chicago, novaYork, antiga], { lat: 41.6, lon: -86.0 }).map((r) => r.id)).toEqual(['chicago']);
    // Pensilvânia central: fora das duas áreas (posição estimada, sem aviso)
    expect(regioesQueCobrem([chicago, novaYork], { lat: 40.8, lon: -80.5 })).toEqual([]);
    // a 430 km de Chicago: dentro do raio, mas na margem da borda
    expect(regioesQueCobrem([chicago], { lat: 41.9, lon: -82.7 })).toEqual([]);
  });
});
