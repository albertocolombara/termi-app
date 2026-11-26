/**
 * Foto do avião real (Planespotters.net), em teste: exceção à regra 7 (companhias só pela
 * bandeira) aberta pelo Alberto em 26/11/2026 para avaliar a imersão.
 *
 * Termos da API (https://www.planespotters.net/photo/api), que o app segue:
 * - foto grátis para todos (nunca recurso do Plus);
 * - crédito do fotógrafo visível ao lado da foto, e a foto leva à página dela no Planespotters;
 * - endereços usados sem mudar, imagem baixada direto deles, sem gravar no aparelho;
 * - resposta da API guardada no máximo 24 h.
 * Função pura: lê a resposta e devolve só o que o app usa, ou null.
 */
export type FotoDoAviao = {
  /** Miniatura, como veio da API (não mudar o endereço). */
  imagem: string;
  largura: number;
  altura: number;
  /** Página da foto no Planespotters (destino obrigatório do toque). */
  link: string;
  fotografo: string;
};

type Tamanho = { src?: unknown; size?: { width?: unknown; height?: unknown } };
type Foto = { thumbnail_large?: Tamanho; thumbnail?: Tamanho; link?: unknown; photographer?: unknown };

const https = (v: unknown): v is string => typeof v === 'string' && v.startsWith('https://');

export function lerFotoDoAviao(json: unknown): FotoDoAviao | null {
  const fotos = (json as { photos?: unknown })?.photos;
  if (!Array.isArray(fotos)) return null;
  for (const f of fotos as Foto[]) {
    const t = f?.thumbnail_large && https(f.thumbnail_large.src) ? f.thumbnail_large : f?.thumbnail;
    const largura = Number(t?.size?.width);
    const altura = Number(t?.size?.height);
    if (!t || !https(t.src) || !https(f.link) || typeof f.photographer !== 'string' || !f.photographer.trim()) continue;
    if (!(largura > 0) || !(altura > 0)) continue;
    return { imagem: t.src, largura, altura, link: f.link, fotografo: f.photographer.trim() };
  }
  return null;
}

/** Endereço da API para o código hex (ICAO 24 bits) do avião; null se o hex não for válido. */
export function enderecoDaFoto(hex: string): string | null {
  const h = hex.trim().toLowerCase().replace(/^~/, '');
  return /^[0-9a-f]{6}$/.test(h) ? `https://api.planespotters.net/pub/photos/hex/${h}` : null;
}
