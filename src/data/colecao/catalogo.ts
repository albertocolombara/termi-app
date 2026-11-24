/**
 * Catálogo da coleção de souvenirs (RN-16, RN-17). Hoje fica no app; o catálogo remoto e versionado
 * entra na Fase 4 ([Proposta] no ROADMAP). As telas leem o tamanho daqui: nunca fixe o total em texto.
 * Países novos só se somam ao fim da lista; nenhum sai (a coleção só cresce).
 */
export type Souvenir = {
  /** Id do catálogo (vai para `souvenirs_na_mala.souvenir_id`). */
  id: string;
  /** País (ISO 3166-1 alfa-2). */
  pais: string;
  /** Nome do país em português, como aparece na mala. */
  nome: string;
  metal: 'niquel' | 'cobre' | 'latao';
};

export const CATALOGO: readonly Souvenir[] = [
  { id: 'pais-jp', pais: 'JP', nome: 'Japão', metal: 'niquel' },
  { id: 'pais-pt', pais: 'PT', nome: 'Portugal', metal: 'niquel' },
  { id: 'pais-es', pais: 'ES', nome: 'Espanha', metal: 'niquel' },
  { id: 'pais-fr', pais: 'FR', nome: 'França', metal: 'niquel' },
  { id: 'pais-it', pais: 'IT', nome: 'Itália', metal: 'niquel' },
  { id: 'pais-de', pais: 'DE', nome: 'Alemanha', metal: 'niquel' },
  { id: 'pais-nl', pais: 'NL', nome: 'Holanda', metal: 'niquel' },
  { id: 'pais-us', pais: 'US', nome: 'EUA', metal: 'niquel' },
  { id: 'pais-ar', pais: 'AR', nome: 'Argentina', metal: 'niquel' },
  { id: 'pais-cl', pais: 'CL', nome: 'Chile', metal: 'niquel' },
  { id: 'pais-uy', pais: 'UY', nome: 'Uruguai', metal: 'niquel' },
  { id: 'pais-br', pais: 'BR', nome: 'Brasil', metal: 'niquel' },
  { id: 'pais-gb', pais: 'GB', nome: 'Reino Unido', metal: 'niquel' },
];
