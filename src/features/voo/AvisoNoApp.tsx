/**
 * Aviso com cara de notificação, por cima da paisagem do voo: boas-vindas (RF-24), serviço de bordo
 * (E2) e "De volta ao foco" (E1). Desliza de cima e fecha no "×"; quem decide quando some é a tela.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOutUp, ReduceMotion, SlideInUp } from 'react-native-reanimated';

import { color, IconButton, radius, space, Text } from '@/ds';
import { motion } from '@/ds/motion';
import { t } from '@/i18n';

export type AvisoNoAppProps = {
  icone: ReactNode;
  titulo: string;
  texto: string;
  rotuloFechar: string;
  onFechar: () => void;
};

export function AvisoNoApp({ icone, titulo, texto, rotuloFechar, onFechar }: AvisoNoAppProps) {
  return (
    <Animated.View
      entering={SlideInUp.duration(motion.duration.medium4).easing(motion.easing.emphasizedDecelerate).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutUp.duration(motion.duration.medium2).reduceMotion(ReduceMotion.System)}
      style={styles.cartao}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.icone}>{icone}</View>
      <View style={{ flex: 1, gap: space[2] }}>
        <Text variant="Caption/Medium 12" tone="tertiary">
          {t('emVoo.avisoOrigem')}
        </Text>
        <Text variant="Label/Strong 14">{titulo}</Text>
        <Text variant="Body/Small 13" tone="secondary">
          {texto}
        </Text>
      </View>
      <IconButton icon="fechar" accessibilityLabel={rotuloFechar} onPress={onFechar} style={styles.fechar} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[12],
    paddingLeft: space[14],
    paddingVertical: space[14],
    paddingRight: space[4],
    borderRadius: radius.xl,
    backgroundColor: color.bg.sheet,
    borderWidth: 1,
    borderColor: color.border.subtle,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  icone: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: color.surface.default, alignItems: 'center', justifyContent: 'center' },
  fechar: { backgroundColor: 'transparent', marginTop: -space[8] },
});
