/**
 * Respostas do onboarding (Figma "Onboarding · v3"; PRD RF-02; UC-01), salvas no aparelho.
 * - categorias (OB3): só guardadas por enquanto (decisão do Alberto, 26/11/2026).
 * - tempo (OB4): o dial abre nele; o intervalo do serviço de bordo vai para os Ajustes.
 * - meta diária (OB5): usada só no onboarding (OB5 e OB7).
 */
import { Storage } from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import {
  CATEGORIAS_PADRAO,
  META_DIARIA_PADRAO,
  OPCAO_DE_TEMPO_PADRAO,
  planoDoTempo,
  type MetaDiariaH,
  type OpcaoDeTempo,
} from '@/domain/onboarding/plano';
import type { Categoria } from '@/domain/sessao/motivo';

type Respostas = {
  concluido: boolean;
  categorias: Categoria[];
  tempo: OpcaoDeTempo;
  /** O usuário escolheu o tempo no OB4 (pulando o onboarding, o dial abre no padrão do app). */
  tempoEscolhido: boolean;
  metaDiariaH: MetaDiariaH;
};

const PADRAO: Respostas = {
  concluido: false,
  categorias: [...CATEGORIAS_PADRAO],
  tempo: OPCAO_DE_TEMPO_PADRAO,
  tempoEscolhido: false,
  metaDiariaH: META_DIARIA_PADRAO,
};
const CHAVE = 'onboarding';

function lidas(): Respostas {
  try {
    const j = Storage.getItemSync(CHAVE);
    return j ? { ...PADRAO, ...(JSON.parse(j) as Partial<Respostas>) } : PADRAO;
  } catch {
    return PADRAO;
  }
}

export const useOnboarding = create<Respostas & { mudar: (parcial: Partial<Respostas>) => void; recomecar: () => void }>((set, get) => {
  const salvar = () => {
    const { concluido, categorias, tempo, tempoEscolhido, metaDiariaH } = get();
    try {
      Storage.setItemSync(CHAVE, JSON.stringify({ concluido, categorias, tempo, tempoEscolhido, metaDiariaH }));
    } catch {
      // sem persistência: vale só enquanto o app está aberto
    }
  };
  return {
    ...lidas(),
    mudar: (parcial) => {
      set(parcial);
      salvar();
    },
    /** Ferramenta de desenvolvimento: ver o onboarding de novo. */
    recomecar: () => {
      set(PADRAO);
      salvar();
    },
  };
});

/** Tempo em que o dial abre: o do OB4, se a pessoa respondeu. */
export function tempoInicialDoDial(padrao: number): number {
  const { tempo, tempoEscolhido } = useOnboarding.getState();
  return tempoEscolhido ? planoDoTempo(tempo).tempoMin : padrao;
}
