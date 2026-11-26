/**
 * Catálogo da coleção de souvenirs (RN-14, RN-16, RN-17; ADR-14, aprovado pelo Alberto em 25/11/2026).
 *
 * O catálogo vem do R2 (`/colecao/catalogo.json`), com uma cópia embutida no app para o primeiro uso
 * sem internet. Assim países novos entram sem nova versão na loja. Regras:
 * - A coleção só cresce (RN-16): um souvenir que o app já conheceu nunca some, mesmo que o arquivo
 *   remoto venha sem ele (erro de publicação). A ordem é a de quem chegou primeiro.
 * - Entrada inválida é ignorada; o resto do catálogo continua valendo.
 * - `disponivelDesde` no futuro: o souvenir ainda não aparece (lançamento agendado).
 * Funções puras: sem rede, sem armazenamento.
 */

export type Metal = 'niquel' | 'cobre' | 'latao';
export type TipoDeSouvenir = 'pais' | 'cidade' | 'rara';

export type Souvenir = {
  /** Id estável (vai para `souvenirs_na_mala.souvenir_id`); nunca muda nem é reaproveitado. */
  id: string;
  /** País (ISO 3166-1 alfa-2): o pouso nesse país abre a loja desse souvenir. */
  pais: string;
  tipo: TipoDeSouvenir;
  metal: Metal;
  /** Preço em $ (moeda do jogo). */
  preco: number;
  /** Nome em português, como aparece na mala. */
  nome: string;
  /** Nome na forma nativa, como gravado na medalha (RN-16). */
  nomeNativo: string;
  /** Desenho da medalha ("Sakura", "Bonde"), mostrado na loja e na mala; null = ainda sem nome. */
  motivo: string | null;
  /** Caminhos no R2 (relativos à base), baixados sob demanda. */
  imagem2d: string | null;
  modelo3d: string | null;
  /** ms; null = disponível. */
  disponivelDesde: number | null;
};

export type Catalogo = { versao: number; atualizadoEm: number; souvenirs: Souvenir[] };

/** Versão do formato que este app entende. Campo novo não muda a versão; mudar o sentido de um campo muda. */
export const VERSAO_DO_FORMATO = 1;

/** Preço por tipo (RN-14): país (níquel) $200, cidade (cobre) $100, rara (latão) $500. */
export const PRECO_POR_TIPO: Record<TipoDeSouvenir, number> = { pais: 200, cidade: 100, rara: 500 };
const METAL_POR_TIPO: Record<TipoDeSouvenir, Metal> = { pais: 'niquel', cidade: 'cobre', rara: 'latao' };

const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

function lerSouvenir(e: unknown): Souvenir | null {
  if (!e || typeof e !== 'object') return null;
  const o = e as Record<string, unknown>;
  const id = texto(o.id);
  const pais = texto(o.pais)?.toUpperCase() ?? null;
  const nome = texto(o.nome);
  if (!id || !pais || !/^[A-Z]{2}$/.test(pais) || !nome) return null;
  const tipo: TipoDeSouvenir = o.tipo === 'cidade' || o.tipo === 'rara' ? o.tipo : 'pais';
  const metal: Metal = o.metal === 'niquel' || o.metal === 'cobre' || o.metal === 'latao' ? o.metal : METAL_POR_TIPO[tipo];
  const preco = typeof o.preco === 'number' && Number.isFinite(o.preco) && o.preco > 0 ? Math.round(o.preco) : PRECO_POR_TIPO[tipo];
  const desde = typeof o.disponivelDesde === 'string' ? Date.parse(o.disponivelDesde) : NaN;
  return {
    id,
    pais,
    tipo,
    metal,
    preco,
    nome,
    nomeNativo: texto(o.nomeNativo) ?? nome,
    motivo: texto(o.motivo),
    imagem2d: texto(o.imagem2d),
    modelo3d: texto(o.modelo3d),
    disponivelDesde: Number.isFinite(desde) ? desde : null,
  };
}

/**
 * Lê o JSON do catálogo. `null` se o arquivo não é um catálogo que este app entende (outra versão
 * do formato, ou sem nenhum souvenir válido): o app segue com o que já tinha.
 */
export function lerCatalogo(json: unknown): Catalogo | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (o.versao !== VERSAO_DO_FORMATO || !Array.isArray(o.souvenirs)) return null;
  const vistos = new Set<string>();
  const souvenirs: Souvenir[] = [];
  for (const e of o.souvenirs) {
    const s = lerSouvenir(e);
    if (!s || vistos.has(s.id)) continue;
    vistos.add(s.id);
    souvenirs.push(s);
  }
  if (souvenirs.length === 0) return null;
  const atualizadoEm = typeof o.atualizadoEm === 'string' ? Date.parse(o.atualizadoEm) : NaN;
  return { versao: VERSAO_DO_FORMATO, atualizadoEm: Number.isFinite(atualizadoEm) ? atualizadoEm : 0, souvenirs };
}

/**
 * Junta os catálogos do mais antigo para o mais novo (embutido, guardado no aparelho, remoto).
 * Cada souvenir fica com os dados da fonte mais nova que o tem; nenhum some (RN-16).
 */
export function mesclarCatalogos(...doMaisAntigo: (Catalogo | null | undefined)[]): Souvenir[] {
  const porId = new Map<string, Souvenir>();
  for (const c of doMaisAntigo) for (const s of c?.souvenirs ?? []) porId.set(s.id, s);
  return [...porId.values()];
}

/** Souvenirs visíveis agora (sem os de lançamento agendado), na ordem do catálogo. */
export function souvenirsDisponiveis(souvenirs: readonly Souvenir[], agora: number): Souvenir[] {
  return souvenirs.filter((s) => s.disponivelDesde === null || s.disponivelDesde <= agora);
}

/** Souvenir de país vendido na loja de um pouso naquele país (RF-29). */
export function souvenirDoPais(souvenirs: readonly Souvenir[], pais: string | null, agora: number): Souvenir | null {
  if (!pais) return null;
  return souvenirsDisponiveis(souvenirs, agora).find((s) => s.tipo === 'pais' && s.pais === pais.toUpperCase()) ?? null;
}

/** Volta ao formato do arquivo (para guardar no aparelho e ler de novo com `lerCatalogo`). */
export function catalogoParaJson(souvenirs: readonly Souvenir[], atualizadoEm: number) {
  return {
    versao: VERSAO_DO_FORMATO,
    atualizadoEm: new Date(atualizadoEm).toISOString(),
    souvenirs: souvenirs.map((s) => ({ ...s, disponivelDesde: s.disponivelDesde === null ? null : new Date(s.disponivelDesde).toISOString() })),
  };
}
