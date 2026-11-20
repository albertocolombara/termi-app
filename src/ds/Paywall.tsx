/**
 * Peças do paywall (Figma: "Paywall / Plano" 258:1982 e o indicador de "Paywall / Benefícios").
 * Só aparência: preços e textos vêm de quem usa.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { color as C, radius, space } from './tokens';

export type PaywallPlanoProps = {
  nome: string;
  preco: string;
  periodo: string;
  selecionado: boolean;
  /** Etiqueta no topo (ex.: "Economize 50%"). Só com dado real (RN-21). */
  etiqueta?: string;
  accessibilityLabel: string;
  onPress: () => void;
};

export function PaywallPlano({ nome, preco, periodo, selecionado, etiqueta, accessibilityLabel, onPress }: PaywallPlanoProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: selecionado }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.plano, selecionado ? styles.selecionado : styles.normal, pressed && { opacity: 0.85 }]}
    >
      <Text variant="Body/Medium 14" tone="secondary" numberOfLines={1}>
        {nome}
      </Text>
      <Text variant="Heading/Sheet 22" style={styles.preco} numberOfLines={1} adjustsFontSizeToFit>
        {preco}
      </Text>
      <Text variant="Caption/Regular 12" tone="tertiary" numberOfLines={1}>
        {periodo}
      </Text>
      {etiqueta ? (
        // A etiqueta pode passar das bordas do card (em telas estreitas o card tem ~110 px e o texto era cortado).
        <View style={styles.faixaDaEtiqueta} pointerEvents="none">
          <View style={styles.etiqueta}>
            <Text variant="Caption/Strong 12" style={styles.textoDaEtiqueta} numberOfLines={1}>
              {etiqueta}
            </Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Pontos de página: o atual é um traço amarelo. */
export function IndicadorDePaginas({ total, atual }: { total: number; atual: number }) {
  return (
    <View style={styles.indicador} accessible accessibilityRole="adjustable" accessibilityValue={{ min: 1, max: total, now: atual + 1 }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.ponto, i === atual && styles.pontoAtual]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  plano: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 140,
    borderRadius: radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
    paddingHorizontal: space[6],
  },
  normal: { backgroundColor: C.surface.default, borderWidth: 1, borderColor: C.border.default },
  selecionado: { backgroundColor: C.accent.subtle, borderWidth: 2, borderColor: C.accent.default },
  preco: { fontSize: 20, lineHeight: 26 },
  faixaDaEtiqueta: { position: 'absolute', top: -13, left: -space[24], right: -space[24], alignItems: 'center' },
  etiqueta: {
    backgroundColor: C.accent.default,
    borderRadius: radius.full,
    paddingHorizontal: space[8],
    paddingVertical: 3,
  },
  textoDaEtiqueta: { color: C.accent.on, fontSize: 11, lineHeight: 14 },
  indicador: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  ponto: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.surface.track },
  pontoAtual: { width: 18, backgroundColor: C.accent.default },
});
