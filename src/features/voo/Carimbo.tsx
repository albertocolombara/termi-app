/** Carimbo do passaporte na tela de pouso (Figma E6/E7). Sem carimbo: contorno tracejado e apagado. */
import { StyleSheet, View } from 'react-native';

import { color, Text } from '@/ds';

const LADO = 156;

export function Carimbo({ cidade, codigo, data, apagado, legenda }: { cidade: string; codigo: string; data: string; apagado?: boolean; legenda?: string }) {
  const cor = apagado ? color.border.strong : color.accent.default;
  return (
    <View style={[styles.externo, { borderColor: cor, borderStyle: apagado ? 'dashed' : 'solid', transform: [{ rotate: apagado ? '0deg' : '-4deg' }] }]}>
      <View style={[styles.interno, { borderColor: cor, borderStyle: apagado ? 'dashed' : 'solid' }]}>
        <Text variant="Caption/Strong 12" style={{ color: cor, letterSpacing: 1 }} numberOfLines={1}>
          {cidade.toUpperCase()}
        </Text>
        <Text variant="Display/Data 52" style={{ color: cor, lineHeight: 56 }}>
          {codigo}
        </Text>
        <Text variant="Caption/Medium 12" style={{ color: cor }}>
          {legenda ?? data}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  externo: { width: LADO, height: LADO, borderRadius: LADO / 2, borderWidth: 3, padding: 6, alignSelf: 'center' },
  interno: { flex: 1, borderRadius: LADO / 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
});
