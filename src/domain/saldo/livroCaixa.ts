/**
 * Saldo em $ do jogo = soma dos lançamentos (tabela `lancamentos`). PRD: RN-13, RN-14.
 * Lançamentos só são acrescentados; o saldo nunca é um número solto.
 */

export type Lancamento =
  | { tipo: 'credito_voo'; valor: number; sessaoId: string }
  | { tipo: 'compra_souvenir'; valor: number; souvenirId: string };

export function saldo(lancamentos: Lancamento[]): number {
  return lancamentos.reduce((s, l) => s + l.valor, 0);
}

export function creditoDeVoo(sessaoId: string, dolares: number): Lancamento {
  if (!Number.isInteger(dolares) || dolares < 0) throw new Error('crédito de voo inválido');
  return { tipo: 'credito_voo', valor: dolares, sessaoId };
}

export type ResultadoCompra = { ok: true; lancamento: Lancamento } | { ok: false; faltam: number };

/** Compra de souvenir: só com saldo suficiente; devolve quanto falta se não der. */
export function comprarSouvenir(lancamentos: Lancamento[], souvenirId: string, preco: number): ResultadoCompra {
  if (!Number.isInteger(preco) || preco <= 0) throw new Error('preço inválido');
  const atual = saldo(lancamentos);
  if (atual < preco) return { ok: false, faltam: preco - atual };
  return { ok: true, lancamento: { tipo: 'compra_souvenir', valor: -preco, souvenirId } };
}
