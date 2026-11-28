/**
 * OB6 · Montando seu plano de voo (Figma 579:8987). Reaproveita o embarque (fundo de voo, Termi,
 * título, barra e etapas), com outra animação do Termi: olha o papel, faz as contas e fecha a mala.
 * Avança sozinha para o OB7. Tocar pula; com "reduzir movimento", tudo aparece pronto (CLAUDE.md §9).
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAjustes } from '@/data/preferencias/ajustes';
import { useOnboarding } from '@/data/preferencias/onboarding';
import { planoDoTempo } from '@/domain/onboarding/plano';
import { voosElegiveis } from '@/domain/voos/elegibilidade';
import { color, radius, screenGutter, space, Text } from '@/ds';
import { TermiAnimado } from '@/features/termi/TermiAnimado';
import { duracao } from '@/features/voo/formato';
import { CartaoDeEtapas, type EstadoDaEtapa } from '@/features/voo/TelaEmbarque';
import { t } from '@/i18n';

import { useVoosDoOnboarding } from './useVoosDoOnboarding';

/** Quando cada item fica pronto e quando a tela avança (ms). */
const PRONTO_EM = [1300, 2600, 4000];
const AVANCA_EM = 5200;
const TERMI_MAX = 300;
const TERMI_MIN = 140;

export function TelaPlano() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [espacoDoTermi, setEspacoDoTermi] = useState(0);
  const reduzir = useReducedMotion();
  const categorias = useOnboarding((s) => s.categorias);
  const tempo = useOnboarding((s) => s.tempo);
  const intervalo = useAjustes((s) => s.servicoDeBordo);
  const { voos, consultadoEm } = useVoosDoOnboarding(60_000);
  const { tempoMin } = planoDoTempo(tempo);
  const encontrados = useMemo(() => voosElegiveis(voos, tempoMin, consultadoEm, 'economica').length, [voos, tempoMin, consultadoEm]);

  const lista = categorias.map((c) => t(`motivo.categorias.${c}`));
  const nomes = lista.length > 1 ? `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}` : (lista[0] ?? '');
  const totalEtapas = intervalo === 'desligado' ? 2 : 3;

  const [prontos, setProntos] = useState(reduzir ? totalEtapas : 0);
  const avancar = () => router.replace('/onboarding/30-dias');

  useEffect(() => {
    const tempos = PRONTO_EM.slice(0, totalEtapas);
    const ids = reduzir ? [] : tempos.map((ms, i) => setTimeout(() => setProntos(i + 1), ms));
    ids.push(setTimeout(avancar, reduzir ? 1800 : AVANCA_EM));
    return () => ids.forEach(clearTimeout);
  }, [reduzir, totalEtapas]);

  const progresso = useSharedValue(reduzir ? 1 : 0);
  useEffect(() => {
    if (!reduzir) progresso.value = withTiming(1, { duration: PRONTO_EM[totalEtapas - 1], easing: Easing.inOut(Easing.quad) });
  }, [progresso, reduzir, totalEtapas]);
  const barra = useAnimatedStyle(() => ({ width: `${progresso.value * 100}%` }));

  const textos = [
    lista.length === 0 ? t('onboarding.semCategoria') : t(lista.length > 1 ? 'onboarding.comoCategorias' : 'onboarding.comoCategoria', { lista: nomes }),
    intervalo === 'desligado' ? null : t('onboarding.servicoACada', { min: intervalo }),
    prontos >= totalEtapas
      ? encontrados > 0
        ? t('onboarding.voosEncontrados', { n: encontrados, tempo: duracao(tempoMin) })
        : t('onboarding.voosNoDial', { tempo: duracao(tempoMin) })
      : t('onboarding.buscandoVoos', { tempo: duracao(tempoMin) }),
  ].filter((texto): texto is string => texto !== null);

  const etapas = textos.map((texto, i): { estado: EstadoDaEtapa; texto: string } => ({
    estado: i < prontos ? 'feita' : i === prontos ? 'atual' : 'pendente',
    texto,
  }));

  const tamanhoDoTermi = espacoDoTermi ? Math.round(Math.max(TERMI_MIN, Math.min(TERMI_MAX, width - 2 * screenGutter, espacoDoTermi))) : 0;

  return (
    <Pressable
      style={[styles.tela, { paddingTop: insets.top + space[24], paddingBottom: insets.bottom + space[24] }]}
      onPress={avancar}
      accessibilityHint={t('embarque.pularAnimacao')}
    >
      <View style={{ flex: 1, gap: space[16] }}>
        <View style={styles.espacoDoTermi} onLayout={(e) => setEspacoDoTermi(e.nativeEvent.layout.height)}>
          {tamanhoDoTermi ? (
            <TermiAnimado planejando pensando tamanho={tamanhoDoTermi} rotulo={t('onboarding.termiPlanejando')} />
          ) : null}
        </View>
        <View style={{ alignItems: 'center', gap: space[8] }}>
          <Text variant="Heading/Data 24" style={{ fontWeight: '600', textAlign: 'center' }} accessibilityRole="header">
            {t('onboarding.montandoTitulo')}
          </Text>
        </View>
      </View>

      <View style={{ gap: space[16] }}>
        <CartaoDeEtapas etapas={etapas} />
        <View style={styles.trilho} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: totalEtapas, now: prontos }}>
          <Animated.View style={[styles.barra, barra]} />
        </View>
      </View>

      <View style={styles.rodape}>
        <Text variant="Body/Medium 14" tone="tertiary" style={{ textAlign: 'center' }}>
          {t('onboarding.esseEOTermi')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.flight, paddingHorizontal: screenGutter, gap: space[16] },
  espacoDoTermi: { flex: 1, minHeight: TERMI_MIN, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  trilho: { height: 3, borderRadius: radius.full, backgroundColor: color.surface.default, overflow: 'hidden' },
  barra: { height: 3, borderRadius: radius.full, backgroundColor: color.accent.default },
  rodape: { minHeight: 48, justifyContent: 'center', paddingTop: space[16] },
});
