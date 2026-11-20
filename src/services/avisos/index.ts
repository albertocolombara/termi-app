/**
 * Avisos do voo: pouso e serviço de bordo (RF-21, RF-22, RF-27; RNF-07).
 *
 * Tudo é agendado no embarque, como alarme exato (`delivery: 'alarmClock'`, que usa setAlarmClock()):
 * o Android entrega no horário mesmo com a tela bloqueada, o app fechado e o aparelho em repouso (Doze).
 * Precisa da permissão "Alarmes e lembretes" (SCHEDULE_EXACT_ALARM), pedida no onboarding.
 * Lição do protótipo (build-7): sem ela, o aviso de pouso não tocou com a tela bloqueada.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

import { t } from '@/i18n';
import { ScreenState } from '../../../modules/screen-state/src';

const CANAL_POUSO = 'pouso';
const CANAL_SERVICO = 'servico';

let configurado = false;

/** Chamar uma vez na abertura do app. */
export async function configurarAvisos() {
  if (configurado) return;
  configurado = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL_POUSO, {
    name: t('avisos.canalPouso'),
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 150, 250],
  });
  await Notifications.setNotificationChannelAsync(CANAL_SERVICO, {
    name: t('avisos.canalServico'),
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
}

export async function pedirPermissaoDeNotificacoes() {
  const r = await Notifications.requestPermissionsAsync();
  return r.granted;
}

/** `null` quando o sistema não informa (ex.: iOS ou Android antigo). */
export async function alarmeExatoPermitido(): Promise<boolean | null> {
  const r = await Notifications.getExactAlarmPermissionsAsync().catch(() => null);
  return r ? r.granted : null;
}

export async function pedirAlarmeExato(): Promise<boolean> {
  const r = await Notifications.requestExactAlarmPermissionsAsync().catch(() => null);
  return !!r?.granted;
}

const emHorario = (ms: number, channelId: string) =>
  ({
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: ms,
    delivery: 'alarmClock',
    channelId,
  }) as const;

export type AvisosDoVoo = {
  pousoEm: number;
  minutosDeVoo: number;
  cidadeDestino: string;
  /** Horários absolutos (ms) das pausas, vindos de `agendaDePausas`. */
  pausas: { inicio: number; fim: number }[];
  pausaMin: number;
  /** Ajustes > Aviso de pouso. Desligado, o pouso não toca (os avisos do serviço de bordo seguem). */
  avisoDePouso?: boolean;
};

/** Agenda o pouso e as pausas. Cancela avisos anteriores. Retorna quantos avisos foram agendados. */
export async function agendarAvisosDoVoo(v: AvisosDoVoo): Promise<number> {
  await cancelarAvisos();
  let n = 0;
  for (const p of v.pausas) {
    await Notifications.scheduleNotificationAsync({
      content: { title: t('avisos.servicoTitulo'), body: t('avisos.servicoCorpo', { min: v.pausaMin }) },
      trigger: emHorario(p.inicio, CANAL_SERVICO),
    });
    await Notifications.scheduleNotificationAsync({
      content: { title: t('avisos.fimServicoTitulo'), body: t('avisos.fimServicoCorpo') },
      trigger: emHorario(p.fim, CANAL_SERVICO),
    });
    n += 2;
  }
  if (v.avisoDePouso === false) return n;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('avisos.pousoTitulo', { cidade: v.cidadeDestino }),
      body: t('avisos.pousoCorpo', { min: v.minutosDeVoo }),
    },
    trigger: emHorario(v.pousoEm, CANAL_POUSO),
  });
  return n + 1;
}

export async function cancelarAvisos() {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

/** Notificação fixa com contagem regressiva até o pouso (módulo nativo, só Android por enquanto). */
export function mostrarNotificacaoFixa(rota: string, pousoEm: number) {
  const hora = new Date(pousoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  ScreenState.showFlightNotification(t('avisos.fixaTitulo', { rota }), t('avisos.fixaTexto', { hora }), pousoEm);
}

export function esconderNotificacaoFixa() {
  ScreenState.hideFlightNotification();
}
