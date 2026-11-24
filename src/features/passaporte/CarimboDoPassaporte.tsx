/**
 * Carimbo do passaporte (Figma M2 e M3b: "Carimbo · LHR"): cidade em cima, código grande, data embaixo.
 * A tinta e o formato (redondo ou retangular) saem do código do aeroporto, para o passaporte variar
 * como um de verdade, mas o mesmo aeroporto ter sempre o mesmo carimbo.
 */
import { StyleSheet, View } from 'react-native';

import { color, Text } from '@/ds';

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
export const dataDoCarimbo = (ms: number) => {
  const d = new Date(ms);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
};

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function tintaDoCarimbo(codigo: string) {
  return color.carimbo.tintas[hash(codigo) % color.carimbo.tintas.length];
}

export function CarimboDoPassaporte({
  cidade,
  codigo,
  data,
  tamanho = 104,
  giro = 0,
}: {
  cidade: string;
  codigo: string;
  data: number;
  tamanho?: number;
  giro?: number;
}) {
  const tinta = tintaDoCarimbo(codigo);
  const redondo = hash(codigo) % 3 !== 0;
  const escala = tamanho / 104;
  return (
    <View
      style={[
        styles.externo,
        {
          width: tamanho * (redondo ? 0.92 : 0.96),
          height: tamanho * (redondo ? 0.92 : 0.72),
          borderRadius: redondo ? tamanho : 8 * escala,
          borderColor: tinta,
          borderWidth: 2.5 * escala,
          transform: [{ rotate: `${giro}deg` }],
        },
      ]}
    >
      <Text variant="Caption/Strong 12" style={{ color: tinta, opacity: 0.9, fontSize: 12 * escala, lineHeight: 16 * escala }} numberOfLines={1} adjustsFontSizeToFit>
        {cidade.toUpperCase()}
      </Text>
      <Text variant="Heading/Data 24" style={{ color: tinta, fontSize: 24 * escala, lineHeight: 29 * escala }} numberOfLines={1} adjustsFontSizeToFit>
        {codigo}
      </Text>
      <Text variant="Caption/Medium 12" style={{ color: tinta, opacity: 0.9, fontSize: 12 * escala, lineHeight: 16 * escala }}>
        {dataDoCarimbo(data)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  externo: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, opacity: 0.95 },
});
