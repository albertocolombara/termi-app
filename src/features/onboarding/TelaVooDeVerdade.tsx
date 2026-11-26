/**
 * OB2 · Voo de verdade (Figma 579:8835). PRD: RF-02; UC-01.
 * A frase dos "outros apps" fica desfocada; "de verdade." brilha em amarelo. Atrás, o globo do OB1
 * parado e apagado, com a rota do voo em destaque.
 */
import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';

import { color, space, Text } from '@/ds';
import { GloboAoVivo } from '@/globo-rotas/GloboAoVivo';
import { t } from '@/i18n';

import { TelaDoOnboarding } from './TelaDoOnboarding';
import { useDestaque, useVoosDoOnboarding } from './useVoosDoOnboarding';

// Sem voo no cache, a ilustração usa a rota do Figma (Recife → Lisboa) como desenho, sem etiqueta.
const ROTA_DA_ILUSTRACAO = { origem: { lat: -8.13, lon: -34.92 }, destino: { lat: 38.77, lon: -9.13 }, aviao: { lat: 12, lon: -27, rumo: 30 }, rotulo: '' };

export function TelaVooDeVerdade() {
  const { width } = useWindowDimensions();
  const { voos, agora, consultadoEm } = useVoosDoOnboarding(60_000);
  const destaque = useDestaque(voos, consultadoEm, agora);
  const rota = destaque ? { ...destaque, rotulo: '' } : ROTA_DA_ILUSTRACAO;
  const [altura, setAltura] = useState(0);

  return (
    <TelaDoOnboarding
      cta={{ label: t('onboarding.comoAjuda'), onPress: () => router.push('/onboarding/foco') }}
      style={{ justifyContent: 'center', paddingBottom: space[40] * 2 }}
      fundo={
        <View style={styles.fundo} onLayout={(e) => setAltura(e.nativeEvent.layout.height)}>
          {altura ? (
            <View style={{ position: 'absolute', top: altura * 0.48, left: -width * 0.25, opacity: 0.25 }}>
              <GloboAoVivo largura={width * 1.5} altura={width * 0.95} destaque={rota} raioRelativo={0.5} ativo={false} rotuloAcessivel="" />
            </View>
          ) : null}
        </View>
      }
    >
      <View style={{ gap: space[32] }}>
        <Desfocado texto={t('onboarding.outrosApps')} />
        <View style={{ gap: space[12] }}>
          <Text variant="Heading/Screen 32" tone="secondary" accessibilityRole="header">
            {t('onboarding.noTermi')}{' '}
            <Text variant="Heading/Screen 32" style={styles.brilho}>
              {t('onboarding.deVerdade')}
            </Text>
          </Text>
          <Text variant="Body/Large 16" tone="secondary">
            {t('onboarding.mundoReal')}
          </Text>
        </View>
      </View>
    </TelaDoOnboarding>
  );
}

/**
 * Texto desfocado (Figma: desfoque de camada 3). O RN não desfoca texto: cópias deslocadas e
 * translúcidas dão o mesmo efeito. O leitor de tela lê o texto normalmente.
 */
function Desfocado({ texto }: { texto: string }) {
  const desvios = [
    [0, 0],
    [-1.5, -1],
    [1.5, 1],
    [-1, 1.5],
    [1, -1.5],
  ];
  return (
    <View accessible accessibilityLabel={texto}>
      {desvios.map(([x, y], i) => (
        <Text
          key={i}
          variant="Body/Large 16"
          tone="muted"
          importantForAccessibility="no"
          style={[i ? StyleSheet.absoluteFill : null, { opacity: i ? 0.35 : 0.45, transform: [{ translateX: x }, { translateY: y }] }]}
        >
          {texto}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, overflow: 'hidden' },
  // Figma: sombra de 24 em amarelo a 45% ("Destaque (brilho)").
  brilho: { color: color.text.primary, textShadowColor: color.onboarding.brilhoDoDestaque, textShadowRadius: 24, textShadowOffset: { width: 0, height: 0 } },
});
