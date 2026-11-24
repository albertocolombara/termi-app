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
      callsign: 'DAL389',
      companhia: 'DAL',
      companhiaPais: 'US',
      aeronave: 'A359',
      origem: { iata: 'DTW', icao: 'KDTW', nome: 'Detroit', lat: 42.2, lon: -83.3 },
      destino: { iata: 'PVG', icao: 'ZSPD', nome: 'Pudong', lat: 31.1, lon: 121.8 },
      lat: 50,
      lon: 170,
      altitudePes: 36000,
      velocidadeNos: 480,
      rumo: 250,
      distanciaRestanteKm: 4000,
      pousoPrevistoEm: iso(AGORA + 5 * 3_600_000),
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

const indice = {
  versao: 1,
  regioes: { a: { nome: 'A', coletadoEm: iso(AGORA), voos: 1 }, b: { nome: 'B', coletadoEm: iso(AGORA), voos: 1 } },
};

describe('lerAviao', () => {
  it('acha o avião na região dele sem baixar as outras', async () => {
    const pedidos = mockFetch({ '/voos/a.json': regiao('a', ['abc']), '/voos/indice.json': indice });
    const voo = voosDaRegiao(regiao('a', ['abc']))[0];
    expect((await lerAviao(voo, AGORA))?.hex).toBe('abc');
    expect(pedidos).toEqual(['/voos/a.json']);
  });

  it('se saiu da região, procura nas outras (no máximo a cada 20 min)', async () => {
    const voo = { ...voosDaRegiao(regiao('a', ['xyz']))[0], hex: 'mudou' };
    const pedidos = mockFetch({ '/voos/a.json': regiao('a', ['abc']), '/voos/b.json': regiao('b', ['mudou']), '/voos/indice.json': indice });
    const achado = await lerAviao(voo, AGORA);
    expect(achado?.regiao).toBe('b');
    expect(pedidos).toContain('/voos/indice.json');
    // Logo depois, sem achar na região antiga, não repete a busca geral.
    const pedidos2 = mockFetch({ '/voos/a.json': regiao('a', ['abc']), '/voos/indice.json': indice });
    expect(await lerAviao(voo, AGORA + 5 * 60_000)).toBeNull();
    expect(pedidos2).toEqual(['/voos/a.json']);
    // Passados 20 min, procura de novo.
    const pedidos3 = mockFetch({ '/voos/a.json': regiao('a', ['abc']), '/voos/b.json': regiao('b', ['mudou']), '/voos/indice.json': indice });
    expect((await lerAviao(voo, AGORA + BUSCA_GERAL_A_CADA_MS + 1))?.regiao).toBe('b');
    expect(pedidos3).toContain('/voos/b.json');
  });
});
