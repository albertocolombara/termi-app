/**
 * Foto do avião real no Planespotters.net (teste aberto pelo Alberto em 26/11/2026).
 * Regras dos termos da API: ver `domain/voos/fotoDoAviao.ts`. Aqui, a parte de rede:
 * - cada aparelho chama a API direto (os termos proíbem repassar por servidor próprio), com um
 *   User-Agent que identifica o app e um contato;
 * - nada vai para o disco: `Cache-Control: no-store` impede o cache HTTP do Android (OkHttp) e a
 *   imagem fica só na memória (data URI), descartada quando a folha fecha;
 * - a resposta da API fica na memória por até 24 h (limite dos termos).
 */
import { useQuery } from '@tanstack/react-query';

import { enderecoDaFoto, lerFotoDoAviao, type FotoDoAviao } from '@/domain/voos/fotoDoAviao';

const CABECALHOS = {
  'User-Agent': 'Termi-Focus-Flights/0.1 (Android; +https://github.com/albertocolombara/termi-app)',
  'Cache-Control': 'no-store',
};
const UM_DIA = 24 * 60 * 60 * 1000;

async function buscarFoto(hex: string): Promise<FotoDoAviao | null> {
  const url = enderecoDaFoto(hex);
  if (!url) return null;
  const r = await fetch(url, { headers: CABECALHOS });
  if (!r.ok) throw new Error(`planespotters ${r.status}`);
  return lerFotoDoAviao(await r.json());
}

/** Baixa a imagem direto do endereço da API e devolve um data URI (só memória, sem disco). */
async function baixarImagem(endereco: string): Promise<string> {
  const r = await fetch(endereco, { headers: CABECALHOS });
  if (!r.ok) throw new Error(`imagem ${r.status}`);
  const blob = await r.blob();
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error('imagem ilegível'));
    leitor.readAsDataURL(blob);
  });
}

/** Foto (dados e imagem) do avião; `ativo` só enquanto a folha está aberta. */
export function useFotoDoAviao(hex: string, ativo: boolean) {
  const foto = useQuery({
    queryKey: ['foto-do-aviao', hex],
    queryFn: () => buscarFoto(hex),
    enabled: ativo,
    staleTime: UM_DIA,
    gcTime: UM_DIA,
    retry: 1,
  });
  const imagem = useQuery({
    queryKey: ['foto-do-aviao', 'imagem', foto.data?.imagem],
    queryFn: () => baixarImagem(foto.data!.imagem),
    enabled: ativo && !!foto.data,
    // Termos: a imagem só pode ficar na memória enquanto está na tela.
    gcTime: 0,
    staleTime: Infinity,
    retry: 1,
  });
  return { foto: foto.data ?? null, imagem: imagem.data ?? null, carregando: ativo && (foto.isPending || (!!foto.data && imagem.isPending)) };
}
