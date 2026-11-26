/**
 * Diagnóstico de fechamentos (ferramenta de desenvolvimento, builds de teste).
 *
 * Sem cabo nem adb, o Alberto não consegue ver o log do Android. Então:
 * - o último erro fatal de JavaScript é guardado (mensagem e pilha) antes de o app fechar;
 * - o Android 11+ guarda os últimos fechamentos do processo (motivo e, em erro nativo, a pilha);
 * - a tela "Diagnóstico" (Ferramentas de desenvolvimento) mostra os dois e compartilha o texto.
 * Nada de dados pessoais: só mensagens de erro, hora e memória.
 *
 * Também guarda a chave da vitrine 3D (Filament): ligada por padrão desde a correção do
 * InteractionManager (build-75); desligar mostra o render 2D da medalha.
 */
import { Storage } from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import { mostrarFerramentasDev } from '@/config/env';

import { ScreenState, type SaidaDoApp } from '../../../modules/screen-state/src';

const CHAVE_ERRO = 'diagnostico.ultimoErroJs';
const CHAVE_3D = 'teste.vitrine3d';

export type ErroJs = { quando: number; mensagem: string; pilha: string; fatal: boolean };

type ErrorUtilsGlobal = {
  getGlobalHandler(): (erro: unknown, fatal?: boolean) => void;
  setGlobalHandler(f: (erro: unknown, fatal?: boolean) => void): void;
};

/** Guarda o erro fatal de JS antes de passar para o tratamento padrão (que fecha o app). */
export function instalarDiagnostico() {
  const eu = (globalThis as { ErrorUtils?: ErrorUtilsGlobal }).ErrorUtils;
  if (!eu) return;
  const anterior = eu.getGlobalHandler();
  eu.setGlobalHandler((erro, fatal) => {
    try {
      const e = erro instanceof Error ? erro : new Error(String(erro));
      const registro: ErroJs = { quando: Date.now(), mensagem: e.message, pilha: (e.stack ?? '').slice(0, 8000), fatal: !!fatal };
      Storage.setItemSync(CHAVE_ERRO, JSON.stringify(registro));
    } catch {
      // nunca atrapalhar o tratamento padrão
    }
    anterior(erro, fatal);
  });
}

export function ultimoErroJs(): ErroJs | null {
  try {
    const t = Storage.getItemSync(CHAVE_ERRO);
    return t ? (JSON.parse(t) as ErroJs) : null;
  } catch {
    return null;
  }
}

export function fechamentosRecentes(): SaidaDoApp[] {
  try {
    return ScreenState.recentExits();
  } catch {
    return [];
  }
}

/** Pilha do último crash de Java/Kotlin (ex.: dentro de uma biblioteca nativa). */
export function ultimoCrashJava(): string {
  try {
    return ScreenState.lastJavaCrash();
  } catch {
    return '';
  }
}

function lerVitrine3d(): boolean {
  if (!mostrarFerramentasDev) return true;
  try {
    return Storage.getItemSync(CHAVE_3D) !== '0';
  } catch {
    return true;
  }
}

const useVitrine = create<{ ligada: boolean; trocar: (v: boolean) => void }>((set) => ({
  ligada: lerVitrine3d(),
  trocar: (ligada) => {
    try {
      Storage.setItemSync(CHAVE_3D, ligada ? '1' : '0');
    } catch {
      // vale só nesta sessão
    }
    set({ ligada });
  },
}));

/** Vitrine 3D (Filament) ligada? Desligada, a vitrine mostra o render 2D da medalha. */
export function useVitrine3d() {
  return useVitrine((s) => s.ligada);
}

export function useTrocarVitrine3d() {
  return useVitrine((s) => s.trocar);
}
