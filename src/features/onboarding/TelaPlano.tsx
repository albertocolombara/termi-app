/**
 * OB6 · Montando seu plano de voo (Figma 579:8987). Reaproveita o embarque (fundo de voo, Termi,
 * título, barra e etapas), com outra animação do Termi: olha o papel, faz as contas e fecha a mala.
 * Avança sozinha para o OB7. Tocar pula; com "reduzir movimento", tudo aparece pronto (CLAUDE.md §9).
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAjustes } from '@/data/preferencias/ajustes';
import { useOnboarding } from '@/data/preferencias/onboarding';
import { planoDoTempo } from '@/domain/onboarding/plano';
import { voosElegiveis } from '@/domain/voos/elegibilidade';
import { color, radius, screenGutter, space, Text } from '@/ds';
import { TermiAnimado } from '@/features/termi/TermiAnimado';
import { duracao } from '@/features/voo/formato';
import { t } from '@/i18n';

import { useVoosDoOnboarding } from './useVoosDoOnboarding';

/** Quando cada item fica pronto e quando a tela avança (ms). */
const PRONTO_EM = [1300, 2600, 4000];
const AVANCA_EM = 5200;

export function TelaPlano() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduzir = useReducedMotion();
  const categorias = useOnboarding((s) => s.categorias);
  const tempo = useOnboarding((s) => s.tempo);
  const intervalo = useAjustes((s) => s.servicoDeBordo);
  const { voos, consultadoEm } = useVoosDoOnboarding(60_000);
  const { tempoMin } = planoDoTempo(tempo);
  const encontrados = useMemo(() => voosElegiveis(voos, tempoMin, consultadoEm, 'economica').length, [voos, tempoMin, consultadoEm]);

  const [prontos, setProntos] = useState(reduzir ? 3 : 0);
  const avancar = () => router.replace('/onboarding/30-dias');

  useEffect(() => {
    const ids = reduzir ? [] : PRONTO_EM.map((ms, i) => setTimeout(() => setProntos(i + 1), ms));
    ids.push(setTimeout(avancar, reduzir ? 1800 : AVANCA_EM));
    return () => ids.forEach(clearTimeout);
  }, [reduzir]);

  const progresso = useSharedValue(reduzir ? 1 : 0);
  useEffect(() => {
    if (!reduzir) progresso.value = withTiming(1, { duration: PRONTO_EM[2], easing: Easing.inOut(Easing.quad) });
  }, [progresso, reduzir]);
  const barra = useAnimatedStyle(() => ({ width: `${progresso.value * 100}%` }));

  const lista = categorias.map((c) => t(`motivo.categorias.${c}`));
  const nomes = lista.length > 1 ? `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}` : (lista[0] ?? '');
  const itens = [
    lista.length === 0 ? t('onboarding.semCategoria') : t(lista.length > 1 ? 'onboarding.comoCategorias' : 'onboarding.comoCategoria', { lista: nomes }),
    intervalo === 'desligado' ? null : t('onboarding.servicoACada', { min: intervalo }),
    prontos >= 3
      ? encontrados > 0
        ? t('onboarding.voosEncontrados', { n: encontrados, tempo: duracao(tempoMin) })
        : t('onboarding.voosNoDial', { tempo: duracao(tempoMin) })
      : t('onboarding.buscandoVoos', { tempo: duracao(tempoMin) }),
  ];
  const tamanho = Math.min(300, width - 2 * screenGutter);

  return (
    <Pressable
      style={[styles.tela, { paddingTop: insets.top + space[40], paddingBottom: insets.bottom + space[24] }]}
      onPress={avancar}
      accessibilityHint={t('embarque.pularAnimacao')}
    >
      <View style={styles.espacoDoTermi}>
        <TermiAnimado planejando pensando tamanho={tamanho} rotulo={t('onboarding.termiPlanejando')} />
      </View>

      <View style={{ gap: space[16], paddingHorizontal: space[40] }}>
        <Text variant="Heading/Sheet 22" style={{ textAlign: 'center' }} accessibilityRole="header">
          {t('onboarding.montandoTitulo')}
        </Text>
        <View style={styles.trilho} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 3, now: prontos }}>
          <Animated.View style={[styles.barra, barra]} />
        </View>
        <View style={{ gap: space[10] }} accessibilityLiveRegion="polite">
          {itens.map((texto, i) =>
            texto ? (
              <Item key={i} pronto={prontos > i} texto={texto} />
            ) : null,
          )}
        </View>
      </View>

      <Text variant="Body/Medium 14" tone="tertiary" style={styles.rodape}>
        {t('onboarding.esseEOTermi')}
      </Text>
    </Pressable>
  );
}

function Item({ pronto, texto }: { pronto: boolean; texto: string }) {
  return (
    <View style={styles.item} accessible accessibilityLabel={texto} accessibilityState={{ busy: !pronto }}>
      {pronto ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <Text variant="Label/Strong 14" style={[styles.marca, { color: color.status.success }]}>
            ✓
          </Text>
        </Animated.View>
      ) : (
        <Text variant="Label/Strong 14" tone="muted" style={styles.marca}>
          …
        </Text>
      )}
      <Text variant="Body/Medium 14" tone={pronto ? 'primary' : 'muted'} style={{ flex: 1 }}>
        {texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.flight, gap: space[24] },
  espacoDoTermi: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  trilho: { height: 3, borderRadius: radius.full, backgroundColor: color.surface.default, overflow: 'hidden' },
  barra: { height: 3, borderRadius: radius.full, backgroundColor: color.accent.default },
  item: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  marca: { width: 20 },
  rodape: { textAlign: 'center', paddingHorizontal: screenGutter, paddingTop: space[24] },
});
