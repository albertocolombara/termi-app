/**
 * Linha tracejada horizontal. No Android, `borderStyle: 'dashed'` em um lado só da borda não aparece;
 * por isso o tracejado do bilhete e da rota é desenhado em SVG.
 */
import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';

export function LinhaTracejada({
  cor,
  espessura = 1,
  traco = 4,
  espaco = 4,
  style,
}: {
  cor: string;
  espessura?: number;
  traco?: number;
  espaco?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [largura, setLargura] = useState(0);
  return (
    <View style={[{ height: espessura }, style]} onLayout={(e) => setLargura(e.nativeEvent.layout.width)} importantForAccessibility="no-hide-descendants">
      {largura > 0 ? (
        <Svg width={largura} height={espessura}>
          <Line x1={0} y1={espessura / 2} x2={largura} y2={espessura / 2} stroke={cor} strokeWidth={espessura} strokeDasharray={`${traco} ${espaco}`} />
        </Svg>
      ) : null}
    </View>
  );
}
