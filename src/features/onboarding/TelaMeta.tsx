/**
 * OB5 · Meta diária (Figma 579:8947). Escolha única em chips; embaixo, voos reais no ar agora que
 * duram a meta (cascata suave ao trocar) e as milhas por dia. A meta só é usada no onboarding.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { useOnboarding } from '@/data/preferencias/onboarding';
import { METAS_DIARIAS_H, milhasPorDia, type MetaDiariaH } from '@/domain/onboarding/plano';
import { voosDeExemplo } from '@/domain/onboarding/voos';
import { minutosAtePouso } from '@/domain/voos/elegibilidade';
import type { Voo } from '@/domain/voos/tipos';
import { Cauda, color, Icon, radius, space, Text } from '@/ds';
import { duracao, duracaoPorExtenso, nomeDoLugar } from '@/features/voo/formato';
import { t } from '@/i18n';

import { Cabecalho, TelaDoOnboarding } from './TelaDoOnboarding';
import { useVoosDoOnboarding } from './useVoosDoOnboarding';

export function TelaMeta() {
  const meta = useOnboarding((s) => s.metaDiariaH);
  const mudar = useOnboarding((s) => s.mudar);
  const { voos, agora, consultadoEm } = useVoosDoOnboarding(60_000);
  // A lista não muda a cada minuto, só ao trocar a meta ou chegarem voos novos.
  const exemplos = useMemo(() => voosDeExemplo(voos, meta * 60, consultadoEm), [voos, meta, consultadoEm]);

  return (
    <TelaDoOnboarding etapa={3} rolar cta={{ label: t('onboarding.montarPlano'), onPress: () => router.push('/onboarding/plano') }}>
      <View style={{ gap: space[24], paddingBottom: space[24] }}>
        <Cabecalho titulo={t('onboarding.metaTitulo')} texto={t('onboarding.metaTexto')} />
        <View style={styles.chips} accessibilityRole="radiogroup">
          {METAS_DIARIAS_H.map((h) => (
            <ChipDaMeta key={h} h={h} marcada={meta === h} onPress={() => mudar({ metaDiariaH: h })} />
          ))}
        </View>

        <View style={{ gap: space[16], paddingTop: space[8] }}>
          <Text variant="Nav/Title 20">{t('onboarding.voosComEssaDuracao')}</Text>
          <View>
            {exemplos.length ? (
              exemplos.map((v, i) => <LinhaDoVoo key={`${meta}-${v.hex}`} voo={v} minutos={minutosAtePouso(v, agora)} indice={i} />)
            ) : (
              <Text variant="Body/Medium 14" tone="tertiary">
                {t('onboarding.semVoosDeExemplo')}
              </Text>
            )}
          </View>
        </View>
        <Text variant="Body/Medium 14" tone="secondary" style={{ textAlign: 'center' }}>
          {t('onboarding.milhasPorDia', { milhas: milhasPorDia(meta).toLocaleString('pt-BR') })}
        </Text>
      </View>
    </TelaDoOnboarding>
  );
}

const ROTULO_DA_META: Record<MetaDiariaH, 'onboarding.meta1' | 'onboarding.meta2' | 'onboarding.meta4' | 'onboarding.meta6'> = {
  1: 'onboarding.meta1',
  2: 'onboarding.meta2',
  4: 'onboarding.meta4',
  6: 'onboarding.meta6',
};

/** Chip da meta (Figma "Escolher · 2 h"): 49 dp; marcado com fundo amarelo escuro e borda amarela. */
function ChipDaMeta({ h, marcada, onPress }: { h: MetaDiariaH; marcada: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: marcada }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, h === 6 && { flexGrow: 1.45 }, marcada && styles.chipMarcado, pressed && { opacity: 0.8 }]}
    >
      <Text variant="Body/Large Medium 16" numberOfLines={1}>
        {t(ROTULO_DA_META[h])}
      </Text>
    </Pressable>
  );
}

/** Voo de exemplo (Figma "Voo NH 251"): cauda com bandeira, voo e companhia, duração e a rota. */
function LinhaDoVoo({ voo, minutos, indice }: { voo: Voo; minutos: number; indice: number }) {
  const origem = nomeDoLugar(voo.origem);
  const destino = nomeDoLugar(voo.destino);
  return (
    <Animated.View
      entering={FadeInDown.delay(indice * 90).duration(320)}
      exiting={FadeOut.duration(120)}
      style={styles.voo}
      accessible
      accessibilityLabel={`${voo.callsign}, ${voo.companhiaNome ?? ''}. ${origem} → ${destino}. ${duracaoPorExtenso(Math.max(0, minutos))}`}
    >
      <Cauda pais={voo.companhiaPais} tamanho={36} />
      <View style={{ flex: 1, gap: space[6] }}>
        <View style={styles.linhaDeCima}>
          <Text variant="Label/Strong 14" numberOfLines={1} style={{ flexShrink: 1 }}>
            {voo.callsign}
            <Text variant="Body/Medium 14" tone="tertiary">
              {voo.companhiaNome ? `  ${voo.companhiaNome}` : ''}
            </Text>
          </Text>
          <Text variant="Label/Strong 14" tone="tertiary">
            {duracao(Math.max(0, minutos))}
          </Text>
        </View>
        <View style={styles.rota}>
          <Text variant="Body/Large Medium 16" style={styles.cidade} numberOfLines={1}>
            {origem}
          </Text>
          <Icon name="arrowRight" size={16} color={color.text.tertiary} />
          <Text variant="Body/Large Medium 16" style={styles.cidade} numberOfLines={1}>
            {destino}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space[8] },
  chip: {
    flexGrow: 1,
    flexBasis: 0,
    height: 49,
    paddingHorizontal: space[14],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.default,
  },
  chipMarcado: { backgroundColor: color.accent.subtle, borderColor: color.accent.default, borderWidth: 1.5 },
  voo: { flexDirection: 'row', alignItems: 'center', gap: space[12], minHeight: 72, paddingHorizontal: space[2], borderBottomWidth: 1, borderBottomColor: color.border.default },
  linhaDeCima: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8] },
  rota: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  // Figma: 19 SemiBold no componente do voo (sem estilo de texto próprio).
  cidade: { flexShrink: 1, fontSize: 19, lineHeight: 22, fontWeight: '600' },
});
