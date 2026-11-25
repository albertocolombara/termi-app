import { lerCatalogo, mesclarCatalogos, souvenirDoPais, souvenirsDisponiveis, type Catalogo } from '../catalogo';

const AGORA = Date.UTC(2026, 10, 25, 12);

const json = (souvenirs: unknown[], versao = 1) => ({ versao, atualizadoEm: '2026-11-25T12:00:00Z', souvenirs });
const jp = { id: 'pais-jp', pais: 'JP', nome: 'Japão', nomeNativo: '日本' };

describe('lerCatalogo', () => {
  it('lê um souvenir de país com preço e metal padrão (RN-14)', () => {
    const c = lerCatalogo(json([jp]))!;
    expect(c.souvenirs[0]).toMatchObject({ id: 'pais-jp', pais: 'JP', tipo: 'pais', metal: 'niquel', preco: 200, nomeNativo: '日本' });
  });

  it('ignora entradas inválidas e repetidas, mas mantém as boas', () => {
    const c = lerCatalogo(json([jp, { id: 'x' }, { ...jp, nome: 'outro' }, { id: 'pais-br', pais: 'bra', nome: 'Brasil' }, null]))!;
    expect(c.souvenirs.map((s) => s.id)).toEqual(['pais-jp']);
  });

  it('formato de outra versão ou sem souvenirs: não usa', () => {
    expect(lerCatalogo(json([jp], 2))).toBeNull();
    expect(lerCatalogo(json([]))).toBeNull();
    expect(lerCatalogo('oi')).toBeNull();
  });
});

describe('mesclarCatalogos', () => {
  const embutido = lerCatalogo(json([jp, { id: 'pais-br', pais: 'BR', nome: 'Brasil' }]))!;

  it('a coleção só cresce: o que sumiu do remoto continua (RN-16)', () => {
    const remoto = lerCatalogo(json([{ id: 'pais-mx', pais: 'MX', nome: 'México' }]))!;
    expect(mesclarCatalogos(embutido, remoto).map((s) => s.id)).toEqual(['pais-jp', 'pais-br', 'pais-mx']);
  });

  it('a fonte mais nova atualiza os dados sem mudar a ordem', () => {
    const remoto: Catalogo = lerCatalogo(json([{ id: 'pais-br', pais: 'BR', nome: 'Brasil', imagem2d: 'colecao/pais-br.webp' }]))!;
    const r = mesclarCatalogos(embutido, null, remoto);
    expect(r.map((s) => s.id)).toEqual(['pais-jp', 'pais-br']);
    expect(r[1].imagem2d).toBe('colecao/pais-br.webp');
  });
});

describe('disponíveis e loja', () => {
  const c = lerCatalogo(
    json([jp, { id: 'pais-mx', pais: 'MX', nome: 'México', disponivelDesde: '2026-12-01T00:00:00Z' }, { id: 'cidade-tyo', pais: 'JP', tipo: 'cidade', nome: 'Tóquio' }]),
  )!.souvenirs;

  it('lançamento agendado ainda não aparece', () => {
    expect(souvenirsDisponiveis(c, AGORA).map((s) => s.id)).toEqual(['pais-jp', 'cidade-tyo']);
    expect(souvenirsDisponiveis(c, Date.UTC(2026, 11, 2)).length).toBe(3);
  });

  it('a loja do pouso vende o souvenir do país', () => {
    expect(souvenirDoPais(c, 'jp', AGORA)?.id).toBe('pais-jp');
    expect(souvenirDoPais(c, 'MX', AGORA)).toBeNull();
    expect(souvenirDoPais(c, null, AGORA)).toBeNull();
  });
});
