/**
 * Download dos blocos de paisagem da rota no embarque (UC-02 passo 7; ARCHITECTURE §9).
 * Origem: R2 (`EXPO_PUBLIC_TILES_BASE_URL`). Destino: cache do aparelho, que o sistema pode limpar.
 * Bloco ausente no R2 (404) é oceano: grava um arquivo vazio para não pedir de novo.
 */
import { Directory, File, Paths } from 'expo-file-system';

import { env } from '@/config/env';
import { PASTA_ANTIGA_NO_APARELHO, PASTA_NO_APARELHO, caminhoDoBloco, caminhoNoAparelho, type Bloco } from '@/domain/voos/blocosDaRota';

const SIMULTANEOS = 10;

export type ProgressoDosBlocos = { feitos: number; total: number };
export type ResultadoDosBlocos = { baixados: number; oceano: number; jaTinha: number; falhas: number; total: number };

/** Arquivo do bloco no cache do aparelho. */
export function arquivoDoBloco(b: Bloco): File {
  return new File(Paths.cache, caminhoNoAparelho(b));
}

let antigaApagada = false;

/** Apaga, uma vez, os blocos do Landsat guardados antes da troca pelo Sentinel-2 (21/11/2026). */
function apagarPastaAntiga() {
  if (antigaApagada) return;
  antigaApagada = true;
  try {
    const antiga = new Directory(Paths.cache, PASTA_ANTIGA_NO_APARELHO);
    if (antiga.exists) antiga.delete();
  } catch {
    // o sistema limpa o cache de qualquer jeito
  }
}

async function baixarUm(b: Bloco, sinal: AbortSignal): Promise<'baixado' | 'oceano' | 'ja-tinha' | 'falha'> {
  const arquivo = arquivoDoBloco(b);
  if (arquivo.exists) return 'ja-tinha';
  try {
    const r = await fetch(`${env.tilesBaseUrl}/${caminhoDoBloco(b)}`, { signal: sinal });
    if (r.status !== 200 && r.status !== 404) return 'falha';
    const pasta = new Directory(Paths.cache, `${PASTA_NO_APARELHO}/${b.camada}/${b.linha}`);
    pasta.create({ intermediates: true, idempotent: true });
    if (r.status === 404) {
      arquivo.create({ overwrite: true });
      return 'oceano';
    }
    await arquivo.write(await r.arrayBuffer());
    return 'baixado';
  } catch {
    return 'falha';
  }
}

/** Baixa os blocos com até 10 pedidos ao mesmo tempo. Cancelável pelo `sinal`. */
export async function baixarBlocos(
  blocos: Bloco[],
  aoProgredir: (p: ProgressoDosBlocos) => void,
  sinal: AbortSignal,
): Promise<ResultadoDosBlocos> {
  const res: ResultadoDosBlocos = { baixados: 0, oceano: 0, jaTinha: 0, falhas: 0, total: blocos.length };
  if (!env.tilesBaseUrl) return { ...res, falhas: blocos.length };
  apagarPastaAntiga();
  let proximo = 0;
  let feitos = 0;
  const trabalhador = async () => {
    while (proximo < blocos.length && !sinal.aborted) {
      const b = blocos[proximo++];
      const r = await baixarUm(b, sinal);
      if (r === 'baixado') res.baixados++;
      else if (r === 'oceano') res.oceano++;
      else if (r === 'ja-tinha') res.jaTinha++;
      else res.falhas++;
      aoProgredir({ feitos: ++feitos, total: blocos.length });
    }
  };
  await Promise.all(Array.from({ length: SIMULTANEOS }, trabalhador));
  return res;
}
