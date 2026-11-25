import { comprarSouvenir, type BancoDaLoja, type PedidoDeCompra } from '../loja';

function bancoFalso(saldo: number, mala: string[]) {
  const escritas: { sql: string; params: unknown[] }[] = [];
  const leitura = {
    getFirstAsync: async <T,>() => ({ saldo }) as T,
    getAllAsync: async <T,>() => mala.map((souvenir_id) => ({ souvenir_id })) as T[],
  };
  const db: BancoDaLoja = {
    ...leitura,
    withExclusiveTransactionAsync: async (tarefa) => {
      await tarefa({
        ...leitura,
        runAsync: async (sql, ...params) => {
          escritas.push({ sql, params });
          return { changes: 1 };
        },
      });
    },
  };
  return { db, escritas };
}

const pedido: PedidoDeCompra = { souvenirId: 'pais-jp', preco: 200, classe: 'economica', origem: 'pouso', sessaoId: 's1', quando: 1000 };

describe('comprarSouvenir', () => {
  it('grava o souvenir e o débito na mesma transação', async () => {
    const { db, escritas } = bancoFalso(340, []);
    expect(await comprarSouvenir(db, pedido)).toEqual({ tipo: 'pode' });
    expect(escritas).toHaveLength(2);
    expect(escritas[0].sql).toMatch(/INSERT INTO souvenirs_na_mala/);
    expect(escritas[0].params).toEqual(['pais-jp', 1000, 's1', 200, 1]);
    expect(escritas[1].sql).toMatch(/INSERT INTO lancamentos/);
    expect(escritas[1].params).toEqual(['compra-pais-jp', -200, 's1', 'pais-jp', 1000]);
    for (const { sql } of escritas) expect(sql).not.toMatch(/DELETE|UPDATE/i);
  });

  it('não grava nada sem saldo, com o souvenir já na mala ou com a mala de amostra cheia', async () => {
    for (const [saldo, mala, esperado] of [
      [100, [], 'falta_saldo'],
      [999, ['pais-jp'], 'na_mala'],
      [999, ['a', 'b'], 'mala_cheia'],
    ] as const) {
      const { db, escritas } = bancoFalso(saldo, [...mala]);
      expect((await comprarSouvenir(db, pedido)).tipo).toBe(esperado);
      expect(escritas).toHaveLength(0);
    }
  });

  it('Plus compra pela loja remota, sem sessão, fora da amostra, com o acréscimo', async () => {
    const { db, escritas } = bancoFalso(250, ['a', 'b', 'c']);
    expect(await comprarSouvenir(db, { ...pedido, classe: 'primeira', origem: 'lojas', sessaoId: null })).toEqual({ tipo: 'pode' });
    expect(escritas[0].params).toEqual(['pais-jp', 1000, null, 250, 0]);
    expect(escritas[1].params).toEqual(['compra-pais-jp', -250, null, 'pais-jp', 1000]);
  });
});
