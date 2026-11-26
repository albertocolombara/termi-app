/** OB1 · Aviões no ar agora (Figma 579:8774). PRD: RF-02; UC-01 passo 1. */
import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';

import { useOnboarding } from '@/data/preferencias/onboarding';
import { avioesNoAr, avioesParaOGlobo } from '@/domain/onboarding/voos';
import { color, radius, screenGutter, space, Text } from '@/ds';
import { GloboAoVivo } from '@/globo-rotas/GloboAoVivo';
import { t } from '@/i18n';

import { ContadorPixel } from './ContadorPixel';
import { TelaDoOnboarding } from './TelaDoOnboarding';
import { useDestaque, useVoosDoOnboarding } from './useVoosDoOnboarding';

export function TelaAvioesNoAr() {
  const { width } = useWindowDimensions();
  const { voos, aoVivo, agora, ativo, consultadoEm } = useVoosDoOnboarding();
  const mudar = useOnboarding((s) => s.mudar);
  const destaque = useDestaque(voos, consultadoEm, agora);
  const avioes = useMemo(() => avioesParaOGlobo(voos, agora), [voos, agora]);
  const total = aoVivo ? avioesNoAr(voos, agora) : 0;
  const [lado, setLado] = useState(0);

  // "Já conheço o Termi": pula o onboarding e abre o dial (Figma: "Link · pular para o dial").
  const pular = () => {
    mudar({ concluido: true });
    router.dismissTo('/');
    router.push('/voo');
  };

  return (
    <TelaDoOnboarding
      cta={{ label: t('onboarding.continuar'), onPress: () => router.push('/onboarding/voo-de-verdade') }}
      link={{ label: t('onboarding.jaConheco'), onPress: pular }}
      style={{ paddingTop: space[24], paddingHorizontal: 0 }}
    >
      <View style={styles.areaDoGlobo} onLayout={(e) => setLado(Math.min(e.nativeEvent.layout.height, width - 2 * screenGutter))}>
        {lado ? (
          <GloboAoVivo
            largura={lado}
            altura={lado}
            avioes={avioes}
            destaque={destaque}
            raioRelativo={0.47}
            ativo={ativo}
            rotuloAcessivel={t('onboarding.globoAoVivo')}
          />
        ) : null}
      </View>

      <View style={styles.texto}>
        {total > 0 ? (
          <>
            <View style={styles.tag}>
              <View style={styles.ponto} />
              <Text variant="Caption/Regular 12" style={{ color: color.status.success }}>
                {t('onboarding.atualizadoAgora')}
              </Text>
            </View>
            <ContadorPixel valor={total.toLocaleString('pt-BR')} rotuloAcessivel={t('onboarding.avioesNoArAcessivel', { n: total.toLocaleString('pt-BR') })} />
            <Text variant="Heading/Screen 32" style={styles.centro} accessibilityRole="header">
              {t('onboarding.avioesNoAr')}
            </Text>
          </>
        ) : (
          <Text variant="Heading/Screen 32" style={styles.centro} accessibilityRole="header">
            {t('onboarding.semContagemTitulo')}
          </Text>
        )}
        <Text variant="Body/Large 16" tone="secondary" style={styles.centro}>
          {t('onboarding.cadaUmPodeSer')}
        </Text>
      </View>
    </TelaDoOnboarding>
  );
}

const styles = StyleSheet.create({
  areaDoGlobo: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  texto: { alignItems: 'center', gap: space[6], paddingHorizontal: screenGutter, paddingTop: space[8] },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    paddingHorizontal: space[6],
    paddingVertical: space[4],
    borderRadius: radius.md,
    backgroundColor: color.status.successSubtle,
  },
  ponto: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.status.success },
  centro: { textAlign: 'center' },
});
