/**
 * OB7 · Onde você chega em 30 dias (Figma 579:9017). Projeção pela meta do OB5: horas × ~540 milhas
 * por hora. O número cresce até o total; atrás, o globo gira com rotas reais passando.
 */
import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnboarding } from '@/data/preferencias/onboarding';
import { comparacaoComOMundo, projecao } from '@/domain/onboarding/plano';
import { rotasDeExemplo } from '@/domain/onboarding/voos';
import { color, Icon, radius, space, Text, type IconName } from '@/ds';
import { GloboAoVivo } from '@/globo-rotas/GloboAoVivo';
import { t } from '@/i18n';

import { TelaDoOnboarding } from './TelaDoOnboarding';
import { useContagem } from './useContagem';
import { useVoosDoOnboarding } from './useVoosDoOnboarding';

export function Tela30Dias() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const meta = useOnboarding((s) => s.metaDiariaH);
  const { voos, ativo } = useVoosDoOnboarding(60_000);
  const rotas = useMemo(() => rotasDeExemplo(voos, 10), [voos]);
  const p = projecao(meta);
  const mundo = comparacaoComOMundo(p.voltas);
  const milhas = useContagem(p.milhas, 10);
  const lado = width * 1.08;

  return (
    <TelaDoOnboarding
      cta={{ label: t('onboarding.continuar'), onPress: () => router.push('/onboarding/como-ajuda') }}
      style={{ paddingTop: space[24] }}
      fundo={
        <View style={{ position: 'absolute', top: insets.top + 140, left: (width - lado) / 2 }}>
          <GloboAoVivo largura={lado} altura={lado} rotas={rotas} raioRelativo={0.4} ativo={ativo} rotuloAcessivel={t('onboarding.globoComRotas')} />
        </View>
      }
    >
      <View style={{ alignItems: 'center', gap: space[8] }}>
        <Text variant="Body/Large 16" tone="secondary" style={{ textAlign: 'center' }}>
          {t('onboarding.trintaDiasTitulo', { meta: t('onboarding.metaCurta', { h: meta }) })}
        </Text>
        <View accessible accessibilityRole="header" accessibilityLabel={t('onboarding.milhasAcessivel', { milhas: p.milhas.toLocaleString('pt-BR') })} style={{ alignItems: 'center' }}>
          <Text variant="Display/Data 52" tone="accent" style={{ fontVariant: ['tabular-nums'] }}>
            {milhas.toLocaleString('pt-BR')}
          </Text>
          <Text variant="Heading/Sheet 22" tone="secondary">
            {t('onboarding.milhas')}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.cartao}>
        <Item
          icone="globe"
          titulo={
            mundo.tipo === 'parte'
              ? t('onboarding.parteDaVolta', { pct: mundo.porcento })
              : mundo.voltas === 1
                ? t('onboarding.maisQueUmaVolta')
                : t('onboarding.maisDeVoltas', { n: mundo.voltas })
          }
          texto={t('onboarding.circunferencia')}
        />
        <View style={styles.divisor} />
        <Item icone="passport" titulo={t('onboarding.carimbos')} texto={t('onboarding.carimbosTexto')} />
        <View style={styles.divisor} />
        <Item icone="suitcaseLine" titulo={t('onboarding.status', { nome: p.status.nome })} texto={t('onboarding.statusTexto', { nome: p.status.nome, h: p.horasAteOStatus })} />
      </View>
      <Text variant="Caption/Regular 12" tone="tertiary" style={{ paddingTop: space[16], textAlign: 'center' }}>
        {t('onboarding.conta', { h: p.horas })}
      </Text>
    </TelaDoOnboarding>
  );
}

function Item({ icone, titulo, texto }: { icone: IconName; titulo: string; texto: string }) {
  return (
    <View style={styles.item} accessible accessibilityLabel={`${titulo}. ${texto}`}>
      <View style={styles.emblema}>
        <Icon name={icone} size={18} color={color.accent.default} />
      </View>
      <View style={{ flex: 1, gap: space[2] }}>
        <Text variant="Label/Medium 14">{titulo}</Text>
        <Text variant="Caption/Regular 12" tone="tertiary">
          {texto}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    gap: space[14],
    padding: space[16],
    borderRadius: radius.card,
    backgroundColor: '#1B1C22',
    borderWidth: 1,
    borderColor: color.border.subtle,
  },
  divisor: { height: StyleSheet.hairlineWidth, backgroundColor: color.border.subtle },
  item: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  emblema: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.accent.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
