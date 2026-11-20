/** Estado do fluxo de novo voo (dial → partidas → cartão de embarque). Só memória: nada é conquista. */
import { create } from 'zustand';

type NovoVoo = {
  tempoMin: number;
  vooHex: string | null;
  setTempo: (min: number) => void;
  setVoo: (hex: string | null) => void;
};

export const useNovoVoo = create<NovoVoo>((set) => ({
  tempoMin: 50,
  vooHex: null,
  setTempo: (tempoMin) => set({ tempoMin }),
  setVoo: (vooHex) => set({ vooHex }),
}));
