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
import { AndroidAudioContentType, AndroidAudioUsage, AndroidImportance } from 'expo-notifications';

import { t } from '@/i18n';
import { ScreenState } from '../../../modules/screen-state/src';

/**
 * Pouso e serviço de bordo tocam no volume de alarme (uso ALARM do Android), para tocar mesmo com o
 * celular no silencioso, como diz o Ajuste "Aviso de pouso" (build-56: o sinal de cintos não tocou,
 * provavelmente porque o celular estava no silencioso). O modo "Não perturbe" continua valendo.
 * Canais não mudam de som depois de criados, por isso os ids novos; os antigos são apagados.
 */
const COMO_ALARME = { usage: AndroidAudioUsage.ALARM, contentType: AndroidAudioContentType.SONIFICATION };
const CANAIS_ANTIGOS = ['pouso', 'pouso-alarme', 'servico', 'servico-cinto'];
/** Pouso: sinal, voz da comissária e som da cabine (assets/sons/aviso_pouso.ogg, ~6 s). */
const CANAL_POUSO = 'pouso-comissaria';
/** Com o som de fundo tocando, o próprio app toca o aviso (FlightSoundService) e a notificação vem sem som. */
const CANAL_POUSO_SEM_SOM = 'pouso-sem-som';
const SOM_DO_POUSO = 'aviso_pouso.ogg';
/**
 * Serviço de bordo: o sinal de apertar cintos no começo e no fim da pausa (pedido do Alberto em 25/11/2026).
 * Canais do Android não mudam de som depois de criados, por isso o id novo; o canal antigo ('servico',
 * com o som padrão) é apagado. O Android abaixa o som de fundo do voo enquanto o sinal toca.
 */
const CANAL_SERVICO = 'servico-alarme';
const CANAL_SERVICO_SEM_SOM = 'servico-sem-som';
const SOM_DO_SERVICO = 'aviso_cinto.ogg';

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
    sound: SOM_DO_POUSO,
    audioAttributes: COMO_ALARME,
    vibrationPattern: [0, 250, 150, 250],
  });
  for (const antigo of CANAIS_ANTIGOS) await Notifications.deleteNotificationChannelAsync(antigo).catch(() => {});
  await Notifications.setNotificationChannelAsync(CANAL_SERVICO, {
    name: t('avisos.canalServico'),
    importance: AndroidImportance.HIGH,
    sound: SOM_DO_SERVICO,
    audioAttributes: COMO_ALARME,
  });
  await Notifications.setNotificationChannelAsync(CANAL_POUSO_SEM_SOM, {
    name: t('avisos.canalPousoSemSom'),
    importance: AndroidImportance.HIGH,
    sound: null,
    vibrationPattern: [0, 250, 150, 250],
  });
  await Notifications.setNotificationChannelAsync(CANAL_SERVICO_SEM_SOM, {
    name: t('avisos.canalServicoSemSom'),
    importance: AndroidImportance.HIGH,
    sound: null,
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
  /** Ajustes > Sinal de apertar cintos. Desligado, o serviço de bordo avisa sem som. */
  somDoServico?: boolean;
  /**
   * O som de fundo está tocando: o app toca o sinal e o aviso de pouso por cima dele, com o som de
   * fundo baixando antes (FlightSoundService), e as notificações vêm sem som. Sem som de fundo, o
   * som vem da notificação (volume de alarme).
   */
  somDeFundo?: boolean;
  /** Pausas encerradas antes da hora ("De volta ao foco"): sem aviso de fim. */
  pausasEncerradas?: number[];
};

/**
 * No Android o próprio app toca o sinal e o aviso de pouso na hora (SinalDeBordo.kt, como um
 * despertador) e as notificações vêm sem som. 26/11/2026, Samsung M35: o som do canal não tocou nem
 * no silencioso nem no modo normal, com o canal certo e o volume de alarme alto.
 */
const appTocaOsSinais = () => Platform.OS === 'android' && ScreenState.temSinais;

/** Ids dos alarmes de som (nativos): 1 = pouso; 100 + 2i = início da pausa i; 101 + 2i = fim. */
const SINAL_DO_POUSO = 1;
const sinalDoInicio = (i: number) => 100 + 2 * i;
const sinalDoFim = (i: number) => 101 + 2 * i;
const RAW_CINTO = SOM_DO_SERVICO.replace('.ogg', '');
const RAW_POUSO = SOM_DO_POUSO.replace('.ogg', '');

/** Agenda o pouso e as pausas. Cancela avisos anteriores. Retorna quantos avisos foram agendados. */
export async function agendarAvisosDoVoo(v: AvisosDoVoo): Promise<number> {
  await cancelarAvisos();
  let n = 0;
  const agora = Date.now();
  const appToca = appTocaOsSinais();
  // Com o som de fundo tocando, o FlightSoundService toca os sinais por cima dele.
  const servicoComSom = v.somDoServico !== false && !v.somDeFundo;
  const canal = servicoComSom && !appToca ? CANAL_SERVICO : CANAL_SERVICO_SEM_SOM;
  const som = servicoComSom && !appToca ? SOM_DO_SERVICO : undefined;
  for (const [i, p] of v.pausas.entries()) {
    if (p.inicio > agora) {
      await Notifications.scheduleNotificationAsync({
        content: { title: t('avisos.servicoTitulo'), body: t('avisos.servicoCorpo', { min: v.pausaMin }), sound: som },
        trigger: emHorario(p.inicio, canal),
      });
      if (servicoComSom && appToca) ScreenState.agendarSinal(sinalDoInicio(i), p.inicio, RAW_CINTO);
      n++;
    }
    if (p.fim > agora && !v.pausasEncerradas?.includes(i)) {
      await Notifications.scheduleNotificationAsync({
        identifier: idDoFimDaPausa(i),
        content: { title: t('avisos.fimServicoTitulo'), body: t('avisos.fimServicoCorpo'), sound: som },
        trigger: emHorario(p.fim, canal),
      });
      if (servicoComSom && appToca) ScreenState.agendarSinal(sinalDoFim(i), p.fim, RAW_CINTO);
      n++;
    }
  }
  if (v.avisoDePouso === false || v.pousoEm <= agora) return n;
  const pousoComSom = !v.somDeFundo && !appToca;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('avisos.pousoTitulo', { cidade: v.cidadeDestino }),
      body: t('avisos.pousoCorpo', { min: v.minutosDeVoo }),
      sound: pousoComSom ? SOM_DO_POUSO : undefined,
    },
    trigger: emHorario(v.pousoEm, pousoComSom ? CANAL_POUSO : CANAL_POUSO_SEM_SOM),
  });
  if (!v.somDeFundo && appToca) ScreenState.agendarSinal(SINAL_DO_POUSO, v.pousoEm, RAW_POUSO);
  return n + 1;
}

const idDoFimDaPausa = (indice: number) => `fim-servico-${indice}`;

/** "Voltar ao foco" (UC-05 A1): a pausa acabou antes, então o aviso de fim dela não toca. */
export async function cancelarAvisoDeFimDaPausa(indice: number) {
  await Notifications.cancelScheduledNotificationAsync(idDoFimDaPausa(indice)).catch(() => {});
  if (appTocaOsSinais()) ScreenState.cancelarSinal(sinalDoFim(indice));
}

/** Canais dos avisos, para o Diagnóstico mostrar como ficaram gravados no aparelho. */
export const CANAIS_DOS_AVISOS = [CANAL_SERVICO, CANAL_SERVICO_SEM_SOM, CANAL_POUSO, CANAL_POUSO_SEM_SOM];

/** Id do alarme de som do teste do Diagnóstico (fora da faixa do voo). */
const SINAL_DE_TESTE = 9;

/**
 * Diagnóstico: agenda um aviso de teste daqui a alguns segundos pelo mesmo caminho do voo (alarme
 * exato; no Android, notificação sem som e o app tocando o sinal). Serve para ouvir o sinal com o app
 * aberto, em segundo plano ou bloqueado. Retorna como o som foi agendado.
 */
export async function testarSinal(tipo: 'servico' | 'pouso', emSegundos = 10): Promise<string> {
  const servico = tipo === 'servico';
  const appToca = appTocaOsSinais();
  const em = Date.now() + emSegundos * 1000;
  const canal = appToca ? (servico ? CANAL_SERVICO_SEM_SOM : CANAL_POUSO_SEM_SOM) : servico ? CANAL_SERVICO : CANAL_POUSO;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: servico ? t('avisos.servicoTitulo') : t('dev.testeDoPouso'),
      body: t('dev.testeDoSinal'),
      sound: appToca ? undefined : servico ? SOM_DO_SERVICO : SOM_DO_POUSO,
    },
    trigger: emHorario(em, canal),
  });
  return appToca ? `som pelo app (${ScreenState.agendarSinal(SINAL_DE_TESTE, em, servico ? RAW_CINTO : RAW_POUSO)})` : 'som pelo canal';
}

export async function cancelarAvisos() {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  if (appTocaOsSinais()) ScreenState.cancelarSinais();
}

/** Título e texto da notificação fixa do voo (a mesma do som de fundo no Android). */
export function textosDaNotificacaoFixa(rota: string, pousoEm: number) {
  const hora = new Date(pousoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return { titulo: t('avisos.fixaTitulo', { rota }), texto: t('avisos.fixaTexto', { hora }) };
}

/** Notificação fixa com contagem regressiva até o pouso (módulo nativo, só Android por enquanto). */
export function mostrarNotificacaoFixa(rota: string, pousoEm: number) {
  const { titulo, texto } = textosDaNotificacaoFixa(rota, pousoEm);
  ScreenState.showFlightNotification(titulo, texto, pousoEm);
}

export function esconderNotificacaoFixa() {
  ScreenState.hideFlightNotification();
}
