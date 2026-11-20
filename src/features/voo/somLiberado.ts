/**
 * Quando o som do voo pode começar. No embarque, a sessão é gravada antes da animação do Termi
 * embarcando; o som espera a animação estar terminando para entrar com fade (Alberto, build-28).
 * Ao abrir o app no meio de um voo, o som começa direto (ver SomDoVoo).
 */
import { create } from 'zustand';

export const useSomLiberado = create<{ sessaoId: string | null; liberar: (sessaoId: string) => void }>((set) => ({
  sessaoId: null,
  liberar: (sessaoId) => set({ sessaoId }),
}));
