/**
 * Pausas do serviço de bordo em que o usuário tocou em "Voltar ao foco" (RN-06, UC-05 A1).
 * Fica salvo no aparelho por sessão, para a pausa não reaparecer ao reabrir o app.
 * Não mexe em minutos, pouso nem rendimentos: o voo segue no horário.
 */
import { Storage } from 'expo-sqlite/kv-store';
import { create } from 'zustand';

const CHAVE = 'servico.voltouAoFoco';

type Registro = { sessaoId: string; indices: number[] };

function lido(): Registro | null {
  try {
    const v = Storage.getItemSync(CHAVE);
    return v ? (JSON.parse(v) as Registro) : null;
  } catch {
    return null;
  }
}

export const useVoltouAoFoco = create<{ registro: Registro | null; voltar: (sessaoId: string, indice: number) => void }>((set, get) => ({
  registro: lido(),
  voltar: (sessaoId, indice) => {
    const atual = get().registro;
    const indices = atual?.sessaoId === sessaoId ? [...atual.indices, indice] : [indice];
    const registro = { sessaoId, indices };
    try {
      Storage.setItemSync(CHAVE, JSON.stringify(registro));
    } catch {
      // sem persistência: vale só enquanto o app está aberto
    }
    set({ registro });
  },
}));

const NENHUM: number[] = [];

/** Índices das pausas encerradas antes nesta sessão. */
export function useIndicesQueVoltaram(sessaoId: string): number[] {
  const registro = useVoltouAoFoco((s) => s.registro);
  return registro?.sessaoId === sessaoId ? registro.indices : NENHUM;
}
