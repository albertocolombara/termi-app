/** Seções e linhas da tela de Ajustes (Figma M5: "Seção · …", "Linha"). */
import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { color, Icon, radius, space, Text, Toggle } from '@/ds';

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  const linhas = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: space[8] }}>
      <Text variant="Caption/Medium 12" tone="tertiary" style={{ letterSpacing: 0.6, textTransform: 'uppercase' }} accessibilityRole="header">
        {titulo}
      </Text>
      <View style={styles.grupo}>
        {linhas.map((l, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={styles.divisor} /> : null}
            {l}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

function Textos({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <View style={{ flex: 1, gap: space[2] }}>
      <Text variant="Body/Large Medium 16">{titulo}</Text>
      {descricao ? (
        <Text variant="Body/Small 13" tone="tertiary">
          {descricao}
        </Text>
      ) : null}
    </View>
  );
}

export function LinhaComInterruptor({ titulo, descricao, valor, onMudar }: { titulo: string; descricao?: string; valor: boolean; onMudar: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: valor }}
      accessibilityLabel={titulo}
      accessibilityHint={descricao}
      onPress={() => onMudar(!valor)}
      style={({ pressed }) => [styles.linha, pressed && { opacity: 0.85 }]}
    >
      <Textos titulo={titulo} descricao={descricao} />
      <View importantForAccessibility="no-hide-descendants" pointerEvents="none">
        <Toggle value={valor} />
      </View>
    </Pressable>
  );
}

export function LinhaComValor({ titulo, descricao, valor, onPress }: { titulo: string; descricao?: string; valor?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={valor ? `${titulo}, ${valor}` : titulo}
      accessibilityHint={descricao}
      onPress={onPress}
      style={({ pressed }) => [styles.linha, pressed && { opacity: 0.85 }]}
    >
      <Textos titulo={titulo} descricao={descricao} />
      {valor ? (
        <Text variant="Body/Medium 14" tone="tertiary">
          {valor}
        </Text>
      ) : null}
      <Icon name="chevronRight" size={20} color={color.text.tertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grupo: { backgroundColor: color.surface.default, borderRadius: radius.xl, paddingHorizontal: space[16], paddingVertical: space[4] },
  divisor: { height: StyleSheet.hairlineWidth, backgroundColor: color.border.subtle },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[12], minHeight: 56, paddingVertical: space[12] },
});
