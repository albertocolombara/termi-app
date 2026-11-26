/**
 * OB10 · Sua janela agora (Figma 579:9127). A janela ao vivo de um voo real, na vista com a asa
 * ("Vista do Plus"), com o céu e a hora do dia de verdade. Depois dela: o paywall comum (P1) e o Início.
 * Mostrar a vista do Plus aqui não é oferta: o paywall vem depois, no fluxo, como no Figma.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';

import { indiceDaQualidade, quadrosDaJanela, useAjustes } from '@/data/preferencias/ajustes';
import { useOnboarding } from '@/data/preferencias/onboarding';
import { momentoDoDia, type MomentoDoDia } from '@/domain/onboarding/voos';
import { projetar } from '@/domain/voos/projecao';
import type { Voo } from '@/domain/voos/tipos';
import { color, radius, space, Text } from '@/ds';
import { metros, nomeDoLugar } from '@/features/voo/formato';
import { t, type ChaveDeTexto } from '@/i18n';
import { sun } from '@/janela/geo';
import { Janela } from '@/janela/Janela';

import { TelaDoOnboarding } from './TelaDoOnboarding';
import { usePaisagemDaJanela, useVooDaJanela, useVoosDoOnboarding } from './useVoosDoOnboarding';

const MOMENTO: Record<MomentoDoDia, ChaveDeTexto> = {
  dia: 'onboarding.momentoDia',
  'por-do-sol': 'onboarding.momentoPorDoSol',
  'nascer-do-sol': 'onboarding.momentoNascerDoSol',
  noite: 'onboarding.momentoNoite',
};
const graus = (rad: number) => (rad * 180) / Math.PI;

export function TelaJanela() {
  const { width, height } = useWindowDimensions();
  const { voos, agora, ativo, consultadoEm } = useVoosDoOnboarding(1000);
  const mudar = useOnboarding((s) => s.mudar);
  const voo = useVooDaJanela(voos, consultadoEm);
  usePaisagemDaJanela(voo, ativo);

  // A janela é 3:4 e ocupa o alto da tela, um pouco mais larga que ela (cortada nas laterais).
  const alturaDaJanela = Math.round(height * 0.7);
  const larguraDaJanela = Math.max(width, Math.round((alturaDaJanela * 3) / 4));

  const pos = voo ? projetar(voo, agora) : null;

  const terminar = () => {
    mudar({ concluido: true });
    // Depois do OB10: paywall comum (P1); fechar ou "Continuar na econômica" volta ao Início.
    router.dismissTo('/');
    router.push('/primeira-classe');
  };

  let subtitulo = t('onboarding.janelaSemVoo');
  if (voo && pos) {
    const el = graus(sun(agora, pos.lat, pos.lon).el);
    const elDepois = graus(sun(agora + 10 * 60_000, pos.lat, pos.lon).el);
    subtitulo = t('onboarding.janelaSubtitulo', {
      callsign: voo.callsign,
      origem: nomeDoLugar(voo.origem),
      destino: nomeDoLugar(voo.destino),
      altitude: metros(pos.altitudePes) ?? '—',
      momento: t(MOMENTO[momentoDoDia(el, elDepois)]),
    });
  }

  return (
    <TelaDoOnboarding
      cta={{ label: t('onboarding.continuar'), onPress: terminar }}
      style={{ justifyContent: 'flex-end', gap: space[8] }}
      fundo={
        <View style={[styles.fundo, { height: alturaDaJanela }]} accessible accessibilityRole="image" accessibilityLabel={t('onboarding.janelaAcessivel')}>
          {ativo && voo ? (
            <View style={{ position: 'absolute', top: 0, left: (width - larguraDaJanela) / 2 }}>
              <JanelaDoVoo voo={voo} agora={agora} largura={larguraDaJanela} />
            </View>
          ) : null}
          <View pointerEvents="none" style={styles.degrade} />
        </View>
      }
    >
      <View style={styles.etiqueta}>
        <Text variant="Caption/Medium 12">{t('onboarding.vistaDoPlus')}</Text>
      </View>
      <Text variant="Heading/Sheet 22" accessibilityRole="header">
        {voo ? t('onboarding.janelaTitulo', { destino: nomeDoLugar(voo.destino) }) : t('onboarding.janelaTituloSemVoo')}
      </Text>
      <Text variant="Body/Small 13" tone="secondary">
        {subtitulo}
      </Text>
    </TelaDoOnboarding>
  );
}

/** A janela ao vivo do voo, na vista com a asa e a moldura. */
function JanelaDoVoo({ voo, agora, largura }: { voo: Voo; agora: number; largura: number }) {
  const ajustes = useAjustes();
  const [abertaEm] = useState(() => Date.now());
  const kmPorS = ((voo.velocidadeNos ?? 450) * 1.852) / 3600;
  const pos = projetar(voo, agora);
  const seguinte = projetar(voo, agora + 1000);
  const posicao = useMemo(() => ({ lat: pos.lat, lon: pos.lon, rumo: pos.rumo }), [pos.lat, pos.lon, pos.rumo]);
  const posicaoSeguinte = useMemo(() => ({ lat: seguinte.lat, lon: seguinte.lon }), [seguinte.lat, seguinte.lon]);
  return (
    <Janela
      width={largura}
      posicao={posicao}
      posicaoSeguinte={posicaoSeguinte}
      time={agora}
      driftKm={(Math.max(0, agora - abertaEm) / 1000) * kmPorS}
      driftKmPorS={kmPorS}
      altitudeKm={pos.altitudePes === null ? null : pos.altitudePes * 0.0003048}
      fps={quadrosDaJanela(ajustes)}
      quality={indiceDaQualidade(ajustes.qualidadeDaJanela)}
      satClouds
      showMeter={false}
      showLandscape
      showOverlay
      asa
      moldura
    />
  );
}

const styles = StyleSheet.create({
  fundo: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden', backgroundColor: color.bg.flight },
  // A janela se funde com o fundo embaixo (degradê do Figma).
  degrade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '35%', backgroundImage: `linear-gradient(180deg, transparent 0%, ${color.bg.app} 100%)` },
  etiqueta: {
    alignSelf: 'flex-start',
    paddingHorizontal: space[10],
    paddingVertical: space[4],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.onboarding.vistaDoPlus,
    marginBottom: space[8],
  },
});
