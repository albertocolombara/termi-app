/**
 * Painel de partidas (Figma: "Painel de voos/Linha" e o cabeçalho da tabela em "02 · Partidas").
 * Só aparência: quem usa decide os voos e o que acontece no toque.
 * O Figma usa a Geist Pixel "Square" nas linhas; o app só embute a forma Grid (DESIGN.md, 19/11/2026).
 */
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Cauda } from './bandeiras/Cauda';
import { Text } from './Text';
import { color as C, fontFamily, space } from './tokens';

const pixel = (tamanho: number) => ({ fontFamily: fontFamily.pixel, fontSize: tamanho, letterSpacing: -0.03 * tamanho });

export function CabecalhoDoPainel({ voo, destino, tempo }: { voo: string; destino: string; tempo: string }) {
  return (
    <View style={styles.cabecalho}>
      <View style={styles.colunas}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="Body/Large Medium 16" tone="tertiary" style={{ width: 162 }}>
            {voo}
          </Text>
          <Text variant="Body/Large Medium 16" tone="tertiary">
            {destino}
          </Text>
        </View>
        <Text variant="Body/Large Medium 16" tone="tertiary">
          {tempo}
        </Text>
      </View>
    </View>
  );
}

export type LinhaDoPainelProps = {
  codigo: string;
  companhia: string | null;
  pais: string | null;
  destino: string;
  tempo: string;
  alternado?: boolean;
  selecionado?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
};

export const LinhaDoPainel = memo(function LinhaDoPainel(p: LinhaDoPainelProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={p.accessibilityLabel}
      accessibilityState={{ selected: !!p.selecionado }}
      onPress={p.onPress}
      style={({ pressed }) => [
        styles.linha,
        { backgroundColor: p.alternado ? C.painel.linhaAlternada : C.painel.linha },
        (pressed || p.selecionado) && { backgroundColor: C.surface.default },
      ]}
    >
      <View style={styles.colunas}>
        <View style={styles.identificacao}>
          <Cauda pais={p.pais} />
          <View style={{ width: 108, gap: 2 }}>
            <Text style={[pixel(14), { color: C.text.primary }]} numberOfLines={1}>
              {p.codigo}
            </Text>
            {p.companhia ? (
              <Text style={[pixel(12), { color: C.text.secondary }]} numberOfLines={1}>
                {p.companhia}
              </Text>
            ) : null}
          </View>
        </View>
        <Text style={[pixel(20), { color: C.text.accent, flex: 1 }]} numberOfLines={1}>
          {p.destino}
        </Text>
        <Text variant="Heading/Data 24" style={{ fontSize: 20, letterSpacing: -0.6 }}>
          {p.tempo}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cabecalho: {
    paddingHorizontal: space[16],
    paddingVertical: space[8],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.border.default,
  },
  colunas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[12], maxWidth: 380, width: '100%', alignSelf: 'center' },
  linha: { paddingHorizontal: space[16], paddingVertical: space[10], minHeight: 56 },
  identificacao: { flexDirection: 'row', alignItems: 'center', gap: space[10], height: 36 },
});
