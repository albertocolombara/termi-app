/**
 * "Em voo / Rota" (Figma): barra de rota do painel inferior. O avião anda conforme o progresso
 * (fração entre o embarque e o pouso). Trecho voado em laranja; restante em branco 65%, tracejados.
 */
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { G, Line, Path } from 'react-native-svg';

import { color as C } from './tokens';

const AVIAO =
  'M7 18.8333L8.66667 18.8333L12.8333 11.75L17.4167 11.75C18.1083 11.75 18.6667 11.1917 18.6667 10.5C18.6667 9.80833 18.1083 9.25 17.4167 9.25L12.8333 9.25L8.66667 2.16666L7 2.16666L9.08333 9.25L4.5 9.25L3.25 7.16666L2 7.16666L2.83333 10.5L2 13.8333L3.25 13.8333L4.5 11.75L9.08333 11.75L7 18.8333Z';
const ALTURA = 21;
const LADO_DO_AVIAO = 21;

export function EmVooRota({ progresso }: { progresso: number }) {
  const [largura, setLargura] = useState(192);
  const p = Math.min(1, Math.max(0, progresso));
  const x = p * largura;
  // O avião fica inteiro dentro da barra, com o nariz no ponto do progresso.
  const xAviao = Math.min(largura - LADO_DO_AVIAO, Math.max(0, x - LADO_DO_AVIAO + 2));
  return (
    <View style={{ flex: 1, height: ALTURA }} onLayout={(e) => setLargura(e.nativeEvent.layout.width)} importantForAccessibility="no-hide-descendants">
      <Svg width={largura} height={ALTURA}>
        <Line x1={0} y1={10.5} x2={x} y2={10.5} stroke={C.brand.termi} strokeDasharray="2 2" />
        <Line x1={x} y1={10.5} x2={largura} y2={10.5} stroke={C.text.tertiary} strokeDasharray="2 2" />
        <G transform={`translate(${xAviao} 0)`}>
          <Path d={AVIAO} fill={C.brand.termi} />
        </G>
      </Svg>
    </View>
  );
}
