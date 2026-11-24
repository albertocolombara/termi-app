/**
 * Aviso em voo (Figma v3: "Aviso · Fim do serviço de bordo", o estilo de todas as notificações em voo):
 * boas-vindas (RF-24), serviço de bordo (E1/E2), sem sinal do radar (E4) e sem internet (X4).
 *
 * Fundo escuro translúcido com borda e sombra, o Termi (mala) como ícone, "Termi • agora", título e
 * texto. O "×" fecha (pedido do Alberto no build-46: o Figma não tem, mas o usuário precisa de um jeito
 * claro de fechar). Quem decide quando some sozinho é a tela.
 */
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOutUp, ReduceMotion, SlideInUp } from 'react-native-reanimated';

import { color, effects, Icon, IconButton, radius, space, Suitcase, Text, type IconName } from '@/ds';
import { motion } from '@/ds/motion';
import { t } from '@/i18n';

export type AvisoNoAppProps = {
  /**
   * Sem ícone: aviso do Termi (boas-vindas), com o mascote atual (mala) e "Termi • agora".
   * O mascote novo em teste (PainelDePartidas) fica fora até o Alberto decidir.
   * Com ícone: aviso de estado (serviço de bordo, sem sinal, sem internet), ícone laranja num quadrado.
   */
  icone?: IconName;
  titulo: string;
  texto: string;
  /** Rótulo de acessibilidade do "×". */
  rotuloFechar: string;
  onFechar: () => void;
};

export function AvisoNoApp({ icone, titulo, texto, rotuloFechar, onFechar }: AvisoNoAppProps) {
  return (
    <Animated.View
      entering={SlideInUp.duration(motion.duration.medium4).easing(motion.easing.emphasizedDecelerate).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutUp.duration(motion.duration.medium2).reduceMotion(ReduceMotion.System)}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.cartao} accessibilityRole="alert">
        {icone ? (
          <View style={styles.estado}>
            <Icon name={icone} />
          </View>
        ) : (
          <View style={styles.icone}>
            <Suitcase size={26} />
          </View>
        )}
        <View style={{ flex: 1, gap: space[4] }}>
          {icone ? null : (
            <Text variant="Caption/Medium 12" tone="tertiary">
              {t('emVoo.avisoOrigem')}
            </Text>
          )}
          <Text variant={icone ? 'Label/Strong 14' : 'Label/Medium 14'}>{titulo}</Text>
          <Text variant={icone ? 'Body/Small 13' : 'Label/Medium 14'} tone={icone ? 'secondary' : 'tertiary'}>
            {texto}
          </Text>
        </View>
        <IconButton icon="fechar" accessibilityLabel={rotuloFechar} onPress={onFechar} style={styles.fechar} />
      </View>
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
    backgroundColor: color.bg.scrim,
    borderWidth: 1,
    borderColor: color.border.default,
    ...effects['Shadow/Small'],
  },
  icone: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: color.surface.default, alignItems: 'center', justifyContent: 'center' },
  fechar: { backgroundColor: 'transparent', marginTop: -space[8] },
  estado: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: color.aviso.icone, alignItems: 'center', justifyContent: 'center' },
});
