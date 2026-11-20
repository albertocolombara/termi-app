/**
 * 05 · Embarcando (carregamento) e X5 · paisagem não baixou. PRD: RF-15, RF-16; UC-02 passos 7–9, A4, A5, E1, E2; UC-03.
 * O Termi anda na esteira enquanto as etapas reais acontecem. A animação final será em Rive;
 * aqui é uma versão simples em Reanimated, que para com "reduzir movimento".
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet, Button, color, Icon, InfoBanner, radius, screenGutter, space, Suitcase, Text, type IconName } from '@/ds';
import { t } from '@/i18n';

import { codigoDoLugar, km, nomeDoLugar } from './formato';
import { useEmbarque, type EtapaDoEmbarque } from './useEmbarque';

type Estado = 'feita' | 'atual' | 'pendente';

export function TelaEmbarque({ caminhoRapido }: { caminhoRapido: boolean }) {
  const insets = useSafeAreaInsets();
  const { etapa, tentarDeNovo, embarcarComGlobo, cancelar, recomecar } = useEmbarque({ caminhoRapido });

  useEffect(() => {
    if (etapa.tipo !== 'embarcou') return;
    // Depois do embarque, "voltar" não leva ao cartão nem ao embarque.
    router.dismissTo('/');
    router.push('/voo/em-voo');
  }, [etapa.tipo]);

  const cancelarEmbarque = () => {
    cancelar();
    router.back();
  };

  if (etapa.tipo === 'voo-sumiu' || etapa.tipo === 'sem-internet') {
    return (
      <View style={[styles.tela, { paddingTop: insets.top + space[24], paddingBottom: insets.bottom + space[24] }]}>
        <InfoBanner message={etapa.tipo === 'voo-sumiu' ? t('cartao.sumiu') : t('embarque.semInternet')} />
        {etapa.tipo === 'voo-sumiu' ? (
          <Button label={t('cartao.verPartidas')} onPress={() => router.dismissTo('/voo/partidas')} />
        ) : (
          <Button label={t('embarque.tentarDeNovo')} onPress={recomecar} />
        )}
        <Button variant="link" size="medium" label={t('embarque.cancelar')} onPress={cancelarEmbarque} style={{ alignSelf: 'center' }} />
      </View>
    );
  }

  const voo = 'voo' in etapa ? etapa.voo : null;
  const progresso = progressoTotal(etapa);
  const podeCancelar = etapa.tipo === 'localizando' || etapa.tipo === 'baixando' || etapa.tipo === 'paisagem-falhou';

  return (
    <View style={[styles.tela, { paddingTop: insets.top + space[24], paddingBottom: insets.bottom + space[24] }]}>
      <View style={{ gap: space[6], minHeight: 70 }}>
        {voo ? (
          <>
            <Text variant="Label/Medium 14" tone="tertiary">
              {voo.companhiaNome ? `${voo.callsign} · ${voo.companhiaNome}` : voo.callsign}
            </Text>
            <View style={styles.rota} accessible accessibilityLabel={t('embarque.rotaAcessivel', { origem: nomeDoLugar(voo.origem), destino: nomeDoLugar(voo.destino) })}>
              <Text variant="Heading/Screen 32">{codigoDoLugar(voo.origem)}</Text>
              <Icon name="plane" size={20} color={color.accent.default} />
              <Text variant="Heading/Screen 32">{codigoDoLugar(voo.destino)}</Text>
            </View>
          </>
        ) : null}
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: space[24] }}>
        <Esteira />
        <View style={{ alignItems: 'center', gap: space[8] }}>
          <Text variant="Heading/Data 24" style={{ fontWeight: '600' }} accessibilityRole="header">
            {t('embarque.titulo')}
          </Text>
          <Text variant="Body/Medium 14" tone="tertiary" style={{ fontSize: 15 }}>
            {t('embarque.subtitulo')}
          </Text>
        </View>
      </View>

      <View style={{ gap: space[16] }}>
        <View style={styles.etapas} accessibilityLiveRegion="polite">
          <Etapa estado={estadoDa(etapa, 0)} texto={textoDaEtapa(etapa, 0)} />
          <Etapa estado={estadoDa(etapa, 1)} texto={textoDaEtapa(etapa, 1)} />
          <Etapa estado={estadoDa(etapa, 2)} texto={textoDaEtapa(etapa, 2)} />
        </View>
        <View
          style={styles.trilho}
          accessible
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progresso * 100) }}
        >
          <View style={[styles.barra, { width: `${progresso * 100}%` }]} />
        </View>
      </View>

      <View style={{ minHeight: 48, justifyContent: 'center', paddingTop: space[40] }}>
        {podeCancelar ? (
          <Button variant="secondary" size="small" label={t('embarque.cancelar')} onPress={cancelarEmbarque} style={{ alignSelf: 'center' }} />
        ) : null}
      </View>

      <BottomSheet
        visible={etapa.tipo === 'paisagem-falhou'}
        onClose={cancelarEmbarque}
        title={t('embarque.paisagemFalhouTitulo')}
        subtitle={t('embarque.paisagemFalhouTexto')}
        footer={
          <View style={{ gap: space[4] }}>
            <Button size="medium" icon={null} label={t('embarque.comGlobo')} onPress={embarcarComGlobo} />
            <Button variant="link" size="medium" label={t('embarque.tentarBaixar')} onPress={tentarDeNovo} style={{ alignSelf: 'center' }} />
          </View>
        }
      >
        <View style={styles.cartaoGlobo}>
          <Text variant="Label/Strong 14">{t('embarque.comGlobo')}</Text>
          <Text variant="Caption/Regular 12" tone="tertiary">
            {t('embarque.comGloboTexto')}
          </Text>
        </View>
      </BottomSheet>
    </View>
  );
}

function ordemDa(e: EtapaDoEmbarque): number {
  switch (e.tipo) {
    case 'localizando':
      return 0;
    case 'baixando':
    case 'paisagem-falhou':
      return 1;
    case 'preparando':
      return 2;
    default:
      return 3;
  }
}

function estadoDa(e: EtapaDoEmbarque, i: number): Estado {
  const atual = ordemDa(e);
  return i < atual ? 'feita' : i === atual ? 'atual' : 'pendente';
}

function textoDaEtapa(e: EtapaDoEmbarque, i: number): string {
  if (i === 0) {
    if (!('voo' in e)) return t('embarque.localizando');
    return t('embarque.localizado', { falta: km(e.faltaKm), cidade: nomeDoLugar(e.voo.destino) });
  }
  if (i === 1) {
    if (e.tipo === 'baixando') return t('embarque.baixando', { pct: e.total ? Math.round((e.feitos / e.total) * 100) : 0 });
    if (e.tipo === 'paisagem-falhou') return t('embarque.paisagemFalhou');
    if (e.tipo === 'preparando' && e.comGlobo) return t('embarque.semPaisagem');
    return t('embarque.paisagem');
  }
  return t('embarque.preparando');
}

/** Localizar vale 10%, a paisagem 80% e preparar a janela os 10% finais. */
function progressoTotal(e: EtapaDoEmbarque): number {
  switch (e.tipo) {
    case 'localizando':
      return 0.05;
    case 'baixando':
      return 0.1 + 0.8 * (e.total ? e.feitos / e.total : 0);
    case 'paisagem-falhou':
      return 0.5;
    case 'preparando':
      return 0.95;
    case 'embarcou':
      return 1;
    default:
      return 0;
  }
}

const ICONE: Record<Estado, IconName> = { feita: 'checkStep', atual: 'loadingStep', pendente: 'pendingStep' };

function Etapa({ estado, texto }: { estado: Estado; texto: string }) {
  return (
    <View style={styles.etapa} accessible accessibilityLabel={texto} accessibilityState={{ busy: estado === 'atual', disabled: estado === 'pendente' }}>
      {estado === 'atual' ? <Girando /> : <Icon name={ICONE[estado]} />}
      <Text
        variant={estado === 'atual' ? 'Label/Medium 14' : 'Body/Medium 14'}
        tone={estado === 'pendente' ? 'muted' : 'primary'}
        style={{ flex: 1 }}
        numberOfLines={1}
      >
        {texto}
      </Text>
    </View>
  );
}

function Girando() {
  const reduzir = useReducedMotion();
  const giro = useSharedValue(0);
  useEffect(() => {
    if (reduzir) return;
    giro.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1);
    return () => cancelAnimation(giro);
  }, [giro, reduzir]);
  const estilo = useAnimatedStyle(() => ({ transform: [{ rotate: `${giro.value}deg` }] }));
  return (
    <Animated.View style={estilo}>
      <Icon name="loadingStep" />
    </Animated.View>
  );
}

const EMENDA = 24;

/** Esteira com o Termi (referência estática do Figma, com as emendas deslizando e o Termi quicando). */
function Esteira() {
  const reduzir = useReducedMotion();
  const desliza = useSharedValue(0);
  const pulo = useSharedValue(0);
  useEffect(() => {
    if (reduzir) return;
    desliza.value = withRepeat(withTiming(-EMENDA, { duration: 700, easing: Easing.linear, reduceMotion: ReduceMotion.System }), -1);
    pulo.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 260, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }),
        withTiming(0, { duration: 500 }),
      ),
      -1,
    );
    return () => {
      cancelAnimation(desliza);
      cancelAnimation(pulo);
    };
  }, [desliza, pulo, reduzir]);
  const emendas = useAnimatedStyle(() => ({ transform: [{ translateX: desliza.value }] }));
  const termi = useAnimatedStyle(() => ({ transform: [{ translateY: pulo.value }, { rotate: '-4deg' }] }));
  const sombra = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 + pulo.value / 40 }] }));

  return (
    <View style={styles.esteiraCaixa} accessible accessibilityLabel={t('embarque.termiNaEsteira')}>
      <Animated.View style={[styles.termi, termi]}>
        <Suitcase size={144} />
      </Animated.View>
      <Animated.View style={[styles.sombra, sombra]} />
      <View style={styles.lona}>
        <Animated.View style={[styles.emendas, emendas]}>
          {Array.from({ length: 15 }, (_, i) => (
            <View key={i} style={[styles.emenda, { left: i * EMENDA }]} />
          ))}
        </Animated.View>
        <View style={styles.brilho} />
      </View>
      <View style={[styles.rolo, { left: 0 }]}>
        <View style={styles.eixo} />
      </View>
      <View style={[styles.rolo, { right: 0 }]}>
        <View style={styles.eixo} />
      </View>
      <View style={styles.base} />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.flight, paddingHorizontal: screenGutter, gap: space[16] },
  rota: { flexDirection: 'row', alignItems: 'center', gap: space[10] },
  etapas: { backgroundColor: color.surface.subtle, borderRadius: radius.md, padding: space[16], gap: space[14] },
  etapa: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  trilho: { height: 4, borderRadius: 2, backgroundColor: color.surface.strong, overflow: 'hidden' },
  barra: { height: 4, borderRadius: 2, backgroundColor: color.accent.default },
  cartaoGlobo: { backgroundColor: color.surface.default, borderRadius: radius.lg, padding: space[14], gap: space[6] },
  esteiraCaixa: { width: 300, height: 216 },
  termi: { position: 'absolute', left: 78, top: 30 },
  sombra: { position: 'absolute', left: 102, top: 163, width: 96, height: 10, borderRadius: 5, backgroundColor: color.esteira.sombra },
  lona: { position: 'absolute', top: 168, left: 0, width: 300, height: 22, borderRadius: 11, backgroundColor: color.esteira.lona, overflow: 'hidden' },
  emendas: { position: 'absolute', left: 0, top: 0, width: 340, height: 22 },
  emenda: { position: 'absolute', top: 0, width: 2, height: 22, backgroundColor: color.esteira.emenda },
  brilho: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: color.esteira.brilho },
  rolo: { position: 'absolute', top: 168, width: 22, height: 22, borderRadius: 11, backgroundColor: color.esteira.lona, borderWidth: 2, borderColor: color.esteira.emenda, alignItems: 'center', justifyContent: 'center' },
  eixo: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.text.muted },
  base: { position: 'absolute', top: 190, left: 30, width: 240, height: 26, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: color.esteira.base },
});
