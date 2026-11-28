/**
 * 05 · Embarcando (carregamento) e X5 · paisagem não baixou. PRD: RF-15, RF-16; UC-02 passos 7–9, A4, A5, E1, E2; UC-03.
 * O Termi (Rive) anda na esteira enquanto as etapas reais acontecem e, no fim, faz o "embarcou" até o final.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet, Button, color, Icon, InfoBanner, radius, screenGutter, space, Text, type IconName } from '@/ds';
import { DURACAO_EMBARCOU_MS, TermiAnimado } from '@/features/termi/TermiAnimado';
import { t } from '@/i18n';

import { codigoDoLugar, km, nomeDoLugar } from './formato';
import { useSomLiberado } from './somLiberado';
import { useEmbarque, type EtapaDoEmbarque } from './useEmbarque';

export type EstadoDaEtapa = 'feita' | 'atual' | 'pendente';

export function TelaEmbarque({ caminhoRapido }: { caminhoRapido: boolean }) {
  const insets = useSafeAreaInsets();
  const { etapa, tentarDeNovo, embarcarComGlobo, cancelar, confirmarEmbarque, recomecar } = useEmbarque({ caminhoRapido });

  const reduzirMovimento = useReducedMotion();
  const [pulou, setPulou] = useState(false);
  const liberarSom = useSomLiberado((s) => s.liberar);
  // O Termi cabe no espaço que sobra entre a rota e as etapas (em telas baixas os elementos se encostavam, build-26).
  const { width } = useWindowDimensions();
  const [espacoDoTermi, setEspacoDoTermi] = useState(0);
  const tamanhoDoTermi = espacoDoTermi ? Math.round(Math.max(TERMI_MIN, Math.min(TERMI_MAX, width - 2 * screenGutter, espacoDoTermi))) : 0;

  // Embarcou: o Termi faz o pulinho e sai pela esteira até o fim (2,6 s) antes de abrir o voo.
  // Tocar na tela pula a animação; com "reduzir movimento", abre direto (CLAUDE.md §9).
  useEffect(() => {
    if (etapa.tipo !== 'embarcou') return;
    const abrir = () => {
      // Depois do embarque, "voltar" não leva ao cartão nem ao embarque.
      confirmarEmbarque();
      router.dismissTo('/');
      router.push('/voo/em-voo');
    };
    const sessaoId = etapa.sessaoId;
    if (reduzirMovimento || pulou) {
      liberarSom(sessaoId);
      return abrir();
    }
    // O som entra com fade quando a animação está terminando (Alberto, build-28).
    const som = setTimeout(() => liberarSom(sessaoId), Math.max(0, DURACAO_EMBARCOU_MS - SOM_ANTES_DO_FIM_MS));
    const id = setTimeout(abrir, DURACAO_EMBARCOU_MS + 150);
    return () => {
      clearTimeout(som);
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa.tipo, reduzirMovimento, pulou]);

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

      {/* Os textos ficam com a altura deles; só o Termi encolhe para caber no que sobra (build-27). */}
      <View style={{ flex: 1, gap: space[16] }}>
        <View style={styles.espacoDoTermi} onLayout={(e) => setEspacoDoTermi(e.nativeEvent.layout.height)}>
          <Pressable
            disabled={etapa.tipo !== 'embarcou'}
            onPress={() => setPulou(true)}
            accessibilityHint={etapa.tipo === 'embarcou' ? t('embarque.pularAnimacao') : undefined}
          >
            {tamanhoDoTermi ? (
              <TermiAnimado esteira embarcou={etapa.tipo === 'embarcou'} tamanho={tamanhoDoTermi} rotulo={t('embarque.termiNaEsteira')} />
            ) : null}
          </Pressable>
        </View>
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
        <CartaoDeEtapas
          etapas={[
            { estado: estadoDa(etapa, 0), texto: textoDaEtapa(etapa, 0) },
            { estado: estadoDa(etapa, 1), texto: textoDaEtapa(etapa, 1) },
            { estado: estadoDa(etapa, 2), texto: textoDaEtapa(etapa, 2) },
          ]}
        />
        <View
          style={styles.trilho}
          accessible
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progresso * 100) }}
        >
          <View style={[styles.barra, { width: `${progresso * 100}%` }]} />
        </View>
      </View>

      <View style={{ minHeight: 48, justifyContent: 'center', paddingTop: space[16] }}>
        {podeCancelar ? (
          <Button variant="secondary" size="mini" label={t('embarque.cancelar')} onPress={cancelarEmbarque} style={{ alignSelf: 'center' }} />
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

function estadoDa(e: EtapaDoEmbarque, i: number): EstadoDaEtapa {
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

/** Quanto antes do fim da animação do embarque o som começa a entrar. */
const SOM_ANTES_DO_FIM_MS = 700;
const TERMI_MAX = 300;
const TERMI_MIN = 140;

const ICONE: Record<EstadoDaEtapa, IconName> = { feita: 'checkStep', atual: 'loadingStep', pendente: 'pendingStep' };

/** Cartão de etapas de carregamento (05 · Embarcando e OB6 · Plano de voo), com ícones do DS (`checkStep`, `loadingStep` girando, `pendingStep`). */
export function CartaoDeEtapas({ etapas }: { etapas: readonly { estado: EstadoDaEtapa; texto: string }[] }) {
  return (
    <View style={styles.etapas} accessibilityLiveRegion="polite">
      {etapas.map((etapa, i) => (
        <Etapa key={i} estado={etapa.estado} texto={etapa.texto} />
      ))}
    </View>
  );
}

function Etapa({ estado, texto }: { estado: EstadoDaEtapa; texto: string }) {
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

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.flight, paddingHorizontal: screenGutter, gap: space[16] },
  rota: { flexDirection: 'row', alignItems: 'center', gap: space[10] },
  espacoDoTermi: { flex: 1, minHeight: TERMI_MIN, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  etapas: { backgroundColor: color.surface.card, borderRadius: radius.card, padding: space[16], gap: space[14] },
  etapa: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  trilho: { height: 3, borderRadius: radius.full, backgroundColor: color.surface.default, overflow: 'hidden' },
  barra: { height: 3, borderRadius: radius.full, backgroundColor: color.accent.default },
  cartaoGlobo: { backgroundColor: color.surface.card, borderRadius: radius.card, padding: space[16], gap: space[6] },
});
