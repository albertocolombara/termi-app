/**
 * Diagnóstico de fechamentos (ferramenta de desenvolvimento, builds de teste).
 *
 * Sem cabo nem adb, o Alberto não consegue ver o log do Android. Então:
 * - o último erro fatal de JavaScript é guardado (mensagem e pilha) antes de o app fechar;
 * - o Android 11+ guarda os últimos fechamentos do processo (motivo e, em erro nativo, a pilha);
 * - a tela "Diagnóstico" (Ferramentas de desenvolvimento) mostra os dois e compartilha o texto.
 * Nada de dados pessoais: só mensagens de erro, hora e memória.

 */
import { Storage } from 'expo-sqlite/kv-store';

import { ScreenState, type SaidaDoApp } from '../../../modules/screen-state/src';

const CHAVE_ERRO = 'diagnostico.ultimoErroJs';

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
