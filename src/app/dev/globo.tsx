import { useEffect, useMemo, useState } from 'react';
import { AppState, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, screenGutter, SegmentedControl, space, Text, ToggleRow, TopBar } from '@/ds';
import { Globo, type ModoGlobo } from '@/globo/Globo';
import { t } from '@/i18n';
import { bearing, pos, progressAt, ROUTE } from '@/janela/geo';

const DURACAO_TESTE_MIN = 80;

/**
 * Globo de teste (ferramenta de desenvolvimento): mesmo voo Barcelona → Londres da janela de teste,
 * para avaliar o globo em Skia (visual, fluidez, bateria e memória) antes de decidir a ADR-11.
 * Em segundo plano o globo é desmontado, como a janela.
 */
export default function GloboDeTeste() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [inicio] = useState(() => Date.now());
  const [agora, setAgora] = useState(() => Date.now());
  const [ativo, setAtivo] = useState(AppState.currentState === 'active');
  const [modo, setModo] = useState<ModoGlobo>('planeta');
  const [acelerar, setAcelerar] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAtivo(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ativo]);

  // No modo acelerado, 1 s real = 1 min de voo.
  const tempoDeVoo = acelerar ? inicio + (agora - inicio) * 60 : agora;
  const fim = inicio + DURACAO_TESTE_MIN * 60_000;
  const progresso = progressAt(tempoDeVoo, inicio, fim);
  const [lat, lon] = pos(progresso);
  const rumo = bearing([lat, lon], pos(Math.min(1, progresso + 0.01)));

  const aviao = useMemo(() => ({ lat, lon, rumo }), [lat, lon, rumo]);

  const alturaGlobo = Math.round(height * 0.66);

  return (
    // Sem rolagem: o arraste é do globo.
    <View style={{ flex: 1, backgroundColor: color.bg.flight, paddingBottom: insets.bottom + space[16], gap: space[16] }}>
      <View>
        {ativo ? (
          <Globo
            width={width}
            height={alturaGlobo}
            aviao={aviao}
            progresso={progresso}
            origem={{ lat: ROUTE.from.lat, lon: ROUTE.from.lon, nome: ROUTE.from.city }}
            destino={{ lat: ROUTE.to.lat, lon: ROUTE.to.lon, nome: ROUTE.to.city }}
            modo={modo}
            instante={tempoDeVoo}
          />
        ) : (
          <View style={{ width, height: alturaGlobo }} />
        )}
        <View style={{ position: 'absolute', top: insets.top + space[8], left: screenGutter, right: screenGutter }}>
          <TopBar title={t('comum.voltar')} onBack={() => router.back()} />
        </View>
      </View>

      <View style={{ paddingHorizontal: screenGutter, gap: space[16] }}>
        <Text variant="Body/Medium 14" tone="secondary">
          {t('globo.sobre', { de: ROUTE.from.code, para: ROUTE.to.code, pct: Math.round(progresso * 100) })}
        </Text>
        <SegmentedControl
          segments={[
            { value: 'planeta', label: t('globo.planeta'), icon: 'globe' },
            { value: 'seguir', label: t('globo.seguir'), icon: 'plane' },
          ]}
          value={modo}
          onChange={setModo}
        />
        <Text variant="Body/Small 13" tone="tertiary">
          {t('globo.gestos')}
        </Text>
        <ToggleRow title={t('globo.acelerar')} value={acelerar} onChange={setAcelerar} />
      </View>
    </View>
  );
}
