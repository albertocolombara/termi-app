/**
 * O bilhete sai "impresso" de baixo do cabeçalho, como de uma impressora de cartão de embarque
 * (pedido do Alberto, 20/11/2026). Avança em pequenos trancos, como o papel puxado pelo rolo.
 * Um toque termina na hora; com "reduzir movimento" aparece pronto (CLAUDE.md §9).
 * O espaço do bilhete já fica reservado, então nada abaixo dele pula.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { color } from '@/ds';

const TRANCOS = 7;
const DURACAO_TRANCO = 190;
const PAUSA = 70;

export function ImpressaoDoBilhete({ children, dica }: { children: ReactNode; dica: string }) {
  const reduzir = useReducedMotion();
  const [medido, setMedido] = useState(false);
  const [imprimindo, setImprimindo] = useState(false);
  const y = useSharedValue(0);

  const estilo = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const aoMedir = (altura: number) => {
    if (medido) return;
    setMedido(true);
    if (reduzir || altura <= 0) return;
    setImprimindo(true);
    y.set(-altura);
    const passos = Array.from({ length: TRANCOS }, (_, i) =>
      withDelay(PAUSA, withTiming(-altura + (altura * (i + 1)) / TRANCOS, { duration: DURACAO_TRANCO, easing: Easing.out(Easing.quad) })),
    );
    y.set(withSequence(...passos));
    setTimeout(() => setImprimindo(false), TRANCOS * (DURACAO_TRANCO + PAUSA) + 50);
  };

  const terminar = () => {
    cancelAnimation(y);
    y.set(0);
    setImprimindo(false);
  };

  return (
    <Pressable disabled={!imprimindo} onPress={terminar} accessibilityHint={imprimindo ? dica : undefined} style={{ overflow: 'hidden' }}>
      <Animated.View style={[estilo, { opacity: medido ? 1 : 0 }]} onLayout={(e) => aoMedir(e.nativeEvent.layout.height)}>
        {children}
      </Animated.View>
      {/* Fenda da impressora: sombra fina logo abaixo do cabeçalho */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, backgroundImage: `linear-gradient(180deg, ${color.cartao.sombraDaFenda} 0%, transparent 100%)` }} />
    </Pressable>
  );
}
