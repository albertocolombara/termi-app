/**
 * Catálogo da coleção (ADR-14): o remoto do R2 (`/colecao/catalogo.json`), o último guardado no
 * aparelho e a cópia embutida no app, juntos pelas regras de `domain/colecao/catalogo` (a coleção só
 * cresce). As telas leem o tamanho daqui: nunca fixe o total em texto (RN-17).
 *
 * O arquivo remoto é publicado pelo coletor (`colecao/catalogo.json` no repositório voo-ao-vivo-teste).
 * A cópia embutida (`catalogo-embutido.json`) tem o mesmo formato e é atualizada a cada versão do app.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Storage } from 'expo-sqlite/kv-store';

import { env } from '@/config/env';
import { catalogoParaJson, lerCatalogo, mesclarCatalogos, souvenirsDisponiveis, type Catalogo, type Souvenir } from '@/domain/colecao/catalogo';

export type { Souvenir } from '@/domain/colecao/catalogo';

const EMBUTIDO = lerCatalogo(require('./catalogo-embutido.json'))!;
const CHAVE = 'colecao.catalogo';

function guardado(): Catalogo | null {
  try {
    const j = Storage.getItemSync(CHAVE);
    return j ? lerCatalogo(JSON.parse(j)) : null;
  } catch {
    return null;
  }
}

/** Baixa o catálogo remoto e guarda a junção com o que o aparelho já conhecia (nada some). */
export async function buscarCatalogo(base: string, sinal?: AbortSignal): Promise<Catalogo | null> {
  if (!base) return null;
  const r = await fetch(`${base}/colecao/catalogo.json`, { signal: sinal });
  if (r.status !== 200) return null;
  const remoto = lerCatalogo(await r.json());
  if (!remoto) return null;
  const antes = guardado();
  const juntos = mesclarCatalogos(antes, remoto);
  try {
    Storage.setItemSync(CHAVE, JSON.stringify(catalogoParaJson(juntos, Math.max(remoto.atualizadoEm, antes?.atualizadoEm ?? 0))));
  } catch {
    // sem armazenamento: vale só nesta abertura do app
  }
  return remoto;
}

/** Souvenirs da coleção disponíveis agora, na ordem do catálogo. Funciona sem internet. */
export function useCatalogo(): Souvenir[] {
  // Hora de abertura da tela: um lançamento agendado aparece na próxima vez que a tela abrir.
  const [agora] = useState(() => Date.now());
  const [doAparelho] = useState(guardado);
  const remoto = useQuery({
    queryKey: ['colecao', 'catalogo'],
    queryFn: ({ signal }) => buscarCatalogo(env.tilesBaseUrl, signal),
    staleTime: 6 * 3_600_000,
    gcTime: Infinity,
    retry: 1,
  }).data;
  return souvenirsDisponiveis(mesclarCatalogos(EMBUTIDO, doAparelho, remoto), agora);
}

/** Só para quem não é componente (ex.: testes): a cópia embutida. */
export const CATALOGO_EMBUTIDO: readonly Souvenir[] = EMBUTIDO.souvenirs;
