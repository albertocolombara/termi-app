/** Seções e linhas das telas 07 · Ajustes, Sobre & Ajuda (Figma v4 Clean: lista limpa com hairlines, sem caixas). */
import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { color, haptic, Icon, space, Text, Toggle } from '@/ds';

export function Secao({ titulo, comTopo, children }: { titulo?: string; comTopo?: boolean; children: ReactNode }) {
  const linhas = Children.toArray(children).filter(Boolean);
  return (
    <View>
      {titulo ? (
        <View style={styles.cabecalho}>
          <Text variant="Caption/Medium 12" tone="tertiary" accessibilityRole="header">
            {titulo}
          </Text>
        </View>
      ) : null}
      {comTopo ? <View style={styles.divisor} /> : null}
      <View>
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
      <Text variant="Body/Large Medium 16" style={styles.tituloLinha}>
        {titulo}
      </Text>
      {descricao ? (
        <Text variant="Caption/Regular 12" tone="tertiary" style={styles.descricaoLinha}>
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
      onPress={() => {
        haptic.selecao();
        onMudar(!valor);
      }}
      style={({ pressed }) => [styles.linha, pressed && { opacity: 0.8 }]}
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
      style={({ pressed }) => [styles.linha, pressed && { opacity: 0.8 }]}
    >
      <Textos titulo={titulo} descricao={descricao} />
      {valor ? (
        <Text variant="Body/Small 13" tone="tertiary">
          {valor}
        </Text>
      ) : null}
      <Icon name="chevronRight" size={16} color={color.text.tertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cabecalho: { paddingBottom: space[4] },
  divisor: { height: StyleSheet.hairlineWidth, backgroundColor: color.border.subtle },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[10], minHeight: 48, paddingVertical: 13 },
  tituloLinha: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  descricaoLinha: { fontSize: 12.5, lineHeight: 17 },
});
