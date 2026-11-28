/** Seções e linhas das telas 07 · Ajustes, Sobre & Ajuda (Figma v4 Clean: lista limpa com hairlines, sem caixas). */
import { Children, Fragment, useMemo, useState, type ReactNode } from 'react';
import { PanResponder, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { color, haptic, Icon, radius, space, Text, Toggle } from '@/ds';

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

/** Scrubber de volume 1:1 (Figma M5 · Ajustes · Clean): barra larga de 42dp com preenchimento suave, pino branco e porcentagem à direita. */
export function ScrubberDeVolume({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [largura, setLargura] = useState(0);
  const v = Math.min(1, Math.max(0, value));
  const pan = useMemo(() => {
    const emitir = (x: number) => {
      if (largura > 0) onChange(Math.min(1, Math.max(0, x / largura)));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => emitir(e.nativeEvent.locationX),
      onPanResponderMove: (e) => emitir(e.nativeEvent.locationX),
    });
  }, [largura, onChange]);

  const onLayout = (e: LayoutChangeEvent) => setLargura(e.nativeEvent.layout.width);
  const preenchido = largura * v;

  return (
    <View style={styles.scrubberBloco}>
      <Text variant="Caption/Regular 12" tone="tertiary">
        {label}
      </Text>
      <View
        onLayout={onLayout}
        style={styles.scrubberTrilho}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
        {...pan.panHandlers}
      >
        <View pointerEvents="none" style={[styles.scrubberFill, { width: preenchido }]}>
          {preenchido >= 18 ? <View style={styles.scrubberPino} /> : null}
        </View>
        <View pointerEvents="none" style={styles.scrubberPct}>
          <Text variant="Caption/Medium 12" tone="secondary">
            {`${Math.round(v * 100)}%`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: { paddingBottom: space[4] },
  divisor: { height: StyleSheet.hairlineWidth, backgroundColor: color.border.subtle },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[10], minHeight: 48, paddingVertical: 13 },
  tituloLinha: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  descricaoLinha: { fontSize: 12.5, lineHeight: 17 },
  scrubberBloco: { gap: space[8], paddingVertical: space[12] },
  scrubberTrilho: {
    height: 42,
    borderRadius: radius.cta,
    backgroundColor: color.surface.card,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  scrubberFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  scrubberPino: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: color.text.primary,
  },
  scrubberPct: {
    position: 'absolute',
    right: 14,
  },
});
