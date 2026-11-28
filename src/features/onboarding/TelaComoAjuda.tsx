/** OB8 · Como o Termi te ajuda a focar (Figma 579:9054). Três passos ligados por linhas e um destaque. */
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { color, Icon, space, Text, type IconName } from '@/ds';
import { t } from '@/i18n';

import { Cabecalho, TelaDoOnboarding } from './TelaDoOnboarding';

const PASSOS: { icone: IconName; titulo: 'onboarding.ajuda1' | 'onboarding.ajuda2' | 'onboarding.ajuda3'; texto: 'onboarding.ajuda1Texto' | 'onboarding.ajuda2Texto' | 'onboarding.ajuda3Texto' }[] = [
  { icone: 'plane', titulo: 'onboarding.ajuda1', texto: 'onboarding.ajuda1Texto' },
  { icone: 'servicoDeBordo', titulo: 'onboarding.ajuda2', texto: 'onboarding.ajuda2Texto' },
  { icone: 'passport', titulo: 'onboarding.ajuda3', texto: 'onboarding.ajuda3Texto' },
];
const CIRCULO = 44;

export function TelaComoAjuda() {
  return (
    <TelaDoOnboarding cta={{ label: t('onboarding.continuar'), onPress: () => router.push('/onboarding/avisos') }}>
      <View style={{ gap: space[32], paddingBottom: space[24] }}>
        <Cabecalho titulo={t('onboarding.ajudaTitulo')} />
        <View style={{ gap: space[24] }}>
          {PASSOS.map((p, i) => (
            <View key={p.titulo} style={styles.passo} accessible accessibilityLabel={`${i + 1}. ${t(p.titulo)}. ${t(p.texto)}`}>
              <View style={styles.circulo}>
                <Icon name={p.icone} size={20} color={color.accent.default} />
              </View>
              <View style={styles.texto}>
                <Text variant="Body/Large Medium 16">{t(p.titulo)}</Text>
                <Text variant="Body/Small 13" tone="tertiary">
                  {t(p.texto)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </TelaDoOnboarding>
  );
}

const styles = StyleSheet.create({
  passo: { flexDirection: 'row', alignItems: 'flex-start', gap: space[16] },
  circulo: {
    width: CIRCULO,
    height: CIRCULO,
    borderRadius: CIRCULO / 2,
    backgroundColor: color.accent.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { flex: 1, gap: space[4] },
});
