/**
 * Compra de souvenir no SQLite (PRD: RN-13, RN-14; UC-08 passo 6 e A6).
 *
 * Uma única transação exclusiva (CLAUDE.md §6.5): relê o saldo e a mala, confere as regras de
 * `domain/colecao/loja` e grava o souvenir na mala e o débito no livro-caixa. Assim dois toques
 * seguidos não compram duas vezes nem deixam o saldo negativo. Só acrescenta: nada de DELETE.
 */
import { precoNaLoja, situacaoDaCompra, type Origem, type PousoCompleto, type SituacaoDaCompra } from '@/domain/colecao/loja';
import type { Classe } from '@/domain/sessao/duracao';

type Valor = string | number | null;

type Leitura = {
  getFirstAsync<T>(sql: string, ...params: Valor[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: Valor[]): Promise<T[]>;
};

export type BancoDaLoja = Leitura & {
  withExclusiveTransactionAsync(
    tarefa: (txn: Leitura & { runAsync(sql: string, ...params: Valor[]): Promise<{ changes: number }> }) => Promise<void>,
  ): Promise<void>;
};

export type PedidoDeCompra = {
  souvenirId: string;
  /** Preço do catálogo; a loja remota cobra o acréscimo (`precoNaLoja`). */
  preco: number;
  classe: Classe;
  origem: Origem;
  /** Sessão do pouso (loja do destino); nulo nas "Lojas" do Plus. */
  sessaoId: string | null;
  quando: number;
};

/** Resultado da compra: `pode` quer dizer que comprou; os outros dizem por que não. */
export async function comprarSouvenir(db: BancoDaLoja, p: PedidoDeCompra): Promise<SituacaoDaCompra> {
  let resultado: SituacaoDaCompra = { tipo: 'pode' };
  await db.withExclusiveTransactionAsync(async (txn) => {
    const s = await txn.getFirstAsync<{ saldo: number | null }>('SELECT SUM(valor) AS saldo FROM lancamentos');
    const mala = await txn.getAllAsync<{ souvenir_id: string }>('SELECT souvenir_id FROM souvenirs_na_mala');
    resultado = situacaoDaCompra({
      souvenir: { id: p.souvenirId, preco: p.preco },
      naMala: mala.map((m) => m.souvenir_id),
      saldo: s?.saldo ?? 0,
      classe: p.classe,
      origem: p.origem,
    });
    if (resultado.tipo !== 'pode') return;
    const preco = precoNaLoja({ preco: p.preco }, p.origem);
    await txn.runAsync(
      'INSERT INTO souvenirs_na_mala (souvenir_id, comprado_em, sessao_id, preco, amostra) VALUES (?, ?, ?, ?, ?)',
      p.souvenirId,
      p.quando,
      p.sessaoId,
      preco,
      p.classe === 'primeira' ? 0 : 1,
    );
    await txn.runAsync(
      "INSERT INTO lancamentos (id, tipo, valor, sessao_id, souvenir_id, criado_em) VALUES (?, 'compra_souvenir', ?, ?, ?, ?)",
      `compra-${p.souvenirId}`,
      -preco,
      p.sessaoId,
      p.souvenirId,
      p.quando,
    );
  });
  return resultado;
}

/** Pousos completos (carimbos de pouso): os países cuja loja já abriu. */
export async function pousosCompletos(db: Leitura): Promise<PousoCompleto[]> {
  return db.getAllAsync<PousoCompleto>('SELECT pais, cidade, aeroporto, data FROM carimbos WHERE sessao_id IS NOT NULL ORDER BY data DESC');
}

export type SouvenirDaMala = { souvenirId: string; compradoEm: number; sessaoId: string | null; preco: number };

/** Um souvenir comprado (M1b: onde, em qual voo e por quanto). null se não está na mala. */
export async function souvenirDaMala(db: Leitura, souvenirId: string): Promise<SouvenirDaMala | null> {
  const r = await db.getFirstAsync<{ souvenir_id: string; comprado_em: number; sessao_id: string | null; preco: number }>(
    'SELECT souvenir_id, comprado_em, sessao_id, preco FROM souvenirs_na_mala WHERE souvenir_id = ?',
    souvenirId,
  );
  return r ? { souvenirId: r.souvenir_id, compradoEm: r.comprado_em, sessaoId: r.sessao_id, preco: r.preco } : null;
}
