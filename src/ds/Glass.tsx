import React, { type ComponentRef, type RefObject } from 'react';
import { StyleSheet, View, type StyleProp, type View as RNView, type ViewProps, type ViewStyle } from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { color as C, radius } from './tokens';

/**
 * Efeito "Glass/Blur 12" do Figma: desfoque de fundo de 12 px sob uma superfície translúcida.
 *
 * No Android, o desfoque só acontece sobre o que estiver dentro de um `GlassTarget` (passe a
 * ref dele em `target`). Sem alvo, ou em Android abaixo do 12 (SDK 31), vira só a superfície
 * translúcida, sem desfoque. Cada desfoque redesenha quando o fundo muda: sobre a janela em voo,
 * medir bateria antes de usar.
 */
export type GlassProps = ViewProps & {
  target?: RefObject<ComponentRef<typeof RNView> | null>;
  style?: StyleProp<ViewStyle>;
};

// Intensidade aproximada para 12 px de raio (a escala do expo-blur vai de 1 a 100).
const INTENSIDADE = 24;

export function Glass({ target, style, children, ...rest }: GlassProps) {
  return (
    <View style={[styles.base, style]} {...rest}>
      <BlurView
        style={StyleSheet.absoluteFill}
        intensity={INTENSIDADE}
        tint="dark"
        blurTarget={target}
        blurMethod={target ? 'dimezisBlurViewSdk31Plus' : 'none'}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.surface.strong }]} />
      {children}
    </View>
  );
}

/** Conteúdo que pode ser desfocado por um `Glass` por cima (necessário no Android). */
export const GlassTarget = BlurTargetView;

const styles = StyleSheet.create({
  base: { overflow: 'hidden', borderRadius: radius.lg },
});
