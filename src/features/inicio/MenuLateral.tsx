/**
 * Menu lateral (Figma v3: "Menu lateral / Drawer", Classe = Econômica e Plus). Abre pelo avatar do Início.
 * PRD: RF-08. Perfil com o status de viajante (RN-15), seu progresso, conta e app.
 *
 * Na econômica aparece o item "Termi Plus" (abre o paywall, RN-20); no Plus ele dá lugar a
 * "Gerenciar assinatura" (Figma 239:7335). As milhas abrem a tela de progressão (/milhas).
 */
import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, type Href } from 'expo-router';
import Constants from 'expo-constants';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { mostrarFerramentasDev } from '@/config/env';
import { Avatar, BottomSheet, Button, color, fontFamily, Icon, Plus, radius, space, Text, type IconName } from '@/ds';
import { motion, project, rubberband } from '@/ds/motion';
import { statusDeViajante } from '@/domain/status/niveis';
import { t } from '@/i18n';
import type { Classe } from '@/domain/sessao/duracao';

const LARGURA = 320;

type Props = {
  visivel: boolean;
  onFechar: () => void;
  classe: Classe;
  milhas: number;
  souvenirs: number;
  carimbos: number;
};

export function MenuLateral({ visivel, onFechar, classe, milhas, souvenirs, carimbos }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const largura = Math.min(LARGURA, width - 56);
  const [montado, setMontado] = useState(visivel);
  if (visivel && !montado) setMontado(true);
  const [contaEmBreve, setContaEmBreve] = useState(false);

  const x = useSharedValue(-largura);
  const contexto = useSharedValue(0);
  useEffect(() => {
    if (!montado) return;
    if (visivel) {
      x.set(withSpring(0, motion.spring.sheet));
    } else {
      x.set(
        withSpring(-largura, motion.spring.sheetDismiss, (fim) => {
          if (fim) scheduleOnRN(setMontado, false);
        }),
      );
    }
  }, [visivel, montado, largura, x]);

  const pan = usePanGesture({
    activeOffsetX: [-10, 10],
    onActivate: () => {
      'worklet';
      contexto.set(x.get());
    },
    onUpdate: (e) => {
      'worklet';
      const proximo = contexto.get() + e.translationX;
      x.set(proximo <= 0 ? proximo : rubberband(proximo, largura));
    },
    onDeactivate: (e) => {
      'worklet';
      const projetado = x.get() + project(e.velocityX);
      if (projetado < -largura * 0.35) {
        x.set(
          withSpring(-largura, { ...motion.spring.sheetDismiss, velocity: e.velocityX }, (fim) => {
            if (fim) scheduleOnRN(onFechar);
          }),
        );
      } else {
        x.set(withSpring(0, { ...motion.spring.sheet, velocity: e.velocityX }));
      }
    },
  });

  const estiloDoMenu = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const estiloDoScrim = useAnimatedStyle(() => ({
    opacity: interpolate(x.get(), [-largura, 0], [0, 1], Extrapolation.CLAMP),
  }));

  const status = statusDeViajante(milhas);
  const plus = classe === 'primeira';
  const ir = (rota: Href) => {
    onFechar();
    router.push(rota);
  };
  // A assinatura é da Google Play: gerenciar abre a página de assinaturas da loja para este app.
  const gerenciarAssinatura = () => {
    const pacote = Constants.expoConfig?.android?.package;
    Linking.openURL(`https://play.google.com/store/account/subscriptions${pacote ? `?package=${pacote}` : ''}`).catch(() => {});
  };

  return (
    <Modal visible={montado} transparent statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onFechar}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, estiloDoScrim]}>
          <Pressable accessibilityLabel={t('menu.fechar')} style={[StyleSheet.absoluteFill, { backgroundColor: color.bg.scrim }]} onPress={onFechar} />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.menu, { width: largura }, estiloDoMenu]} accessibilityViewIsModal>
        <ScrollView
          contentContainerStyle={[styles.conteudo, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[32] }]}
          bounces={false}
        >
          <View style={{ gap: space[32] }}>
            {/* Perfil e status de viajante */}
            <View style={{ gap: space[12] }}>
              <View style={styles.perfil}>
                <Avatar tamanho="grande" />
                <View style={{ flex: 1, gap: space[6] }}>
                  <Text variant="Heading/Sheet 22">{status.atual.nome}</Text>
                  {plus ? (
                    <Plus />
                  ) : (
                    <View style={styles.classe}>
                      <Text variant="Body/Small 13" tone="muted">
                        {t('menu.economica')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityHint={t('menu.verProgressao')}
                onPress={() => ir('/milhas')}
                style={({ pressed }) => [{ gap: space[8], paddingVertical: space[4] }, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.linhaDasMilhas}>
                  <Text variant="Body/Small 13" tone="tertiary">
                    {t('menu.milhasAcumuladas', { milhas: milhas.toLocaleString('pt-BR') })}
                  </Text>
                  <Icon name="chevronRight" size={16} />
                </View>
                <View style={styles.trilho} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(status.progresso * 100) }}>
                  <View style={[styles.barra, { width: `${Math.round(status.progresso * 100)}%` }]} />
                </View>
                <Text variant="Body/Small 13" tone="secondary">
                  {status.proximo
                    ? t('menu.faltam', { milhas: status.faltam.toLocaleString('pt-BR'), nivel: status.proximo.nome })
                    : t('menu.nivelMaximo')}
                </Text>
              </Pressable>
            </View>

            <View style={{ gap: space[8] }}>
              <Secao titulo={t('menu.seuProgresso')}>
                <Item
                  icone="suitcaseLine"
                  titulo={t('menu.suaMala')}
                  detalhe={souvenirs ? (souvenirs === 1 ? t('menu.umSouvenir') : t('menu.souvenirs', { n: souvenirs })) : undefined}
                  onPress={() => ir('/mala')}
                />
                <Item
                  icone="passport"
                  titulo={t('menu.passaporte')}
                  detalhe={carimbos ? (carimbos === 1 ? t('menu.umCarimbo') : t('menu.carimbos', { n: carimbos })) : undefined}
                  onPress={() => ir('/passaporte')}
                />
                <Item icone="logbook" titulo={t('menu.diarioDeBordo')} onPress={() => ir('/diario')} />
                <Item icone="stats" titulo={t('menu.estatisticas')} onPress={() => ir('/estatisticas')} />
              </Secao>

              <Secao titulo={t('menu.contaECompras')}>
                <Item
                  icone="userAdd"
                  titulo={plus ? t('menu.criarConta') : t('menu.criarContaESincronizar')}
                  descricao={t('menu.salveSeuProgresso')}
                  onPress={() => setContaEmBreve(true)}
                />
                {plus ? (
                  <Item icone="gerenciarAssinatura" titulo={t('menu.gerenciarAssinatura')} onPress={gerenciarAssinatura} />
                ) : (
                  <Item icone="plus" titulo={t('menu.termiPlus')} descricao={t('menu.termiPlusDescricao')} plus onPress={() => ir('/primeira-classe')} />
                )}
              </Secao>
              <Secao titulo={t('menu.app')}>
                <Item icone="settings" titulo={t('menu.ajustes')} onPress={() => ir('/ajustes')} />
                <Item icone="info" titulo={t('menu.sobre')} onPress={() => ir('/sobre')} />
                <Item icone="help" titulo={t('menu.ajuda')} onPress={() => ir('/ajuda')} />
              </Secao>

              {mostrarFerramentasDev ? (
                <Secao titulo={t('inicio.ferramentas')}>
                  <Item icone="settings" titulo={t('inicio.ferramentas')} onPress={() => ir('/dev')} />
                </Secao>
              ) : null}
            </View>
          </View>

          <Text variant="Caption/Regular 12" tone="muted" style={{ marginTop: space[24] }}>
            {t('menu.versao', { versao: Constants.expoConfig?.version ?? '' })}
          </Text>
        </ScrollView>
      </Animated.View>
        </GestureDetector>

      <BottomSheet
        visible={contaEmBreve}
        onClose={() => setContaEmBreve(false)}
        title={t('menu.contaEmBreveTitulo')}
        subtitle={t('menu.contaEmBreveTexto')}
        footer={<Button size="medium" icon={null} label={t('menu.entendi')} onPress={() => setContaEmBreve(false)} />}
      />
      </GestureHandlerRootView>
    </Modal>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space[4] }}>
      <Text variant="Caption/Medium 12" tone="muted" accessibilityRole="header">
        {titulo}
      </Text>
      <View>{children}</View>
    </View>
  );
}

/** Figma: "Menu lateral / Item" (Tipo = Padrão, Vertical e Plus). */
function Item({
  icone,
  titulo,
  detalhe,
  descricao,
  plus,
  onPress,
}: {
  icone: IconName;
  titulo: string;
  detalhe?: string;
  descricao?: string;
  plus?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[titulo, detalhe, descricao].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [styles.item, descricao ? styles.itemVertical : null, pressed && { backgroundColor: color.surface.default }]}
    >
      <Icon name={icone} />
      <View style={{ flex: 1, gap: space[2] }}>
        <Text variant="Body/Large 16" style={plus ? styles.tituloPlus : undefined}>
          {titulo}
        </Text>
        {descricao ? (
          <Text variant="Caption/Regular 12" tone="tertiary">
            {descricao}
          </Text>
        ) : null}
      </View>
      {detalhe ? (
        <Text variant="Caption/Regular 12" tone="tertiary">
          {detalhe}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menu: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: color.bg.system },
  conteudo: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: space[16] },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  classe: {
    alignSelf: 'flex-start',
    paddingVertical: space[2],
    paddingHorizontal: space[10],
    borderRadius: radius.full,
    backgroundColor: color.surface.subtle,
  },
  linhaDasMilhas: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  trilho: { height: 3, borderRadius: radius.full, backgroundColor: color.surface.default, overflow: 'hidden' },
  barra: { height: 3, borderRadius: radius.full, backgroundColor: color.accent.default },
  item: { flexDirection: 'row', alignItems: 'center', gap: space[14], padding: space[12], borderRadius: radius.lg, minHeight: 48 },
  itemVertical: { paddingVertical: space[8] },
  tituloPlus: { fontFamily: fontFamily.pixel, fontWeight: '400', letterSpacing: 0, color: color.text.accent },
});
