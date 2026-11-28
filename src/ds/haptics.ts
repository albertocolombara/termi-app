import * as Haptics from 'expo-haptics';

const rodar = (fn: () => Promise<void>) => {
  try {
    void fn().catch(() => {});
  } catch {
    // Seguro em web, Jest ou dev-client anterior ao rebuild com expo-haptics.
  }
};

/**
 * Feedback tátil do Design System (expo-haptics).
 * Mapeamento semântico: seleção (tick curto), toque (impacto leve) e sucesso (marco concluído).
 */
export const haptic = {
  /** Passo do dial (5 em 5 min), chips, segmentos, switches, checkboxes e opções. */
  selecao: () => rodar(() => Haptics.selectionAsync()),
  /** Botões primários (CTAs principais). */
  toque: () => rodar(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Marcos: pouso concluído e compra de souvenir confirmada. */
  sucesso: () => rodar(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
