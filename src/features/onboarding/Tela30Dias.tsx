/**
 * OB7 · Onde você chega em 30 dias (Figma 579:9017). Projeção pela meta do OB5: horas × ~540 milhas
 * por hora. O número cresce até o total; atrás, o globo gira com rotas reais passando.
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnboarding } from '@/data/preferencias/onboarding';
import { comparacaoComOMundo, projecao } from '@/domain/onboarding/plano';
import { rotasDeExemplo } from '@/domain/onboarding/voos';
import { color, radius, space, Text } from '@/ds';
import { GloboAoVivo } from '@/globo-rotas/GloboAoVivo';
import { t } from '@/i18n';

import { TelaDoOnboarding } from './TelaDoOnboarding';
import { useVoosDoOnboarding } from './useVoosDoOnboarding';

const CRESCER_MS = 1600;

export function Tela30Dias() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const meta = useOnboarding((s) => s.metaDiariaH);
  const { voos, ativo } = useVoosDoOnboarding(60_000);
  const rotas = useMemo(() => rotasDeExemplo(voos, 10), [voos]);
  const p = projecao(meta);
  const mundo = comparacaoComOMundo(p.voltas);
  const milhas = useContagem(p.milhas);
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
          emoji="🌍"
          titulo={
            mundo.tipo === 'parte'
              ? t('onboarding.parteDaVolta', { pct: mundo.porcento })
              : mundo.voltas === 1
                ? t('onboarding.maisQueUmaVolta')
                : t('onboarding.maisDeVoltas', { n: mundo.voltas })
          }
          texto={t('onboarding.circunferencia')}
        />
        <Item emoji="🛂" titulo={t('onboarding.carimbos')} texto={t('onboarding.carimbosTexto')} />
        <Item emoji="🧳" titulo={t('onboarding.status', { nome: p.status.nome })} texto={t('onboarding.statusTexto', { nome: p.status.nome, h: p.horasAteOStatus })} />
      </View>
      <Text variant="Caption/Regular 12" tone="tertiary" style={{ paddingTop: space[16] }}>
        {t('onboarding.conta', { h: p.horas })}
      </Text>
    </TelaDoOnboarding>
  );
}

function Item({ emoji, titulo, texto }: { emoji: string; titulo: string; texto: string }) {
  return (
    <View style={styles.item} accessible accessibilityLabel={`${titulo}. ${texto}`}>
      <Text variant="Heading/Sheet 22" style={{ width: 30 }} importantForAccessibility="no">
        {emoji}
      </Text>
      <View style={{ flex: 1 }}>
        <Text variant="Body/Large Medium 16">{titulo}</Text>
        <Text variant="Body/Small 13" tone="secondary">
          {texto}
        </Text>
      </View>
    </View>
  );
}

/** Número que cresce de 0 até `alvo` (ease-out). Com "reduzir movimento", aparece direto. */
function useContagem(alvo: number) {
  const reduzir = useReducedMotion();
  const [valor, setValor] = useState(reduzir ? alvo : 0);
  useEffect(() => {
    if (reduzir) return;
    const inicio = Date.now();
    let id = 0;
    const passo = () => {
      const u = Math.min(1, (Date.now() - inicio) / CRESCER_MS);
      const e = 1 - (1 - u) ** 3;
      setValor(Math.round((alvo * e) / 10) * 10);
      if (u < 1) id = requestAnimationFrame(passo);
      else setValor(alvo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [alvo, reduzir]);
  return reduzir ? alvo : valor;
}

const styles = StyleSheet.create({
  cartao: {
    gap: space[24],
    padding: space[16],
    borderRadius: radius['2xl'] + 4,
    borderWidth: 1,
    borderColor: color.border.subtle,
    // Opaco, por cima do globo (Figma #1D1B20; o cartão do globo do Início).
    backgroundColor: color.globo.cartao,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: space[10] },
});
