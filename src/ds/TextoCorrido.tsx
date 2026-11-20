/**
 * Texto que corre para o lado quando não cabe, como nos painéis de LED de aeroporto (pedido do
 * Alberto, 20/11/2026). Se cabe, fica parado. Se não cabe, para um instante, corre até a cópia
 * seguinte encostar no lugar do começo e repete, sem pulo.
 *
 * `ativo` reinicia do começo (ex.: quando a linha volta a aparecer no revezamento).
 * Com "reduzir movimento", fica parado com reticências. Leitores de tela leem o texto uma vez só.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from './Text';

/** Velocidade da corrida (px por segundo) e pausa antes de cada volta. */
const VELOCIDADE = 36;
const PAUSA_MS = 900;
const ESPACO = 24;

export function TextoCorrido({ texto, style, ativo = true }: { texto: string; style?: StyleProp<TextStyle>; ativo?: boolean }) {
  const reduzir = useReducedMotion();
  const [larguraDaCaixa, setLarguraDaCaixa] = useState(0);
  const [larguraDoTexto, setLarguraDoTexto] = useState(0);
  const x = useSharedValue(0);
  const corre = !reduzir && larguraDaCaixa > 0 && larguraDoTexto > larguraDaCaixa + 1;
  const volta = larguraDoTexto + ESPACO;

  useEffect(() => {
    cancelAnimation(x);
    x.set(0);
    if (!corre || !ativo) return;
    x.set(
      withRepeat(
        withSequence(withDelay(PAUSA_MS, withTiming(-volta, { duration: (volta / VELOCIDADE) * 1000, easing: Easing.linear })), withTiming(0, { duration: 0 })),
        -1,
      ),
    );
    return () => cancelAnimation(x);
  }, [corre, ativo, volta, x]);

  const estilo = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View style={styles.caixa} onLayout={(e) => setLarguraDaCaixa(e.nativeEvent.layout.width)} accessible accessibilityLabel={texto}>
      {/* Medida da largura natural do texto, fora da tela de leitura e invisível. */}
      <View style={styles.medida} pointerEvents="none" importantForAccessibility="no-hide-descendants">
        <Text style={style} numberOfLines={1} onLayout={(e) => setLarguraDoTexto(e.nativeEvent.layout.width)}>
          {texto}
        </Text>
      </View>
      {corre ? (
        <Animated.View style={[styles.faixa, estilo]} importantForAccessibility="no-hide-descendants">
          <Text style={style} numberOfLines={1}>
            {texto}
          </Text>
          <View style={{ width: ESPACO }} />
          <Text style={style} numberOfLines={1}>
            {texto}
          </Text>
        </Animated.View>
      ) : (
        <Text style={style} numberOfLines={1} importantForAccessibility="no">
          {texto}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { overflow: 'hidden', alignSelf: 'stretch' },
  medida: { position: 'absolute', opacity: 0, flexDirection: 'row', width: 2000 },
  faixa: { flexDirection: 'row', width: 2000 },
});
