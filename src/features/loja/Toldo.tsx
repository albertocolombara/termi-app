/**
 * Toldo listrado da loja (Figma v3: "Toldo" em L1, L2 e L2b): faixas amarelas e grafite com a borda
 * recortada em meia-lua. É o que diferencia a loja de uma tela comum do app. Decorativo: sem leitura
 * para o leitor de tela.
 */
import { useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { color } from '@/ds';

const FAIXAS = 12;
const ALTURA_DA_FAIXA = 40;

export function Toldo() {
  const { width } = useWindowDimensions();
  const w = width / FAIXAS;
  const altura = ALTURA_DA_FAIXA + w / 2;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={altura}>
        {Array.from({ length: FAIXAS }, (_, i) => {
          const cor = i % 2 === 0 ? color.accent.default : color.surface.strong;
          return [
            <Rect key={`r${i}`} x={i * w} y={0} width={w + 0.5} height={ALTURA_DA_FAIXA} fill={cor} />,
            <Circle key={`c${i}`} cx={i * w + w / 2} cy={ALTURA_DA_FAIXA} r={w / 2} fill={cor} />,
          ];
        })}
      </Svg>
    </View>
  );
}
