/** Estado do fluxo de novo voo (dial → partidas → cartão de embarque). Só memória: nada é conquista. */
import { create } from 'zustand';

import { tempoInicialDoDial } from '@/data/preferencias/onboarding';
import { MOTIVO_VAZIO, normalizarMotivo, type MotivoDaViagem } from '@/domain/sessao/motivo';

type NovoVoo = {
  tempoMin: number;
  vooHex: string | null;
  /** Anotado no cartão (03b). Vai para a sessão no embarque (UC-02). */
  motivo: MotivoDaViagem;
  setTempo: (min: number) => void;
  setVoo: (hex: string | null) => void;
  setMotivo: (m: MotivoDaViagem) => void;
};

export const useNovoVoo = create<NovoVoo>((set) => ({
  // O dial abre no tempo respondido no onboarding (OB4); sem resposta, em 50 min.
  tempoMin: tempoInicialDoDial(50),
  vooHex: null,
  motivo: MOTIVO_VAZIO,
  setTempo: (tempoMin) => set({ tempoMin }),
  // O motivo é do usuário, não do avião: continua ao trocar de voo.
  setVoo: (vooHex) => set({ vooHex }),
  setMotivo: (m) => set({ motivo: normalizarMotivo(m) }),
}));
