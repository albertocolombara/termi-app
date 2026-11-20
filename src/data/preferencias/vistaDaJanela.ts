/** Vista da janela escolhida, salva no aparelho (vale para os próximos voos). */
import { Storage } from 'expo-sqlite/kv-store';
import { create } from 'zustand';

const CHAVE = 'janela.vista';

function lida(): string | null {
  try {
    return Storage.getItemSync(CHAVE);
  } catch {
    return null;
  }
}

export const useVistaDaJanela = create<{ escolhida: string | null; escolher: (v: string) => void }>((set) => ({
  escolhida: lida(),
  escolher: (v) => {
    try {
      Storage.setItemSync(CHAVE, v);
    } catch {
      // sem persistência: vale só enquanto o app está aberto
    }
    set({ escolhida: v });
  },
}));
