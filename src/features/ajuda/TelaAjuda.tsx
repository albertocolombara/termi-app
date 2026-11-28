/**
 * M7 · Ajuda e sugestões (Figma v3). PRD: RF-47.
 * Perguntas frequentes em sanfona. O contato (e-mail e página na Play Store) ainda não existe: os
 * itens abrem um aviso honesto até o lançamento.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { cubicBezier, FadeIn, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet, Button, color, Icon, screenGutter, space, Text, TopBar } from '@/ds';
import { motion } from '@/ds/motion';
import { t, type ChaveDeTexto } from '@/i18n';

import { LinhaComValor, Secao } from '../ajustes/Grupo';

const FAQ_LAYOUT = LinearTransition.duration(200).easing(motion.easing.easeOut).reduceMotion(ReduceMotion.System);
const FAQ_ENTER = FadeIn.duration(180).reduceMotion(ReduceMotion.System);
const CHEVRON_TRANSITION = {
  transitionProperty: 'transform',
  transitionDuration: 180,
  transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
} as const;

const PERGUNTAS: [ChaveDeTexto, ChaveDeTexto][] = [
  ['ajuda.sairDoApp', 'ajuda.sairDoAppResposta'],
  ['ajuda.pousoNaoBateu', 'ajuda.pousoNaoBateuResposta'],
  ['ajuda.pausar', 'ajuda.pausarResposta'],
  ['ajuda.pousarAntes', 'ajuda.pousarAntesResposta'],
  ['ajuda.cancelarPlus', 'ajuda.cancelarPlusResposta'],
];

export function TelaAjuda() {
  const insets = useSafeAreaInsets();
  const [aberta, setAberta] = useState<number>(0);
  const [emBreve, setEmBreve] = useState(false);

  return (
    <View style={styles.tela}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[32], paddingHorizontal: screenGutter, gap: space[24] }}>
        <TopBar title={t('ajuda.titulo')} onBack={() => router.back()} />
        <View style={{ gap: space[24] }}>
          <Secao titulo={t('ajuda.perguntas')}>
            {PERGUNTAS.map(([pergunta, resposta], i) => {
              const aqui = aberta === i;
              return (
                <Animated.View key={pergunta} layout={FAQ_LAYOUT} style={{ gap: space[8], paddingVertical: 14 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: aqui }}
                    onPress={() => setAberta(aqui ? -1 : i)}
                    style={styles.pergunta}
                    hitSlop={8}
                  >
                    <Text variant="Body/Large Medium 16" style={styles.tituloPergunta}>
                      {t(pergunta)}
                    </Text>
                    <Animated.View style={[CHEVRON_TRANSITION, { transform: [{ rotate: aqui ? '-90deg' : '90deg' }] }]}>
                      <Icon name="chevronRight" size={16} color={aqui ? color.accent.default : color.text.tertiary} />
                    </Animated.View>
                  </Pressable>
                  {aqui ? (
                    <Animated.View entering={FAQ_ENTER}>
                      <Text variant="Body/Small 13" tone="secondary">
                        {t(resposta)}
                      </Text>
                    </Animated.View>
                  ) : null}
                </Animated.View>
              );
            })}
          </Secao>
          <Secao titulo={t('ajuda.faleConosco')}>
            <LinhaComValor titulo={t('ajuda.sugestao')} descricao={t('ajuda.sugestaoDescricao')} onPress={() => setEmBreve(true)} />
            <LinhaComValor titulo={t('ajuda.problema')} descricao={t('ajuda.problemaDescricao')} onPress={() => setEmBreve(true)} />
            <LinhaComValor titulo={t('ajuda.avaliar')} onPress={() => setEmBreve(true)} />
          </Secao>
        </View>
      </ScrollView>
      <BottomSheet
        visible={emBreve}
        onClose={() => setEmBreve(false)}
        title={t('ajuda.contatoEmBreveTitulo')}
        subtitle={t('ajuda.contatoEmBreveTexto')}
        footer={<Button size="medium" icon={null} label={t('ajuda.entendi')} onPress={() => setEmBreve(false)} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app },
  pergunta: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  tituloPergunta: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '500' },
});
