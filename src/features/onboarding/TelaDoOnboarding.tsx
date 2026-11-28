/**
 * Moldura comum das telas do onboarding (Figma "Onboarding · v3"): fundo do app, progresso de 3 etapas
 * nas perguntas (OB3–OB5), conteúdo e rodapé com o botão principal e, quando houver, um link embaixo.
 * O botão fica sempre na mesma altura (o espaço do link é reservado), como no Figma.
 */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, color, radius, screenGutter, space, Text } from '@/ds';
import { t } from '@/i18n';

export function TelaDoOnboarding({
  etapa,
  fundo,
  rolar = false,
  cta,
  link,
  children,
  style,
}: {
  /** Etapa das perguntas (1 a 3); omitir esconde o progresso. */
  etapa?: 1 | 2 | 3;
  /** Camada atrás do conteúdo (globo, janela). */
  fundo?: ReactNode;
  /** Conteúdo rolável (telas baixas). */
  rolar?: boolean;
  cta?: { label: string; onPress: () => void; disabled?: boolean };
  link?: { label: string; onPress: () => void };
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const conteudo = <View style={[styles.conteudo, { paddingTop: etapa ? space[32] : space[40] }, style]}>{children}</View>;
  return (
    <View style={[styles.tela, { paddingTop: insets.top + space[16] }]}>
      {fundo ? <View style={StyleSheet.absoluteFill}>{fundo}</View> : null}
      {etapa ? <Progresso etapa={etapa} /> : null}
      {rolar ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          {conteudo}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{conteudo}</View>
      )}
      {cta ? (
        <View style={[styles.rodape, { paddingBottom: insets.bottom + space[16] }]}>
          <Button label={cta.label} onPress={cta.onPress} disabled={cta.disabled} />
          <View style={styles.link}>{link ? <Button variant="link" size="small" label={link.label} onPress={link.onPress} style={{ alignSelf: 'center' }} /> : null}</View>
        </View>
      ) : null}
    </View>
  );
}

/** Progresso das perguntas (Figma "Progresso"): 3 traços, os feitos em branco. */
function Progresso({ etapa }: { etapa: number }) {
  return (
    <View
      style={styles.progresso}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('onboarding.etapa', { n: etapa })}
      accessibilityValue={{ min: 0, max: 3, now: etapa }}
    >
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.traco, { backgroundColor: i <= etapa ? color.text.primary : color.border.default }]} />
      ))}
    </View>
  );
}

/** Título e texto de apoio das telas (Heading/Screen 32 + Body/Large 16). */
export function Cabecalho({ titulo, texto }: { titulo: string; texto?: string }) {
  return (
    <View style={{ gap: space[16] }}>
      <Text variant="Heading/Screen 32" accessibilityRole="header">
        {titulo}
      </Text>
      {texto ? (
        <Text variant="Body/Large 16" tone="secondary">
          {texto}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app },
  conteudo: { flex: 1, paddingHorizontal: screenGutter },
  progresso: { flexDirection: 'row', gap: space[8], paddingHorizontal: screenGutter },
  traco: { flex: 1, height: 3, borderRadius: radius.full },
  rodape: { paddingHorizontal: screenGutter, paddingTop: space[16] },
  // Área do link "Já conheço o Termi" / "Agora não" (48 dp de toque), reservada mesmo sem link.
  link: { height: 48, marginTop: space[4], alignItems: 'center', justifyContent: 'center' },
});
