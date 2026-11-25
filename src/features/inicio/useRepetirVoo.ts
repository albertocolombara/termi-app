/**
 * "Repetir" do último voo (Início v3): embarca pelo caminho rápido num voo no ar com o mesmo tempo de
 * foco do último voo, sem passar pelo dial, pelas partidas nem pelo cartão (UC-03).
 * Os voos são ao vivo, então "repetir" é repetir o tempo, não o mesmo avião.
 * Se nenhum voo encaixar agora (ou o tempo não couber na classe), abre o dial já com esse tempo.
 */
import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { env } from '@/config/env';
import { buscarVoosDisponiveis } from '@/data/voos/useVoos';
import { voosElegiveis } from '@/domain/voos/elegibilidade';
import { useClasse } from '@/services/compras';

import { useNovoVoo } from '../voo/novoVoo';

export function useRepetirVoo() {
  const queryClient = useQueryClient();
  const classe = useClasse();
  const { setTempo, setVoo, setMotivo } = useNovoVoo();
  const [procurando, setProcurando] = useState(false);

  const repetir = useCallback(
    async (tempoMin: number) => {
      if (procurando) return;
      setTempo(tempoMin);
      setVoo(null);
      setMotivo({ categoria: null, foco: '', tarefas: [] });
      setProcurando(true);
      try {
        const dados = await queryClient.fetchQuery({
          queryKey: ['voos', 'disponiveis'],
          queryFn: ({ signal }) => buscarVoosDisponiveis(env.flightCacheUrl, Date.now(), env.flightCacheMaxAgeMin, signal),
          staleTime: 2 * 60_000,
        });
        const melhor = voosElegiveis(dados.voos, tempoMin, dados.consultadoEm, classe)[0];
        if (melhor) {
          setVoo(melhor.voo.hex);
          router.push('/voo/embarque?rapido=1');
        } else {
          router.push('/voo');
        }
      } catch {
        // Sem internet ou cache fora do ar: o dial mostra o estado certo.
        router.push('/voo');
      } finally {
        setProcurando(false);
      }
    },
    [procurando, queryClient, classe, setTempo, setVoo, setMotivo],
  );

  return { repetir, procurando };
}
