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

        <View style={{ gap: space[12], paddingTop: space[4] }}>
          <View style={styles.cabecalhoVoos}>
            <Text variant="Body/Small 13" tone="tertiary">
              {t('onboarding.voosComEssaDuracao')}
            </Text>
            <Text variant="Caption/Medium 12" tone="accent">
              {t('onboarding.milhasPorDia', { milhas: milhasPorDia(meta).toLocaleString('pt-BR') })}
            </Text>
          </View>
          <View>
            {exemplos.length ? (
              exemplos.map((v, i) => (
                <LinhaDoVoo key={`${meta}-${v.hex}`} voo={v} minutos={minutosAtePouso(v, agora)} indice={i} ultima={i === exemplos.length - 1} />
              ))
            ) : (
              <Text variant="Body/Medium 14" tone="tertiary">
                {t('onboarding.semVoosDeExemplo')}
              </Text>
            )}
          </View>
        </View>
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
      <Text variant="Body/Large Medium 16" tone={marcada ? 'accent' : 'primary'} numberOfLines={1}>
        {t(ROTULO_DA_META[h])}
      </Text>
    </Pressable>
  );
}

/** Voo de exemplo (OB5 · v4 Clean): cauda, callsign · companhia em cima, rota embaixo, duração à direita. */
function LinhaDoVoo({ voo, minutos, indice, ultima }: { voo: Voo; minutos: number; indice: number; ultima?: boolean }) {
  const origem = nomeDoLugar(voo.origem);
  const destino = nomeDoLugar(voo.destino);
  return (
    <Animated.View
      entering={FadeInDown.delay(indice * 90).duration(320)}
      exiting={FadeOut.duration(120)}
      style={[styles.voo, !ultima && styles.vooDivisor]}
      accessible
      accessibilityLabel={`${voo.callsign}, ${voo.companhiaNome ?? ''}. ${origem} → ${destino}. ${duracaoPorExtenso(Math.max(0, minutos))}`}
    >
      <Cauda pais={voo.companhiaPais} tamanho={32} />
      <View style={{ flex: 1, gap: space[2] }}>
        <Text variant="Caption/Regular 12" tone="tertiary" numberOfLines={1} style={{ fontSize: 11.5 }}>
          {voo.companhiaNome ? `${voo.callsign} · ${voo.companhiaNome}` : voo.callsign}
        </Text>
        <View style={styles.rota}>
          <Text variant="Body/Large Medium 16" style={styles.cidade} numberOfLines={1}>
            {`${origem} → ${destino}`}
          </Text>
        </View>
      </View>
      <Text variant="Label/Medium 14" tone="secondary">
        {duracao(Math.max(0, minutos))}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space[8] },
  chip: {
    flexGrow: 1,
    flexBasis: 0,
    height: 48,
    paddingHorizontal: space[12],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.cta,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: color.surface.card,
  },
  chipMarcado: { backgroundColor: color.accent.container, borderColor: color.accent.default },
  cabecalhoVoos: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[8] },
  voo: { flexDirection: 'row', alignItems: 'center', gap: space[12], minHeight: 64, paddingVertical: space[10] },
  vooDivisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border.subtle },
  rota: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  cidade: { flexShrink: 1, fontSize: 15, lineHeight: 20, fontWeight: '500' },
});
