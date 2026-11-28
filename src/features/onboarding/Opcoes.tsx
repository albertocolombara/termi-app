/**
 * Listas de escolha do onboarding (Figma "Tópicos de foco" e "Tempo de foco · Seleção única"):
 * cartão com borda, linhas de 70–88 dp separadas por divisores. A linha inteira é o alvo de toque.
 */
import { Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';

import { color, Icon, radius, space, Text, type IconName } from '@/ds';

export function CartaoDeOpcoes({ children }: { children: ReactNode[] }) {
  return (
    <View style={styles.cartao}>
      {children.map((c, i) => (
        <Fragment key={i}>{c}</Fragment>
      ))}
    </View>
  );
}

/** Opção de múltipla escolha (OB3 · v4 Clean): cartão individual com destaque âmbar e check circular. */
export function OpcaoMarcavel({ icone, rotulo, marcada, onPress }: { icone: IconName; rotulo: string; marcada: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      accessibilityLabel={rotulo}
      onPress={onPress}
      style={({ pressed }) => [styles.linha, { minHeight: 62 }, marcada && styles.fundoMarcado, pressed && styles.pressionada]}
    >
      <Icon name={icone} size={22} />
      <Text variant="Body/Large Medium 16" style={styles.rotulo}>
        {rotulo}
      </Text>
      <Caixa marcada={marcada} />
    </Pressable>
  );
}

/** Opção de escolha única (OB4 · v4 Clean): cartão individual com destaque âmbar e rádio. */
export function OpcaoUnica({ titulo, descricao, marcada, onPress }: { titulo: string; descricao: string; marcada: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: marcada }}
      accessibilityLabel={`${titulo}. ${descricao}`}
      onPress={onPress}
      style={({ pressed }) => [styles.linha, { minHeight: 78, paddingVertical: space[14] }, marcada && styles.fundoMarcado, pressed && styles.pressionada]}
    >
      <View style={{ flex: 1, gap: space[4] }}>
        <Text variant="Body/Large Medium 16" style={styles.titulo}>
          {titulo}
        </Text>
        <Text variant="Body/Small 13" tone="tertiary">
          {descricao}
        </Text>
      </View>
      <Radio marcada={marcada} />
    </Pressable>
  );
}

/** Caixa de 26 dp: contorno quando desmarcada; amarela com o "✓" escuro quando marcada (200 ms). */
function Caixa({ marcada }: { marcada: boolean }) {
  const p = useDerivedValue(() => withTiming(marcada ? 1 : 0, { duration: 200 }));
  const fundo = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], ['transparent', color.accent.default]),
    borderColor: interpolateColor(p.value, [0, 1], [color.border.control, color.accent.default]),
  }));
  const marca = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: interpolate(p.value, [0, 1], [0.6, 1]) }] }));
  return (
    <Animated.View style={[styles.caixa, fundo]}>
      <Animated.View style={marca}>
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path d="M3.375 9.5625L6.75 12.9375L14.625 5.0625" stroke={color.accent.on} strokeWidth={2.42} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

/** Rádio de 23 dp (Figma "Rádio"): anel claro; marcado, anel e miolo amarelos. */
function Radio({ marcada }: { marcada: boolean }) {
  const p = useDerivedValue(() => withTiming(marcada ? 1 : 0, { duration: 200 }));
  const anel = useAnimatedStyle(() => ({ borderColor: interpolateColor(p.value, [0, 1], [color.text.tertiary, color.accent.default]) }));
  const miolo = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: p.value }] }));
  return (
    <Animated.View style={[styles.radio, anel]}>
      <Animated.View style={[styles.mioloDoRadio, miolo]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: space[10] },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[14],
    paddingHorizontal: space[16],
    borderRadius: radius.cta,
    backgroundColor: color.surface.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pressionada: { opacity: 0.85 },
  fundoMarcado: { backgroundColor: color.accent.container, borderColor: color.accent.default },
  rotulo: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '500' },
  titulo: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  caixa: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  mioloDoRadio: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.accent.default },
});
