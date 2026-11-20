/** Navegação e estrutura (Figma: seção 09). */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { motion } from './motion';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { color as C, hitSlop, radius, space } from './tokens';

// ───────── Step progress ─────────
/** Progresso do fluxo de embarque em etapas (padrão: 3 — Tempo → Partidas → Cartão). */
export function StepProgress({ step, total = 3, style }: { step: number; total?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[styles.progress, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: step }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.progressBar, { backgroundColor: i < step ? C.accent.default : C.surface.inverse }]} />
      ))}
    </View>
  );
}

// ───────── Top bar ─────────
export type TopBarProps = {
  /** Nome da etapa anterior, ao lado da seta de voltar. */
  title: string;
  onBack?: () => void;
  /** Tempo de foco escolhido (ex.: "50min"). Omitir esconde. */
  time?: string;
  /** Etapa atual do fluxo; omitir esconde o progresso. */
  step?: number;
};

export function TopBar({ title, onBack, time, step }: TopBarProps) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Voltar para ${title}`} hitSlop={hitSlop} onPress={onBack} style={styles.back}>
          <Icon name="arrowLeft" />
          <Text variant="Nav/Title 20">{title}</Text>
        </Pressable>
        {time ? (
          <View style={styles.time}>
            <Icon name="timer" />
            <Text variant="Body/Large 16" tone="tertiary">
              {time}
            </Text>
          </View>
        ) : null}
      </View>
      {step ? <StepProgress step={step} /> : null}
    </View>
  );
}

// ───────── Section header ─────────
/** Faixa amarela de painel de aeroporto para títulos de lista (ex.: Partidas). Ocupa a largura da tela. */
export function SectionHeader({ title, icon = 'departures' }: { title: string; icon?: IconName }) {
  return (
    <View style={styles.sectionHeader} accessibilityRole="header">
      <View style={styles.sectionIcon}>
        <Icon name={icon} size={24} />
      </View>
      <Text variant="Heading/Screen 32" tone="onAccent">
        {title}
      </Text>
    </View>
  );
}

// ───────── Bottom sheet ─────────
export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  /** Ação fixa no rodapé (normalmente um <Button size="medium" />). */
  footer?: React.ReactNode;
};

/**
 * Sheet com alça, cabeçalho e conteúdo, sobre um scrim. Toque no scrim ou "voltar" fecha.
 *
 * A animação é feita à mão (translateY com withTiming) em vez das animações de layout: o Modal
 * continua montado até a sheet terminar de descer, então a saída aparece inteira. O fundo da sheet
 * continua abaixo da borda da tela, para nunca aparecer um vão embaixo dela.
 */
export function BottomSheet({ visible, onClose, title, subtitle, children, footer }: BottomSheetProps) {
  // A barra de navegação do Android (gestos ou 3 botões) fica por cima da sheet: o rodapé sobe a altura dela.
  const insets = useSafeAreaInsets();
  const { height: alturaDaTela } = useWindowDimensions();
  const [montada, setMontada] = useState(visible);
  if (visible && !montada) setMontada(true);

  const deslocamento = useSharedValue(alturaDaTela);
  const scrim = useSharedValue(0);

  useEffect(() => {
    if (!montada) return;
    if (visible) {
      deslocamento.set(
        withTiming(0, { duration: motion.duration.medium4, easing: motion.easing.emphasizedDecelerate, reduceMotion: ReduceMotion.System }),
      );
      scrim.set(withTiming(1, { duration: motion.duration.short4, reduceMotion: ReduceMotion.System }));
    } else {
      scrim.set(withTiming(0, { duration: motion.duration.medium2, reduceMotion: ReduceMotion.System }));
      deslocamento.set(
        withTiming(
          alturaDaTela,
          { duration: motion.duration.medium2, easing: motion.easing.emphasizedAccelerate, reduceMotion: ReduceMotion.System },
          (terminou) => {
            if (terminou) scheduleOnRN(setMontada, false);
          },
        ),
      );
    }
  }, [visible, montada, alturaDaTela, deslocamento, scrim]);

  const estiloDaSheet = useAnimatedStyle(() => ({ transform: [{ translateY: deslocamento.get() }] }));
  const estiloDoScrim = useAnimatedStyle(() => ({ opacity: scrim.get() }));

  return (
    <Modal visible={montada} transparent statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      {/* O teclado empurra a sheet para cima; o conteúdo rola se não couber. */}
      <KeyboardAvoidingView behavior="padding" style={styles.sheetRoot}>
        <Animated.View style={[StyleSheet.absoluteFill, estiloDoScrim]}>
          <Pressable accessibilityLabel="Fechar" style={[StyleSheet.absoluteFill, { backgroundColor: C.bg.scrim }]} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + space[24] }, estiloDaSheet]}>
          <View style={styles.sheetAbaixo} />
          <View style={styles.handle} />
          <View style={{ gap: space[4] }}>
            <Text variant="Heading/Sheet 22" accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="Body/Medium 14" tone="tertiary">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {children ? (
            <ScrollView style={styles.sheetBody} contentContainerStyle={{ gap: space[4] }} keyboardShouldPersistTaps="handled" bounces={false}>
              {children}
            </ScrollView>
          ) : null}
          {footer}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: space[10] },
  progressBar: { flex: 1, height: 2 },
  topBar: { gap: space[20] },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  time: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[14],
    paddingVertical: space[12],
    paddingHorizontal: space[16],
    backgroundColor: C.accent.default,
  },
  sectionIcon: { width: 32, height: 32, backgroundColor: C.accent.on, alignItems: 'center', justifyContent: 'center' },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.bg.sheet,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingTop: space[12],
    paddingHorizontal: space[16],
    gap: space[16],
    maxHeight: '94%',
  },
  sheetBody: { flexGrow: 0, flexShrink: 1 },
  // Continuação do fundo abaixo da borda inferior da tela.
  sheetAbaixo: { position: 'absolute', top: '100%', left: 0, right: 0, height: 400, backgroundColor: C.bg.sheet },
  // Alça centralizada no topo, como no Material Design 3.
  handle: { width: 40, height: 4, borderRadius: radius.xs, backgroundColor: C.surface.track, alignSelf: 'center' },
});
