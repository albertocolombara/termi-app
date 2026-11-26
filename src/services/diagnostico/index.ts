/**
 * Diagnóstico de fechamentos (ferramenta de desenvolvimento, builds de teste).
 *
 * Sem cabo nem adb, o Alberto não consegue ver o log do Android. Então:
 * - o último erro fatal de JavaScript é guardado (mensagem e pilha) antes de o app fechar;
 * - o Android 11+ guarda os últimos fechamentos do processo (motivo e, em erro nativo, a pilha);
 * - a tela "Diagnóstico" (Ferramentas de desenvolvimento) mostra os dois e compartilha o texto.
 * Nada de dados pessoais: só mensagens de erro, hora e memória.

 */
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Storage } from 'expo-sqlite/kv-store';

import { ScreenState, type SaidaDoApp } from '../../../modules/screen-state/src';
import { CANAIS_DOS_AVISOS } from '../avisos';

const CHAVE_ERRO = 'diagnostico.ultimoErroJs';
const CHAVE_AVISOS = 'diagnostico.avisosRecebidos';

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

export type AvisoRecebido = { quando: number; titulo: string; canal: string | null; app: string };

/**
 * Guarda os últimos 15 avisos que o app viu chegar (hora, título, canal e se o app estava aberto),
 * para investigar sinal que não tocou (26/11/2026). Só com o app vivo: com ele fechado, o Android
 * entrega o aviso sem passar por aqui.
 */
export function registrarAvisosRecebidos() {
  Notifications.addNotificationReceivedListener((n) => {
    try {
      const lista = avisosRecebidos();
      const trigger = n.request.trigger as { channelId?: string } | null;
      lista.unshift({ quando: Date.now(), titulo: n.request.content.title ?? '', canal: trigger?.channelId ?? null, app: String(AppState.currentState) });
      Storage.setItemSync(CHAVE_AVISOS, JSON.stringify(lista.slice(0, 15)));
    } catch {
      // diagnóstico nunca atrapalha o aviso
    }
  });
}

export function avisosRecebidos(): AvisoRecebido[] {
  try {
    return JSON.parse(Storage.getItemSync(CHAVE_AVISOS) ?? '[]') as AvisoRecebido[];
  } catch {
    return [];
  }
}

export type AvisoAgendado = { quando: number | null; titulo: string; canal: string | null };

/** Avisos agendados agora, com o canal (o canal decide se o aviso toca som). */
export async function avisosAgendados(): Promise<AvisoAgendado[]> {
  const lista = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  return lista
    .map((n) => {
      const tr = n.trigger as { value?: number; date?: number; channelId?: string } | null;
      return { quando: tr?.value ?? tr?.date ?? null, titulo: n.content.title ?? '', canal: tr?.channelId ?? null };
    })
    .sort((a, b) => (a.quando ?? 0) - (b.quando ?? 0));
}

/** Volumes, modo do toque, "Não perturbe" e como os canais dos avisos ficaram gravados no aparelho. */
export function audioDosAvisos(): string {
  try {
    return ScreenState.audioDosAvisos(CANAIS_DOS_AVISOS) || 'indisponível';
  } catch {
    return 'indisponível (build sem a função nativa)';
  }
}

/** Últimos sinais que o app tocou (ou não, com o motivo). */
export function sinaisTocados(): string {
  try {
    return ScreenState.sinaisTocados();
  } catch {
    return 'indisponível (build sem a função nativa)';
  }
}
