import { voosDaRegiao, type RegiaoJson } from '../cache';
import { BUSCA_GERAL_A_CADA_MS, lerAviao } from '../useVooAoVivo';

jest.mock('@/config/env', () => ({ env: { flightCacheUrl: 'https://dados.test' } }));

const AGORA = Date.UTC(2026, 10, 24, 15, 0);
const iso = (ms: number) => new Date(ms).toISOString();

function regiao(id: string, hexes: string[]): RegiaoJson {
  return {
    versao: 1,
    regiao: id,
    nome: id,
    coletadoEm: iso(AGORA),
    atribuicao: 'Dados de voo: adsb.lol (ODbL 1.0)',
    voos: hexes.map((hex) => ({
      hex,
      callsign: 'AAL2880',
      companhia: 'AAL',
      companhiaPais: 'US',
      aeronave: 'A321',
      origem: { iata: 'PHL', icao: 'KPHL', nome: 'Philadelphia', lat: 39.9, lon: -75.2 },
      destino: { iata: 'ORD', icao: 'KORD', nome: "O'Hare", lat: 41.98, lon: -87.9 },
      lat: 40.5,
      lon: -80,
      altitudePes: 36000,
      velocidadeNos: 450,
      rumo: 280,
      distanciaRestanteKm: 600,
      pousoPrevistoEm: iso(AGORA + 3_600_000),
    })),
  };
}

function mockFetch(arquivos: Record<string, unknown>) {
  const pedidos: string[] = [];
  globalThis.fetch = jest.fn(async (url: string) => {
    const caminho = String(url).replace('https://dados.test', '');
    pedidos.push(caminho);
    if (!(caminho in arquivos)) return { ok: false, status: 404, json: async () => ({}) } as Response;
    return { ok: true, status: 200, json: async () => arquivos[caminho] } as Response;
  }) as unknown as typeof fetch;
  return pedidos;
}

// Áreas: "a" em Nova York, "b" em Chicago (raio de 463 km, como o coletor publica).
const area = (lat: number, lon: number) => ({ lat, lon, raioKm: 463 });
const indice = {
  versao: 1,
  regioes: {
    a: { nome: 'A', coletadoEm: iso(AGORA), voos: 1, area: area(40.7, -74) },
    b: { nome: 'B', coletadoEm: iso(AGORA), voos: 1, area: area(41.9, -87.6) },
  },
};
const indiceAntigo = {
  versao: 1,
  regioes: { a: { nome: 'A', coletadoEm: iso(AGORA), voos: 1 }, b: { nome: 'B', coletadoEm: iso(AGORA), voos: 1 } },
};

const PERTO_DE_CHICAGO = { lat: 41.9, lon: -86.5 };
const ENTRE_AS_AREAS = { lat: 40.8, lon: -81 }; // ~600 km de NY, ~560 km de Chicago
const PERTO_DE_NY = { lat: 40.7, lon: -75 };

describe('lerAviao', () => {
  it('acha o avião na região dele sem baixar as outras', async () => {
    const pedidos = mockFetch({ '/voos/a.json': regiao('a', ['abc']), '/voos/indice.json': indice });
    const voo = voosDaRegiao(regiao('a', ['abc']))[0];
    const l = await lerAviao(voo, PERTO_DE_NY, AGORA);
    expect(l.situacao).toBe('ok');
    expect(l.voo?.hex).toBe('abc');
    expect(pedidos).toEqual(['/voos/a.json']);
  });

  it('se entrou em outra área, lê só a região que cobre a posição', async () => {
    const voo = voosDaRegiao(regiao('a', ['abc']))[0];
    const pedidos = mockFetch({ '/voos/a.json': regiao('a', []), '/voos/b.json': regiao('b', ['abc']), '/voos/indice.json': indice });
    const l = await lerAviao(voo, PERTO_DE_CHICAGO, AGORA);
    expect(l).toMatchObject({ situacao: 'ok', voo: { regiao: 'b' } });
    expect(pedidos).toEqual(['/voos/a.json', '/voos/indice.json', '/voos/b.json']);
  });

  it('fora das áreas do coletor: posição estimada, sem aviso (build-51)', async () => {
    const voo = voosDaRegiao(regiao('a', ['abc']))[0];
    const pedidos = mockFetch({ '/voos/a.json': regiao('a', []), '/voos/b.json': regiao('b', []), '/voos/indice.json': indice });
    expect(await lerAviao(voo, ENTRE_AS_AREAS, AGORA)).toEqual({ voo: null, situacao: 'fora-da-area' });
    expect(pedidos).not.toContain('/voos/b.json');
  });

  it('dentro de uma área e ausente da leitura: sem sinal', async () => {
    const voo = voosDaRegiao(regiao('a', ['abc']))[0];
    mockFetch({ '/voos/a.json': regiao('a', []), '/voos/b.json': regiao('b', []), '/voos/indice.json': indice });
    expect((await lerAviao(voo, PERTO_DE_NY, AGORA)).situacao).toBe('sem-sinal');
    expect((await lerAviao(voo, PERTO_DE_CHICAGO, AGORA)).situacao).toBe('sem-sinal');
  });

  it('índice antigo, sem áreas: busca geral no máximo a cada 20 min', async () => {
    const voo = { ...voosDaRegiao(regiao('a', ['xyz']))[0], hex: 'mudou' };
    const arquivos = { '/voos/a.json': regiao('a', []), '/voos/b.json': regiao('b', ['mudou']), '/voos/indice.json': indiceAntigo };
    mockFetch(arquivos);
    expect((await lerAviao(voo, ENTRE_AS_AREAS, AGORA)).voo?.regiao).toBe('b');
    const pedidos2 = mockFetch(arquivos);
    expect((await lerAviao(voo, ENTRE_AS_AREAS, AGORA + 5 * 60_000)).situacao).toBe('sem-sinal');
    expect(pedidos2).not.toContain('/voos/b.json');
    mockFetch(arquivos);
    expect((await lerAviao(voo, ENTRE_AS_AREAS, AGORA + BUSCA_GERAL_A_CADA_MS + 1)).voo?.regiao).toBe('b');
  });
});
