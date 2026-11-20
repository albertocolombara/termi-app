/**
 * Nuvens reais no aparelho (ARCHITECTURE §15; coleta "Nuvens" do coletor, a cada 3 h).
 *
 * O R2 guarda sempre os mesmos nomes (`nuvens/{dia|noite}/{linha}/{coluna}.webp`) e um índice com a
 * versão. O app pede os blocos com `?v=versão` e guarda no cache em `nuvens/{versão}/...`: quando a
 * versão muda, as pastas antigas são apagadas. Arquivos pequenos (~55 KB); por voo, ~0,3 a 1 MB.
 * Sem rede ou sem índice, a janela usa só as nuvens geradas.
 */
import { Directory, File, Paths } from 'expo-file-system';
import { Storage } from 'expo-sqlite/kv-store';

import { env } from '@/config/env';
import { caminhoDaNuvem, PASSAGENS, type BlocoDeNuvem, type Passagem } from '@/domain/janela/nuvens';

const CHAVE_VERSAO = 'nuvens.versao';
const SIMULTANEOS = 6;

export function versaoDasNuvens(): string | null {
  try {
    return Storage.getItemSync(CHAVE_VERSAO);
  } catch {
    return null;
  }
}

const arquivo = (versao: string, passagem: Passagem, b: BlocoDeNuvem) =>
  new File(Paths.cache, `nuvens/${versao}/${passagem}/${b.linha}/${b.coluna}.webp`);

/** Lê o índice do R2, guarda a versão e apaga as versões antigas do cache. */
export async function atualizarVersaoDasNuvens(sinal?: AbortSignal): Promise<string | null> {
  if (!env.tilesBaseUrl) return versaoDasNuvens();
  try {
    const r = await fetch(`${env.tilesBaseUrl}/nuvens/indice.json`, { signal: sinal });
    if (r.status !== 200) return versaoDasNuvens();
    const { versao } = (await r.json()) as { versao?: string };
    if (!versao) return versaoDasNuvens();
    Storage.setItemSync(CHAVE_VERSAO, versao);
    apagarVersoesAntigas(versao);
    return versao;
  } catch {
    return versaoDasNuvens();
  }
}

function apagarVersoesAntigas(atual: string) {
  try {
    const pasta = new Directory(Paths.cache, 'nuvens');
    if (!pasta.exists) return;
    for (const item of pasta.list()) {
      if (item instanceof Directory && item.name !== atual) item.delete();
    }
  } catch {
    // limpeza é só economia de espaço
  }
}

/** O bloco no cache; baixa se ainda não tiver. `null` se não houver versão ou a rede falhar. */
export async function arquivoDaNuvem(passagem: Passagem, b: BlocoDeNuvem, sinal?: AbortSignal): Promise<File | null> {
  const versao = versaoDasNuvens();
  if (!versao || !env.tilesBaseUrl) return null;
  const f = arquivo(versao, passagem, b);
  if (f.exists && f.size > 0) return f;
  try {
    const r = await fetch(`${env.tilesBaseUrl}/${caminhoDaNuvem(passagem, b)}?v=${versao}`, { signal: sinal });
    if (r.status !== 200) return null;
    new Directory(Paths.cache, `nuvens/${versao}/${passagem}/${b.linha}`).create({ intermediates: true, idempotent: true });
    await f.write(new Uint8Array(await r.arrayBuffer()));
    return f;
  } catch {
    return null;
  }
}

/** No embarque: versão mais nova e as nuvens de toda a rota, das duas passagens. Nunca falha o embarque. */
export async function baixarNuvensDaRota(blocos: BlocoDeNuvem[], sinal: AbortSignal): Promise<void> {
  const versao = await atualizarVersaoDasNuvens(sinal);
  if (!versao) return;
  const fila = PASSAGENS.flatMap((p) => blocos.map((b) => [p, b] as const));
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < fila.length && !sinal.aborted) {
      const [p, b] = fila[proximo++];
      await arquivoDaNuvem(p, b, sinal);
    }
  };
  await Promise.all(Array.from({ length: SIMULTANEOS }, trabalhador));
}
