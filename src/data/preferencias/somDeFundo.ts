/** Som de fundo e volume escolhidos, salvos no aparelho (valem para os próximos voos). */
import { Storage } from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import { VOLUME_PADRAO } from '@/domain/sons/catalogo';

const ler = (chave: string) => {
  try {
    return Storage.getItemSync(chave);
  } catch {
    return null;
  }
};
const gravar = (chave: string, valor: string) => {
  try {
    Storage.setItemSync(chave, valor);
  } catch {
    // sem persistência: vale só enquanto o app está aberto
  }
};

const volumeSalvo = Number(ler('som.volume'));

export const useSomDeFundo = create<{
  escolhido: string | null;
  volume: number;
  escolher: (s: string) => void;
  ajustarVolume: (v: number) => void;
}>((set) => ({
  escolhido: ler('som.escolhido'),
  volume: Number.isFinite(volumeSalvo) && ler('som.volume') !== null ? volumeSalvo : VOLUME_PADRAO,
  escolher: (s) => {
    gravar('som.escolhido', s);
    set({ escolhido: s });
  },
  ajustarVolume: (v) => {
    const volume = Math.min(1, Math.max(0, v));
    gravar('som.volume', String(volume));
    set({ volume });
  },
}));
