import { useEffect } from 'react';

import { blocosDaRota } from '@/domain/voos/blocosDaRota';
import { projetar } from '@/domain/voos/projecao';
import type { Voo } from '@/domain/voos/tipos';

import { baixarBlocos } from './baixarBlocos';

/**
 * Baixa o resto da paisagem da rota com o usuário já a bordo, só com a tela do voo aberta.
 * Os blocos que já existem são pulados; se o app for para segundo plano, para e retoma ao voltar.
 */
export function useBlocosDoVoo(voo: Voo, ativo: boolean) {
  useEffect(() => {
    if (!ativo) return;
    const controle = new AbortController();
    baixarBlocos(blocosDaRota(projetar(voo, Date.now()), voo.destino), () => {}, controle.signal).catch(() => {});
    return () => controle.abort();
    // Uma vez por abertura da tela (e por voo); a rota não muda de minuto a minuto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voo.hex, ativo]);
}
