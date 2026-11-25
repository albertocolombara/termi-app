/**
 * 01 · Tempo de foco (dial). PRD: RF-09 a RF-11, RN-01, RN-02, RN-12, RN-20; UC-02.
 * Estados: carregando, sem internet ou erro, dados ao vivo, voo de ontem, nenhum voo no tempo escolhido.
 */
import { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useVoosDisponiveis } from '@/data/voos/useVoos';
import { DURACAO_MAXIMA_ECONOMICA_MIN } from '@/domain/sessao/duracao';
import { barrasDoDial } from '@/domain/voos/dial';
import { voosElegiveis } from '@/domain/voos/elegibilidade';
import { Button, color, InfoBanner, screenGutter, space, Text, TopBar } from '@/ds';
import { t } from '@/i18n';
import { useClasse } from '@/services/compras';

import { DialDeTempo, LegendaDoDial, TAMANHO_DO_DIAL } from './DialDeTempo';
import { duracao } from './formato';
import { useNovoVoo } from './novoVoo';
import { SeletorDeTempo } from './SeletorDeTempo';

/** Legenda (14) + espaço até o dial (4). */
const ALTURA_DA_LEGENDA = 18;

export function TelaTempoDeFoco() {
  const insets = useSafeAreaInsets();
  const classe = useClasse();
  const { tempoMin, setTempo, setVoo } = useNovoVoo();
  const [seletor, setSeletor] = useState(false);
  // Sem rolagem (Alberto, build-47): o dial ocupa o espaço que sobra e encolhe se precisar.
  const { width } = useWindowDimensions();
  const [alturaDoDial, setAlturaDoDial] = useState(0);
  const ladoDoDial = Math.floor(Math.min(TAMANHO_DO_DIAL, width - 2 * screenGutter, alturaDoDial - ALTURA_DA_LEGENDA));
  const q = useVoosDisponiveis();

  const agora = q.data?.consultadoEm ?? 0;
  const voos = useMemo(() => q.data?.voos ?? [], [q.data]);
  const barras = useMemo(() => barrasDoDial(voos, agora, tempoMin), [voos, agora, tempoMin]);
  const elegiveis = useMemo(() => voosElegiveis(voos, tempoMin, agora, classe), [voos, tempoMin, agora, classe]);
  const daPrimeira = classe === 'economica' && tempoMin > DURACAO_MAXIMA_ECONOMICA_MIN;
  const maisProximo = elegiveis[0];

  let banner;
  if (q.isPending) banner = <InfoBanner type="live" title={t('dial.procurando')} />;
  else if (q.isError) banner = <InfoBanner message={t('dial.semInternet')} />;
  else if (daPrimeira) banner = <InfoBanner message={t('dial.primeiraClasse')} />;
  else if (elegiveis.length === 0) banner = <InfoBanner message={t('dial.nenhumVoo')} />;
  else
    banner = (
      <InfoBanner
        type="live"
        title={t(elegiveis.length === 1 ? 'dial.umVoo' : 'dial.voosNoAr', { n: elegiveis.length })}
        // Só o aviso do voo de ontem: a linha "pode pousar antes ou depois" saiu para o botão caber na tela (Alberto, build-46).
        detail={q.data?.origem === 'ontem' ? t('dial.vooDeOntem') : undefined}
      />
    );

  const podeSeguir = !daPrimeira && !q.isPending && !q.isError;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg.app }}>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + space[6],
          paddingBottom: insets.bottom + space[16],
          paddingHorizontal: screenGutter,
          gap: space[16],
        }}
      >
        <View style={{ flex: 1, gap: space[16] }}>
          <TopBar title={t('comum.voltar')} onBack={() => router.back()} step={1} />
          <View style={{ gap: space[12] }}>
            <Text variant="Display/Pixel 32" style={{ color: color.text.accent }} accessibilityRole="header">
              {t('dial.titulo')}
            </Text>
            <Text variant="Body/Large 16" tone="secondary" style={{ maxWidth: 260 }}>
              {t('dial.subtitulo')}
            </Text>
          </View>
          <View
            style={{ flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', gap: space[4] }}
            onLayout={(e) => setAlturaDoDial(Math.floor(e.nativeEvent.layout.height))}
          >
            {ladoDoDial > 0 ? (
              <>
                <DialDeTempo
                  tamanho={ladoDoDial}
                  minutos={tempoMin}
                  barras={barras}
                  classe={classe}
                  onChange={setTempo}
                  onToqueNoCentro={() => setSeletor(true)}
                />
                <LegendaDoDial />
              </>
            ) : null}
          </View>
          {banner}
        </View>
        <View style={{ gap: space[4] }}>
          <Button label={t('dial.encontrarVoos')} disabled={!podeSeguir} onPress={() => router.push('/voo/partidas')} />
          {podeSeguir && maisProximo ? (
            <Button
              variant="link"
              size="medium"
              style={{ alignSelf: 'center' }}
              label={t('dial.maisProximo', { tempo: duracao(maisProximo.minutosAtePouso) })}
              onPress={() => {
                setVoo(maisProximo.voo.hex);
                router.push('/voo/embarque?rapido=1'); // UC-03: sem partidas e sem cartão
              }}
            />
          ) : null}
        </View>
      </View>
      <SeletorDeTempo
        key={String(seletor)}
        visivel={seletor}
        inicial={tempoMin}
        classe={classe}
        onFechar={() => setSeletor(false)}
        onConfirmar={(m) => {
          setTempo(m);
          setSeletor(false);
        }}
      />
    </View>
  );
}
