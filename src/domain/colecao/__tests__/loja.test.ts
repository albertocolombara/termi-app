import { lerCatalogo } from '../catalogo';
import { emPaginas, LIMITE_DA_ECONOMICA, lojasDosPousos, pousouNoPais, situacaoDaCompra } from '../loja';

const CATALOGO = lerCatalogo({
  versao: 1,
  atualizadoEm: '2026-11-25T12:00:00Z',
  souvenirs: [
    { id: 'pais-jp', pais: 'JP', nome: 'Japão' },
    { id: 'pais-pt', pais: 'PT', nome: 'Portugal' },
    { id: 'rara-nomade', pais: 'PT', tipo: 'rara', nome: 'Nômade' },
  ],
})!.souvenirs;

const jp = { id: 'pais-jp', preco: 200 };

describe('situacaoDaCompra', () => {
  it('Plus com saldo compra em qualquer loja', () => {
    expect(situacaoDaCompra({ souvenir: jp, naMala: [], saldo: 200, classe: 'primeira', origem: 'lojas' })).toEqual({ tipo: 'pode' });
    expect(situacaoDaCompra({ souvenir: jp, naMala: ['a', 'b', 'c'], saldo: 500, classe: 'primeira', origem: 'pouso' })).toEqual({ tipo: 'pode' });
  });

  it('mostra quanto falta (A1)', () => {
    expect(situacaoDaCompra({ souvenir: jp, naMala: [], saldo: 140, classe: 'primeira', origem: 'pouso' })).toEqual({ tipo: 'falta_saldo', faltam: 60 });
  });

  it('souvenir já comprado fica "na mala" (A2), em qualquer classe', () => {
    expect(situacaoDaCompra({ souvenir: jp, naMala: ['pais-jp'], saldo: 0, classe: 'economica', origem: 'lojas' })).toEqual({ tipo: 'na_mala' });
  });

  it('econômica só compra na loja do pouso (A6)', () => {
    expect(situacaoDaCompra({ souvenir: jp, naMala: [], saldo: 999, classe: 'economica', origem: 'lojas' })).toEqual({ tipo: 'so_no_plus' });
    expect(situacaoDaCompra({ souvenir: jp, naMala: [], saldo: 999, classe: 'economica', origem: 'pouso' })).toEqual({ tipo: 'pode' });
  });

  it(`econômica leva até ${LIMITE_DA_ECONOMICA} souvenirs; o seguinte abre o paywall (A3)`, () => {
    expect(situacaoDaCompra({ souvenir: jp, naMala: ['a'], saldo: 999, classe: 'economica', origem: 'pouso' })).toEqual({ tipo: 'pode' });
    expect(situacaoDaCompra({ souvenir: jp, naMala: ['a', 'b'], saldo: 999, classe: 'economica', origem: 'pouso' })).toEqual({ tipo: 'mala_cheia' });
  });

  it('mala cheia vem antes do saldo: a econômica não vê "faltam $" de algo que não pode comprar', () => {
    expect(situacaoDaCompra({ souvenir: jp, naMala: ['a', 'b', 'c'], saldo: 0, classe: 'economica', origem: 'pouso' })).toEqual({ tipo: 'mala_cheia' });
  });
});

describe('lojasDosPousos', () => {
  const pousos = [
    { pais: 'JP', cidade: 'Tokyo', aeroporto: 'HND', data: 10 },
    { pais: 'pt', cidade: 'Lisbon', aeroporto: 'LIS', data: 30 },
    { pais: 'JP', cidade: 'Osaka', aeroporto: 'KIX', data: 20 },
    { pais: 'KR', cidade: 'Seoul', aeroporto: 'ICN', data: 40 },
    { pais: null, cidade: null, aeroporto: null, data: 50 },
  ];

  it('um cartão por país com souvenir, com o último pouso, do mais recente ao mais antigo', () => {
    const lojas = lojasDosPousos(CATALOGO, pousos);
    expect(lojas.map((l) => [l.souvenir.id, l.cidade])).toEqual([
      ['pais-pt', 'Lisbon'],
      ['pais-jp', 'Osaka'],
    ]);
  });

  it('sem pousos, sem lojas', () => {
    expect(lojasDosPousos(CATALOGO, [])).toEqual([]);
  });

  it('pousouNoPais ignora maiúsculas', () => {
    expect(pousouNoPais(pousos, 'pt')).toBe(true);
    expect(pousouNoPais(pousos, 'FR')).toBe(false);
  });
});

describe('emPaginas', () => {
  it('divide em páginas de 4', () => {
    expect(emPaginas([1, 2, 3, 4, 5], 4)).toEqual([[1, 2, 3, 4], [5]]);
    expect(emPaginas([], 4)).toEqual([]);
  });
});
