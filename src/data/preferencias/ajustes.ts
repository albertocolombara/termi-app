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
  economiaDeBateria: boolean;
  qualidadeDaJanela: QualidadeDaJanela;
};

const PADRAO: Ajustes = { servicoDeBordo: INTERVALO_PADRAO, avisoDePouso: true, economiaDeBateria: false, qualidadeDaJanela: 'automatica' };
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
    const { servicoDeBordo, avisoDePouso, economiaDeBateria, qualidadeDaJanela } = get();
    try {
      Storage.setItemSync(CHAVE, JSON.stringify({ servicoDeBordo, avisoDePouso, economiaDeBateria, qualidadeDaJanela }));
    } catch {
      // sem persistência: vale só enquanto o app está aberto
    }
  },
}));

/** Índice da tabela QUALITY da janela (0 Econômica, 1 Normal, 2 Máxima). */
export const indiceDaQualidade = (q: QualidadeDaJanela) => (q === 'economica' ? 0 : q === 'alta' ? 2 : 1);
