/**
 * Movimento do design system, com base no Material Design 3 (tokens de easing e duração).
 * Mesmos valores das transições (Smart Animate) dos componentes no Figma.
 *
 * Todas as animações usam `ReduceMotion.System`: com "reduzir movimento" ligado no aparelho,
 * o estado muda na hora, sem animação.
 */
import { useEffect } from 'react';
import { Easing, ReduceMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

export const motion = {
  duration: {
    /** Pequenas trocas de estado (opacidade, cor de ícone). */
    short3: 150,
    /** Seletores: chip, rádio, checkbox, segmento, opção de lista. */
    short4: 200,
    /** Toggle e saída de bottom sheet. */
    medium2: 300,
    /** Entrada de bottom sheet. */
    medium4: 400,
  },
  easing: {
    /** Padrão do MD3 para trocas de estado na própria tela: cubic-bezier(0.2, 0, 0, 1). */
    standard: Easing.bezier(0.2, 0, 0, 1),
    /** Elementos que entram na tela (ex.: bottom sheet abrindo). */
    emphasizedDecelerate: Easing.bezier(0.05, 0.7, 0.1, 1),
    /** Elementos que saem da tela (ex.: bottom sheet fechando). */
    emphasizedAccelerate: Easing.bezier(0.3, 0, 0.8, 0.15),
  },
} as const;

/** Configuração de `withTiming` com o easing padrão do MD3 e respeito a "reduzir movimento". */
export function timing(duration: number = motion.duration.short4) {
  return { duration, easing: motion.easing.standard, reduceMotion: ReduceMotion.System } as const;
}

/** Progresso animado de 0 a 1 que acompanha um estado booleano (selecionado, ligado, marcado). */
export function useStateProgress(active: boolean, duration: number = motion.duration.short4): SharedValue<number> {
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, timing(duration));
  }, [active, duration, progress]);
  return progress;
}
