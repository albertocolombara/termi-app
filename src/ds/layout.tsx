/** Navegação e estrutura (Figma: seção 09). */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { t } from '@/i18n';
import { motion, project, rubberband } from './motion';
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
  /** Saldo em $ à direita (Figma v3: "Saldo" na mala e na loja), já formatado. */
  saldo?: string;
  /** Rótulo de acessibilidade do saldo. */
  saldoAcessivel?: string;
};

export function TopBar({ title, onBack, time, step, saldo, saldoAcessivel }: TopBarProps) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={title === t('comum.voltar') ? title : t('comum.voltarDaTela', { tela: title })} hitSlop={hitSlop} onPress={onBack} style={styles.back}>
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
        {saldo ? (
          <View style={styles.saldo} accessible accessibilityLabel={saldoAcessivel ?? saldo}>
            <Text variant="Label/Strong 14" tone="accent">{saldo}</Text>
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
  /** Ícone à esquerda do título (Figma v3: folha do serviço de bordo). */
  icone?: React.ReactNode;
  subtitle?: string;
  children?: React.ReactNode;
  /** Ação fixa no rodapé (normalmente um <Button size="medium" />). */
  footer?: React.ReactNode;
  /** Altura máxima da sheet (padrão 94% da tela). Mais curta deixa scrim à vista para fechar tocando fora. */
  alturaMaxima?: DimensionValue;
};

/**
 * Sheet com alça, cabeçalho e conteúdo, sobre um scrim. Toque no scrim ou "voltar" fecha.
 *
 * A animação é feita à mão (translateY com withTiming) em vez das animações de layout: o Modal
 * continua montado até a sheet terminar de descer, então a saída aparece inteira. O fundo da sheet
 * continua abaixo da borda da tela, para nunca aparecer um vão embaixo dela.
 */
export function BottomSheet({ visible, onClose, title, icone, subtitle, children, footer, alturaMaxima }: BottomSheetProps) {
  // A barra de navegação do Android (gestos ou 3 botões) fica por cima da sheet: o rodapé sobe a altura dela.
  const insets = useSafeAreaInsets();
  const { height: alturaDaTela } = useWindowDimensions();
  const [montada, setMontada] = useState(visible);
  if (visible && !montada) setMontada(true);

  const deslocamento = useSharedValue(alturaDaTela);
  const contexto = useSharedValue(0);
  const alturaDaSheet = useSharedValue(alturaDaTela * 0.6);

  useEffect(() => {
    if (!montada) return;
    if (visible) {
      deslocamento.set(withSpring(0, motion.spring.sheet));
    } else {
      deslocamento.set(
        withSpring(alturaDaTela, motion.spring.sheetDismiss, (terminou) => {
          if (terminou) scheduleOnRN(setMontada, false);
        }),
      );
    }
  }, [visible, montada, alturaDaTela, deslocamento]);

  const pan = usePanGesture({
    activeOffsetY: 10,
    onActivate: () => {
      'worklet';
      contexto.set(deslocamento.get());
    },
    onUpdate: (e) => {
      'worklet';
      const proximo = contexto.get() + e.translationY;
      deslocamento.set(proximo >= 0 ? proximo : rubberband(proximo, alturaDaSheet.get()));
    },
    onDeactivate: (e) => {
      'worklet';
      const h = alturaDaSheet.get();
      const projetado = deslocamento.get() + project(e.velocityY);
      if (projetado > h * 0.4) {
        deslocamento.set(
          withSpring(alturaDaTela, { ...motion.spring.sheetDismiss, velocity: e.velocityY }, (terminou) => {
            if (terminou) scheduleOnRN(onClose);
          }),
        );
      } else {
        deslocamento.set(withSpring(0, { ...motion.spring.sheet, velocity: e.velocityY }));
      }
    },
  });

  const estiloDaSheet = useAnimatedStyle(() => ({ transform: [{ translateY: deslocamento.get() }] }));
  const estiloDoScrim = useAnimatedStyle(() => ({
    opacity: interpolate(deslocamento.get(), [0, Math.max(1, alturaDaSheet.get())], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <Modal visible={montada} transparent statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* O teclado empurra a sheet para cima; o conteúdo rola se não couber. */}
        <KeyboardAvoidingView behavior="padding" style={styles.sheetRoot}>
          <Animated.View style={[StyleSheet.absoluteFill, estiloDoScrim]}>
            <Pressable accessibilityLabel={t('comum.fechar')} style={[StyleSheet.absoluteFill, { backgroundColor: C.bg.scrim }]} onPress={onClose} />
          </Animated.View>
          <Animated.View
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h > 0) alturaDaSheet.set(h);
            }}
            style={[styles.sheet, { paddingBottom: insets.bottom + space[24] }, alturaMaxima !== undefined && { maxHeight: alturaMaxima }, estiloDaSheet]}
          >
            <View style={styles.sheetAbaixo} />
            <GestureDetector gesture={pan}>
              <View style={{ gap: space[12] }}>
                <View style={styles.handle} />
                <View style={{ gap: space[4] }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[12] }}>
                    {icone}
                    <Text variant="Heading/Sheet 22" accessibilityRole="header" style={{ flexShrink: 1 }}>
                      {title}
                    </Text>
                  </View>
                  {subtitle ? (
                    <Text variant="Body/Medium 14" tone="tertiary">
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>
            </GestureDetector>
            {children ? (
              <ScrollView style={styles.sheetBody} contentContainerStyle={{ gap: space[4] }} keyboardShouldPersistTaps="handled" bounces={false}>
                {children}
              </ScrollView>
            ) : null}
            {footer}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
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
  saldo: { paddingVertical: space[6], paddingHorizontal: space[12], borderRadius: radius.full, backgroundColor: C.accent.badge },
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
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border.subtle,
    paddingTop: space[12],
    paddingHorizontal: space[16],
    gap: space[16],
    maxHeight: '94%',
  },
  sheetBody: { flexGrow: 0, flexShrink: 1 },
  // Continuação do fundo abaixo da borda inferior da tela.
  sheetAbaixo: { position: 'absolute', top: '100%', left: 0, right: 0, height: 400, backgroundColor: C.bg.sheet },
  // Alça centralizada no topo, como no Material Design 3.
  handle: { width: 36, height: 4, borderRadius: radius.full, backgroundColor: C.surface.track, alignSelf: 'center' },
});
