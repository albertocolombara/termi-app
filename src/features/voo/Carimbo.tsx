/** Carimbo do passaporte na tela de pouso (Figma E6/E7). Sem carimbo: contorno tracejado e apagado. */
import { StyleSheet, View } from 'react-native';

import { color, Text } from '@/ds';

const LADO = 176;

export function Carimbo({ cidade, codigo, data, apagado, legenda }: { cidade: string; codigo: string; data: string; apagado?: boolean; legenda?: string }) {
  const cor = apagado ? color.border.strong : color.accent.default;
  return (
    <View style={[styles.externo, { borderColor: cor, borderStyle: apagado ? 'dashed' : 'solid', transform: [{ rotate: apagado ? '0deg' : '-4deg' }] }]}>
      <View style={[styles.interno, { borderColor: cor, borderStyle: apagado ? 'dashed' : 'solid' }]}>
        {/* Cidade e código encolhem para caber no círculo (ex.: "MANCHESTER", códigos ICAO de 4 letras). */}
        <Text variant="Caption/Strong 12" style={{ color: cor, letterSpacing: 1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {cidade.toUpperCase()}
        </Text>
        <Text variant="Display/Data 52" style={{ color: cor, fontSize: codigo.length > 3 ? 36 : 46, lineHeight: 54 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
          {codigo}
        </Text>
        <Text variant="Caption/Medium 12" style={{ color: cor }} numberOfLines={1} adjustsFontSizeToFit>
          {legenda ?? data}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  externo: { width: LADO, height: LADO, borderRadius: LADO / 2, borderWidth: 3, padding: 6, alignSelf: 'center' },
  interno: { flex: 1, borderRadius: LADO / 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 2 },
});
