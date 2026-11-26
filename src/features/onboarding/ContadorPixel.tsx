/**
 * Contador do OB1 (Figma "Contador · do cache de voos"): número em Geist Pixel Grid 52 com degradê
 * vertical do branco ao cinza, subindo de 0 até o total. O degradê no texto é desenhado em Skia.
 */
import { Canvas, LinearGradient, Text as SkText, useFont, vec } from '@shopify/react-native-skia';
import { View } from 'react-native';

import { color } from '@/ds';

import { useContagem } from './useContagem';

const TAMANHO = 52;
/** Folga dos lados: a medida da fonte pixelada não conta a última coluna de pontos. */
const FOLGA = 12;

export function ContadorPixel({ valor, rotuloAcessivel }: { valor: number; rotuloAcessivel: string }) {
  const fonte = useFont(require('../../../assets/fonts/geist-pixel/GeistPixel-Grid.ttf'), TAMANHO);
  const mostrado = useContagem(valor).toLocaleString('pt-BR');
  const altura = Math.round(TAMANHO * 1.2);
  // A largura é a do número final, para o layout não pular enquanto ele sobe.
  const largura = fonte ? Math.ceil(fonte.measureText(valor.toLocaleString('pt-BR')).width) + 2 * FOLGA : 0;
  const x = fonte ? (largura - fonte.measureText(mostrado).width) / 2 : 0;
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={rotuloAcessivel} style={{ height: altura, width: largura, alignSelf: 'center' }}>
      {fonte ? (
        <Canvas style={{ width: largura, height: altura }}>
          <SkText x={x} y={TAMANHO * 0.95} text={mostrado} font={fonte}>
            <LinearGradient start={vec(0, 0)} end={vec(0, altura)} colors={[color.text.primary, color.onboarding.fimDoContador]} />
          </SkText>
        </Canvas>
      ) : null}
    </View>
  );
}
