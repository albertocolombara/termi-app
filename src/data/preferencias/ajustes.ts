/**
 * Ajustes do usuário (M5), salvos no aparelho com o kv-store do expo-sqlite.
 * Valem para os próximos voos; o voo em andamento guarda o intervalo do serviço de bordo na sessão.
 */
import { Storage } from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import { INTERVALO_PADRAO, type IntervaloServicoDeBordo } from '@/domain/sessao/pausas';

export type QualidadeDaJanela = 'automatica' | 'alta' | 'economica';

type Ajustes = {
  servicoDeBordo: IntervaloServicoDeBordo;
  avisoDePouso: boolean;
  /** Sinal de apertar cintos no começo e no fim do serviço de bordo. */
  somDoServico: boolean;
  /** Volume do sinal de cintos e do aviso de pouso, de 0 a 1, sobre o volume de mídia (o som de fundo baixa durante o sinal). */
  volumeDosAvisos: number;
  economiaDeBateria: boolean;
  qualidadeDaJanela: QualidadeDaJanela;
  /** Janela a 30 quadros por segundo (padrão: 10). Economia de bateria vence e deixa em 2. */
  janelaFluida: boolean;
};

/**
 * Volume dos avisos (sinal de cintos e aviso de pouso) no controle do app: 70% por padrão (Alberto,
 * 26/11/2026). A chave mudou de `volumeDoSinal` para `volumeDosAvisos` para quem já tinha 100% salvo
 * também começar em 70%.
 */
export const VOLUME_DOS_AVISOS_PADRAO = 0.7;

const PADRAO: Ajustes = { servicoDeBordo: INTERVALO_PADRAO, avisoDePouso: true, somDoServico: true, volumeDosAvisos: VOLUME_DOS_AVISOS_PADRAO, economiaDeBateria: false, qualidadeDaJanela: 'automatica', janelaFluida: false };
const CHAVE = 'ajustes';

function lidos(): Ajustes {
  try {
    const j = Storage.getItemSync(CHAVE);
    return j ? { ...PADRAO, ...(JSON.parse(j) as Partial<Ajustes>) } : PADRAO;
  } catch {
    return PADRAO;
  }
}

export const useAjustes = create<Ajustes & { mudar: (parcial: Partial<Ajustes>) => void }>((set, get) => ({
  ...lidos(),
  mudar: (parcial) => {
    set(parcial);
    const { servicoDeBordo, avisoDePouso, somDoServico, volumeDosAvisos, economiaDeBateria, qualidadeDaJanela, janelaFluida } = get();
    try {
      Storage.setItemSync(CHAVE, JSON.stringify({ servicoDeBordo, avisoDePouso, somDoServico, volumeDosAvisos, economiaDeBateria, qualidadeDaJanela, janelaFluida }));
    } catch {
      // sem persistência: vale só enquanto o app está aberto
    }
  },
}));

/** Índice da tabela QUALITY da janela (0 Econômica, 1 Normal, 2 Máxima). */
export const indiceDaQualidade = (q: QualidadeDaJanela) => (q === 'economica' ? 0 : q === 'alta' ? 2 : 1);

/** Quadros por segundo da paisagem da janela (CLAUDE.md §10: 10 padrão, 2 em economia). */
export const quadrosDaJanela = (a: { economiaDeBateria: boolean; janelaFluida: boolean }) => (a.economiaDeBateria ? 2 : a.janelaFluida ? 30 : 10);
