/**
 * Regras da loja de souvenirs (PRD: RN-08, RN-13, RN-14, RN-20; UC-08 A1–A3 e A6).
 * Decididas pelo Alberto em 25/11/2026:
 * - Loja do destino: abre depois de um pouso completo no país (RN-08), para todos.
 * - Econômica: até 2 souvenirs na mala (amostra), comprados só na loja do pouso. O 3º abre o paywall.
 *   Quem já tem mais que o limite continua com todos (nada se tira, CLAUDE.md §2.2).
 * - Plus: a tela "Lojas" fica aberta a qualquer hora, com os países onde já houve pouso completo.
 *   Na econômica ela aparece bloqueada.
 * Funções puras: sem banco, sem React.
 */
import type { Classe } from '@/domain/sessao/duracao';

import type { Souvenir } from './catalogo';

/** Quantos souvenirs cabem na mala de amostra da econômica (RN-14). */
export const LIMITE_DA_ECONOMICA = 2;

/** De onde a compra está sendo feita. */
export type Origem = 'pouso' | 'lojas';

export type SituacaoDaCompra =
  | { tipo: 'pode' }
  | { tipo: 'na_mala' }
  /** Econômica fora da loja do pouso: comprar depois é do Plus. */
  | { tipo: 'so_no_plus' }
  /** Econômica com a mala de amostra cheia. */
  | { tipo: 'mala_cheia' }
  | { tipo: 'falta_saldo'; faltam: number };

/**
 * O que a loja oferece para um souvenir. A ordem importa: o que já é do usuário vem primeiro,
 * depois o que é do Plus, e só então o saldo (assim a econômica não vê "faltam $" de algo que nem pode comprar).
 */
export function situacaoDaCompra(p: {
  souvenir: Pick<Souvenir, 'id' | 'preco'>;
  naMala: readonly string[];
  saldo: number;
  classe: Classe;
  origem: Origem;
}): SituacaoDaCompra {
  if (p.naMala.includes(p.souvenir.id)) return { tipo: 'na_mala' };
  if (p.classe !== 'primeira') {
    if (p.origem !== 'pouso') return { tipo: 'so_no_plus' };
    if (p.naMala.length >= LIMITE_DA_ECONOMICA) return { tipo: 'mala_cheia' };
  }
  if (p.saldo < p.souvenir.preco) return { tipo: 'falta_saldo', faltam: p.souvenir.preco - p.saldo };
  return { tipo: 'pode' };
}

/** Pouso completo gravado (carimbo de pouso). */
export type PousoCompleto = { pais: string | null; cidade: string | null; aeroporto: string | null; data: number };

export type LojaDoPouso = {
  souvenir: Souvenir;
  /** Último pouso completo no país (cidade e data mostradas no cartão). */
  cidade: string | null;
  aeroporto: string | null;
  data: number;
};

/**
 * Lojas abertas na tela "Lojas": um cartão por souvenir de país onde já houve pouso completo,
 * do pouso mais recente para o mais antigo. País sem souvenir no catálogo não aparece.
 */
export function lojasDosPousos(souvenirs: readonly Souvenir[], pousos: readonly PousoCompleto[]): LojaDoPouso[] {
  const ultimo = new Map<string, PousoCompleto>();
  for (const p of pousos) {
    const pais = p.pais?.toUpperCase();
    if (!pais) continue;
    const antes = ultimo.get(pais);
    if (!antes || p.data > antes.data) ultimo.set(pais, p);
  }
  const lojas: LojaDoPouso[] = [];
  for (const s of souvenirs) {
    if (s.tipo !== 'pais') continue;
    const p = ultimo.get(s.pais);
    if (p) lojas.push({ souvenir: s, cidade: p.cidade, aeroporto: p.aeroporto, data: p.data });
  }
  return lojas.sort((a, b) => b.data - a.data);
}

/** O país teve pouso completo? (a loja dele só abre depois disso, RN-08). */
export function pousouNoPais(pousos: readonly PousoCompleto[], pais: string): boolean {
  return pousos.some((p) => p.pais?.toUpperCase() === pais.toUpperCase());
}

/** Divide uma lista em páginas (a grade de "Lojas" mostra 4 cartões por página). */
export function emPaginas<T>(itens: readonly T[], porPagina: number): T[][] {
  const paginas: T[][] = [];
  for (let i = 0; i < itens.length; i += porPagina) paginas.push(itens.slice(i, i + porPagina));
  return paginas;
}
