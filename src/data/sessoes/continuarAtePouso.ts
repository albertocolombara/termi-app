/**
 * Quando o usuário escolheu "Continuar até o pouso" (RN-09a, E5). Fica salvo no aparelho por sessão,
 * para a escolha valer ao reabrir o app. Os minutos a mais contam a partir daqui.
 */
import { Storage } from 'expo-sqlite/kv-store';
import { create } from 'zustand';

const CHAVE = 'voo.continuarAtePouso';

type Registro = { sessaoId: string; desde: number };

function lido(): Registro | null {
  try {
    const v = Storage.getItemSync(CHAVE);
    return v ? (JSON.parse(v) as Registro) : null;
  } catch {
    return null;
  }
}

export const useContinuarAtePouso = create<{ registro: Registro | null; continuar: (sessaoId: string, desde: number) => void }>((set) => ({
  registro: lido(),
  continuar: (sessaoId, desde) => {
    const registro = { sessaoId, desde };
    try {
      Storage.setItemSync(CHAVE, JSON.stringify(registro));
    } catch {
      // sem persistência: vale só enquanto o app está aberto
    }
    set({ registro });
  },
}));

/** Desde quando a sessão segue em "Continuar até o pouso" (undefined se o usuário não escolheu). */
export function useContinuandoDesde(sessaoId: string): number | undefined {
  return useContinuarAtePouso((s) => (s.registro?.sessaoId === sessaoId ? s.registro.desde : undefined));
}
