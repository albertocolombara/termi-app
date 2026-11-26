/** OB8 · Como o Termi te ajuda a focar (Figma 579:9054). Três passos ligados por linhas e um destaque. */
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { color, effects, Icon, space, Text, type IconName } from '@/ds';
import { t } from '@/i18n';

import { Cabecalho, TelaDoOnboarding } from './TelaDoOnboarding';

const PASSOS: { icone: IconName; titulo: 'onboarding.ajuda1' | 'onboarding.ajuda2' | 'onboarding.ajuda3'; texto: 'onboarding.ajuda1Texto' | 'onboarding.ajuda2Texto' | 'onboarding.ajuda3Texto' }[] = [
  { icone: 'plane', titulo: 'onboarding.ajuda1', texto: 'onboarding.ajuda1Texto' },
  { icone: 'servicoDeBordo', titulo: 'onboarding.ajuda2', texto: 'onboarding.ajuda2Texto' },
  { icone: 'passport', titulo: 'onboarding.ajuda3', texto: 'onboarding.ajuda3Texto' },
];
const CIRCULO = 55;

export function TelaComoAjuda() {
  return (
    <TelaDoOnboarding cta={{ label: t('onboarding.continuar'), onPress: () => router.push('/onboarding/avisos') }}>
      <View style={{ gap: space[40], paddingBottom: space[24] }}>
        <Cabecalho titulo={t('onboarding.ajudaTitulo')} />
        <View>
          {PASSOS.map((p, i) => (
            <View key={p.titulo} style={styles.passo}>
              <View style={styles.coluna}>
                <View style={styles.circulo}>
                  <Icon name={p.icone} size={28} color={color.accent.default} />
                </View>
                {i < PASSOS.length - 1 ? <View style={styles.linha} /> : null}
              </View>
              <View style={styles.texto} accessible accessibilityLabel={`${i + 1}. ${t(p.titulo)}. ${t(p.texto)}`}>
                <Text variant="Body/Large Medium 16">{t(p.titulo)}</Text>
                <Text variant="Body/Medium 14" tone="secondary">
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
  passo: { flexDirection: 'row', gap: space[24] },
  coluna: { width: CIRCULO + 20, alignItems: 'center' },
  // Figma: círculo de 55 com borda amarela de 2 e brilho amarelo.
  circulo: {
    width: CIRCULO,
    height: CIRCULO,
    borderRadius: CIRCULO / 2,
    borderWidth: 2,
    borderColor: color.accent.default,
    backgroundColor: color.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
    ...effects['Glow/Accent'],
  },
  // Linha entre os passos: some nas pontas (degradê do Figma).
  linha: {
    width: 1,
    height: 50,
    marginVertical: space[2],
    backgroundImage: `linear-gradient(180deg, transparent 0%, ${color.text.primary} 52%, transparent 100%)`,
  },
  texto: { flex: 1, gap: space[2], paddingTop: space[4], paddingBottom: space[24] },
});
