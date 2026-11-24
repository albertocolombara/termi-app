/**
 * Carimbo do passaporte na tela de pouso (Figma v3: E6 e E7, "Carimbo · LHR").
 * Dois anéis, cidade, código e a data. Sem carimbo (E7): branco a 30%, sem giro, com "sem carimbo".
 *
 * Animação de carimbo (anotação do Figma v3): o carimbo desce grande e transparente e "bate" no
 * lugar, com um pequeno tranco. Não aparece outro carimbo, só o movimento. Some com "reduzir movimento".
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { color, Text } from '@/ds';

const LADO = 150;
const GIRO = -8;

export function Carimbo({ cidade, codigo, data, apagado, legenda }: { cidade: string; codigo: string; data: string; apagado?: boolean; legenda?: string }) {
  const cor = apagado ? color.carimboApagado : color.accent.default;
  const batida = useSharedValue(apagado ? 1 : 0);

  useEffect(() => {
    if (apagado) return;
    const rm = ReduceMotion.System;
    batida.set(
      withDelay(
        250,
        withSequence(
          withTiming(1, { duration: 260, easing: Easing.in(Easing.cubic), reduceMotion: rm }),
          withTiming(1.04, { duration: 70, easing: Easing.out(Easing.quad), reduceMotion: rm }),
          withTiming(1, { duration: 120, easing: Easing.inOut(Easing.quad), reduceMotion: rm }),
        ),
      ),
    );
  }, [apagado, batida]);

  const estilo = useAnimatedStyle(() => {
    const p = Math.min(1, batida.get());
    const tranco = Math.max(0, batida.get() - 1);
    return {
      opacity: p,
      transform: [{ scale: 1.7 - 0.7 * p - tranco * 0.6 }, { rotate: `${apagado ? 0 : GIRO - 10 * (1 - p)}deg` }],
    };
  });

  return (
    <Animated.View style={[styles.externo, { borderColor: cor }, estilo]}>
      <View style={[styles.interno, { borderColor: cor }]}>
        {/* Cidade e código encolhem para caber no círculo (ex.: "MANCHESTER", códigos ICAO de 4 letras). */}
        <Text variant="Caption/Strong 12" style={{ color: cor }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {cidade.toUpperCase()}
        </Text>
        <Text variant="Display/Data 52" style={{ color: cor, fontSize: codigo.length > 3 ? 40 : 52, lineHeight: 62 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
          {codigo}
        </Text>
        <Text variant="Caption/Medium 12" style={{ color: cor }} numberOfLines={1} adjustsFontSizeToFit>
          {legenda ?? data}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  externo: { width: LADO, height: LADO, borderRadius: LADO / 2, borderWidth: 1, padding: 11, alignSelf: 'center' },
  interno: { flex: 1, borderRadius: LADO / 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, gap: 2 },
});
