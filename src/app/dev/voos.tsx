import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { env } from '@/config/env';
import { useVoosDisponiveis } from '@/data/voos/useVoos';
import { temposProximos, voosElegiveis } from '@/domain/voos/elegibilidade';
import { Chip, color, InfoBanner, screenGutter, space, Text, TopBar } from '@/ds';
import { t } from '@/i18n';

const TEMPOS = [15, 25, 50, 90, 180] as const;

/**
 * Voos do cache (ferramenta de desenvolvimento). Confere no aparelho o caminho completo:
 * coletor -> R2 -> app -> regras de elegibilidade. Não é a tela de Partidas do produto.
 */
export default function VoosDeTeste() {
  const insets = useSafeAreaInsets();
  const [tempo, setTempo] = useState<number>(50);
  const q = useVoosDisponiveis();

  let conteudo;
  if (!env.flightCacheUrl) conteudo = <InfoBanner message={t('devVoos.semUrl')} />;
  else if (q.isPending) conteudo = <Text tone="secondary">{t('devVoos.carregando')}</Text>;
  else if (q.isError) conteudo = <InfoBanner message={t('devVoos.erro', { erro: String(q.error.message) })} />;
  else {
    const d = q.data;
    const agora = d.consultadoEm; // horário da consulta (relógio fora do render)
    const elegiveis = voosElegiveis(d.voos, tempo, agora, 'primeira');
    conteudo = (
      <View style={{ gap: space[16] }}>
        <InfoBanner
          message={d.origem === 'ao-vivo' ? t('devVoos.aoVivo', { n: d.voos.length }) : t('devVoos.deOntem', { n: d.voos.length })}
        />
        <Text variant="Label/Strong 14" tone="tertiary">
          {t('devVoos.regioes')}
        </Text>
        {d.regioes.map((r) => (
          <Text key={r.id} variant="Body/Medium 14" tone="secondary">
            {t('devVoos.regiao', { nome: r.nome, voos: r.voos, min: Math.round((agora - r.coletadoEm) / 60_000) })}
          </Text>
        ))}
        <Text variant="Label/Strong 14" tone="tertiary">
          {t('devVoos.tempo')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[8] }}>
          {TEMPOS.map((m) => (
            <Chip key={m} size="small" label={`${m} min`} selected={tempo === m} onPress={() => setTempo(m)} />
          ))}
        </View>
        <Text variant="Body/Medium 14">
          {elegiveis.length > 0
            ? t('devVoos.elegiveis', { n: elegiveis.length, min: tempo })
            : t('devVoos.nenhum', { min: tempo, tempos: temposProximos(d.voos, tempo, agora, 'primeira').join(', ') })}
        </Text>
        {elegiveis.slice(0, 30).map(({ voo, minutosAtePouso }) => (
          <Text key={voo.hex} variant="Body/Medium 14" tone="secondary">
            {t('devVoos.voo', {
              cs: voo.callsign,
              origem: voo.origem.iata ?? voo.origem.icao ?? '?',
              destino: voo.destino.iata ?? voo.destino.icao ?? '?',
              min: minutosAtePouso,
              pais: voo.companhiaPais ? ` · ${voo.companhiaPais}` : '',
            })}
          </Text>
        ))}
        {d.atribuicao && (
          <Text variant="Caption/Regular 12" tone="tertiary">
            {d.atribuicao}
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: color.bg.app }}
      contentContainerStyle={{ paddingTop: insets.top + space[12], paddingHorizontal: screenGutter, paddingBottom: insets.bottom + space[24], gap: space[20] }}
    >
      <TopBar title={t('comum.voltar')} onBack={() => router.back()} />
      {conteudo}
    </ScrollView>
  );
}
