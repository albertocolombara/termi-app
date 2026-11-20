import { buscarVoosAoVivo, buscarVoosDeOntem, faixaDoDia, voosDaRegiao, type RegiaoJson } from '../cache';

const AGORA = Date.UTC(2026, 10, 20, 15, 47);
const iso = (ms: number) => new Date(ms).toISOString();

function regiao(id: string, coletadoEm: number, n = 1): RegiaoJson {
  return {
    versao: 1,
    regiao: id,
    nome: id,
    coletadoEm: iso(coletadoEm),
    atribuicao: 'Dados de voo: adsb.lol (ODbL 1.0)',
    voos: Array.from({ length: n }, (_, i) => ({
      hex: `${id}${i}`,
      callsign: 'TAM3300',
      companhia: 'TAM',
      companhiaPais: 'BR',
      aeronave: 'A320',
      origem: { iata: 'GRU', icao: 'SBGR', nome: 'Guarulhos', lat: -23.4, lon: -46.5 },
      destino: { iata: 'GIG', icao: 'SBGL', nome: 'Galeão', lat: -22.8, lon: -43.2 },
      lat: -23.1,
      lon: -45.2,
      altitudePes: 33000,
      velocidadeNos: 420,
      rumo: 70,
      distanciaRestanteKm: 200,
      pousoPrevistoEm: iso(coletadoEm + 30 * 60_000),
    })),
  };
}

function mockFetch(arquivos: Record<string, unknown>) {
  globalThis.fetch = jest.fn(async (url: string) => {
    const caminho = String(url).replace('https://dados.test', '');
    if (!(caminho in arquivos)) return { ok: false, status: 404, json: async () => ({}) } as Response;
    return { ok: true, status: 200, json: async () => arquivos[caminho] } as Response;
  }) as unknown as typeof fetch;
}

describe('voosDaRegiao', () => {
  it('converte horários para ms e ignora voos quebrados', () => {
    const r = regiao('sao-paulo', AGORA, 2);
    r.voos[1].lat = Number.NaN;
    const v = voosDaRegiao(r);
    expect(v).toHaveLength(1);
    expect(v[0].coletadoEm).toBe(AGORA);
    expect(v[0].pousoPrevistoEm).toBe(AGORA + 30 * 60_000);
    expect(v[0].companhiaPais).toBe('BR');
  });

  it('recusa versão desconhecida do contrato', () => {
    expect(() => voosDaRegiao({ ...regiao('x', AGORA), versao: 2 })).toThrow();
  });
});

describe('buscarVoosAoVivo', () => {
  it('lê o índice e todas as regiões; uma região fora não derruba as outras', async () => {
    mockFetch({
      '/voos/indice.json': {
        versao: 1,
        atualizadoEm: iso(AGORA),
        regioes: {
          'sao-paulo': { nome: 'São Paulo', coletadoEm: iso(AGORA), voos: 2 },
          toquio: { nome: 'Tóquio', coletadoEm: iso(AGORA), voos: 1 },
        },
      },
      '/voos/sao-paulo.json': regiao('sao-paulo', AGORA, 2),
    });
    const r = await buscarVoosAoVivo('https://dados.test');
    expect(r.regioes.map((x) => x.id)).toEqual(['sao-paulo', 'toquio']);
    expect(r.voos).toHaveLength(2);
    expect(r.atribuicao).toContain('adsb.lol');
  });
});

describe('voo de ontem (RN-12)', () => {
  it('usa a faixa de 20 min do coletor', () => {
    expect(faixaDoDia(AGORA)).toBe('1540');
  });

  it('lê a faixa de ontem e desloca os horários 24 h', async () => {
    const ontem = AGORA - 24 * 60 * 60_000 - 5 * 60_000;
    mockFetch({ '/historico/sao-paulo/1540.json': regiao('sao-paulo', ontem), '/historico/toquio/1540.json': regiao('toquio', AGORA - 2 * 60 * 60_000) });
    const v = await buscarVoosDeOntem('https://dados.test', ['sao-paulo', 'toquio'], AGORA);
    expect(v).toHaveLength(1); // o de Tóquio tem 2 h: não é de ontem
    expect(v[0].coletadoEm).toBe(AGORA - 5 * 60_000);
    expect(v[0].pousoPrevistoEm).toBe(AGORA + 25 * 60_000);
  });
});
