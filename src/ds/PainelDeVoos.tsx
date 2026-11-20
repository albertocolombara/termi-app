/**
 * Painel de partidas (Figma: "Painel de voos/Linha" e o cabeçalho da tabela em "02 · Partidas").
 * Só aparência: quem usa decide os voos e o que acontece no toque.
 * O Figma usa a Geist Pixel "Square" nas linhas; o app só embute a forma Grid (DESIGN.md, 19/11/2026).
 */
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { Cauda } from './bandeiras/Cauda';
import { Letreiro, useAlternancia } from './Letreiro';
import { useStateProgress } from './motion';
import { Text } from './Text';
import { TextoCorrido } from './TextoCorrido';
import { color as C, fontFamily, space } from './tokens';

const pixel = (tamanho: number) => ({ fontFamily: fontFamily.pixel, fontSize: tamanho, letterSpacing: -0.03 * tamanho });

export function CabecalhoDoPainel({ voo, destino, tempo }: { voo: string; destino: string; tempo: string }) {
  return (
    <View style={styles.cabecalho}>
      <View style={styles.colunas}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="Body/Large Medium 16" tone="tertiary" style={{ width: LARGURA_DO_VOO }}>
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
  /** Rota curta ("BCN → LHR"). A linha de baixo do voo alterna entre a companhia e a rota. */
  rota?: string;
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
          <View style={{ width: LARGURA_DO_TEXTO, gap: 2 }}>
            <Text style={[pixel(14), { color: C.text.primary }]} numberOfLines={1}>
              {p.codigo}
            </Text>
            <LinhaQueAlterna companhia={p.companhia} rota={p.rota} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Letreiro texto={p.destino} style={[pixel(20), { color: C.text.accent }]} />
        </View>
        <Text variant="Heading/Data 24" style={{ fontSize: 20, letterSpacing: -0.6 }}>
          {p.tempo}
        </Text>
      </View>
    </Pressable>
  );
});

/**
 * Companhia e rota se revezam a cada 6 s, todas as linhas juntas, com um fade (pedido do Alberto,
 * build-26). Nome de companhia que não cabe corre para o lado enquanto está à vista.
 */
function LinhaQueAlterna({ companhia, rota }: { companhia: string | null; rota?: string }) {
  const temAs2 = !!companhia && !!rota;
  const i = useAlternancia(6000, temAs2 ? 2 : 1);
  const mostraRota = temAs2 ? i === 1 : !companhia;
  const p = useStateProgress(mostraRota, 400);
  const estiloCompanhia = useAnimatedStyle(() => ({ opacity: 1 - p.get() }));
  const estiloRota = useAnimatedStyle(() => ({ opacity: p.get() }));
  const estilo = [pixel(12), { color: C.text.secondary }];
  if (!companhia && !rota) return null;
  return (
    <View style={styles.revezamento}>
      {companhia ? (
        <Animated.View style={[StyleSheet.absoluteFill, estiloCompanhia]} importantForAccessibility={mostraRota ? 'no-hide-descendants' : 'auto'}>
          <TextoCorrido texto={companhia} style={estilo} ativo={!mostraRota} />
        </Animated.View>
      ) : null}
      {rota ? (
        <Animated.View style={[StyleSheet.absoluteFill, estiloRota]} importantForAccessibility={mostraRota ? 'auto' : 'no-hide-descendants'}>
          <Text style={estilo} numberOfLines={1}>
            {rota}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Coluna do voo: cauda (36) + espaço (10) + texto. O texto ficou mais estreito para sobrar espaço ao destino. */
const LARGURA_DO_TEXTO = 88;
const LARGURA_DO_VOO = 36 + 10 + LARGURA_DO_TEXTO + 12;

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
  // Altura de uma linha do pixel 12, para as duas camadas do revezamento ficarem no mesmo lugar.
  revezamento: { height: 16 },
});
