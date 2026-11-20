/**
 * Filtros de região do painel de partidas (UC-02). Agrupam as regiões do coletor
 * (onde o avião está voando agora) em partes do mundo. Região nova do coletor sem grupo
 * aparece só em "Qualquer lugar".
 */
import type { Voo } from './tipos';

export type FiltroDeRegiao = 'qualquer' | 'europa' | 'america-do-norte' | 'america-do-sul' | 'asia' | 'oriente-medio' | 'oceania';

const GRUPOS: Record<Exclude<FiltroDeRegiao, 'qualquer'>, string[]> = {
  europa: ['londres-paris', 'frankfurt', 'istambul'],
  'america-do-norte': ['nova-york', 'los-angeles', 'chicago', 'dallas-atlanta'],
  'america-do-sul': ['sao-paulo'],
  asia: ['toquio', 'singapura'],
  'oriente-medio': ['dubai'],
  oceania: ['sydney'],
};

export function filtrarPorRegiao<T extends { voo: Voo }>(lista: T[], filtro: FiltroDeRegiao): T[] {
  if (filtro === 'qualquer') return lista;
  const regioes = GRUPOS[filtro];
  return lista.filter((e) => regioes.includes(e.voo.regiao));
}

/** Filtros que têm pelo menos um voo na lista (mais "Qualquer lugar", sempre). */
export function filtrosDisponiveis<T extends { voo: Voo }>(lista: T[]): FiltroDeRegiao[] {
  const comVoo = (Object.keys(GRUPOS) as Exclude<FiltroDeRegiao, 'qualquer'>[]).filter((f) => filtrarPorRegiao(lista, f).length > 0);
  return ['qualquer', ...comVoo];
}
