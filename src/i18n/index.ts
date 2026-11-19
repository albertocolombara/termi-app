import { ptBR } from './pt-BR';

type Dicionario = typeof ptBR;
type Folhas<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Folhas<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Chave de texto, ex.: 'avisos.pousoTitulo'. */
export type ChaveDeTexto = Folhas<Dicionario>;

/**
 * Texto da interface. Variáveis entre chaves: t('avisos.pousoCorpo', { min: 25 }).
 * Só pt-BR por enquanto; o inglês entra depois da validação no Brasil (RNF-14).
 */
export function t(chave: ChaveDeTexto, vars?: Record<string, string | number>): string {
  const texto = chave.split('.').reduce<unknown>((no, parte) => (no as Record<string, unknown>)[parte], ptBR);
  if (typeof texto !== 'string') return chave;
  return vars ? texto.replace(/\{(\w+)\}/g, (_, nome) => String(vars[nome] ?? `{${nome}}`)) : texto;
}
