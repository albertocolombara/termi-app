/**
 * Contador do OB1 (Figma "Contador · do cache de voos"): número em Geist Pixel Grid 52 com degradê
 * vertical do branco ao cinza. O degradê no texto é desenhado em Skia.
 */
import { Canvas, LinearGradient, Text as SkText, useFont, vec } from '@shopify/react-native-skia';
import { View } from 'react-native';

import { color } from '@/ds';

const TAMANHO = 52;

export function ContadorPixel({ valor, rotuloAcessivel }: { valor: string; rotuloAcessivel: string }) {
  const fonte = useFont(require('../../../assets/fonts/geist-pixel/GeistPixel-Grid.ttf'), TAMANHO);
  const altura = Math.round(TAMANHO * 1.2);
  const largura = fonte ? Math.ceil(fonte.measureText(valor).width) + 4 : 0;
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={rotuloAcessivel} style={{ height: altura, minWidth: largura, alignSelf: 'center' }}>
      {fonte ? (
        <Canvas style={{ width: largura, height: altura }}>
          <SkText x={2} y={TAMANHO * 0.95} text={valor} font={fonte}>
            <LinearGradient start={vec(0, 0)} end={vec(0, altura)} colors={[color.text.primary, color.onboarding.fimDoContador]} />
          </SkText>
        </Canvas>
      ) : null}
    </View>
  );
}
