/**
 * Medalha do souvenir em 2D (cartões de "Lojas", vitrine da loja do destino).
 * Usa o render do catálogo (`imagem2d`, no R2) quando existir. Até os renders entrarem (antes do
 * lançamento, decidido pelo Alberto em 25/11/2026), mostra uma medalha provisória no metal do tipo,
 * com o nome do país na forma nativa, como na medalha de verdade.
 */
import { Image, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { env } from '@/config/env';
import type { Souvenir } from '@/domain/colecao/catalogo';
import { loja, Text } from '@/ds';

export function Medalha({ souvenir, tamanho }: { souvenir: Souvenir; tamanho: number }) {
  const sombra = { shadowColor: loja.sombra, shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 };
  if (souvenir.imagem2d && env.tilesBaseUrl) {
    return (
      <Image
        source={{ uri: `${env.tilesBaseUrl}/${souvenir.imagem2d}` }}
        style={[{ width: tamanho, height: tamanho, borderRadius: tamanho / 2 }, sombra]}
        accessibilityIgnoresInvertColors
      />
    );
  }
  const m = loja.metal[souvenir.metal];
  const r = tamanho / 2;
  const id = `metal-${souvenir.metal}`;
  return (
    <View style={[{ width: tamanho, height: tamanho, borderRadius: r, alignItems: 'center', justifyContent: 'center' }, sombra]}>
      <Svg width={tamanho} height={tamanho} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id={id} cx="35%" cy="30%" r="80%">
            <Stop offset="0" stopColor={m.claro} />
            <Stop offset="1" stopColor={m.escuro} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#${id})`} />
        <Circle cx={r} cy={r} r={r * 0.84} fill="none" stroke={m.escuro} strokeWidth={Math.max(1, tamanho / 60)} />
      </Svg>
      <Text
        variant={tamanho >= 120 ? 'Heading/Data 24' : 'Caption/Strong 12'}
        style={{ color: m.texto, maxWidth: tamanho * 0.7, textAlign: 'center' }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {souvenir.nomeNativo.toUpperCase()}
      </Text>
    </View>
  );
}
