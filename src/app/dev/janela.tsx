import { useEffect, useMemo, useState } from 'react';
import { AppState, ScrollView, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBlocosDoVoo } from '@/data/blocos/useBlocosDoVoo';
import type { Voo } from '@/domain/voos/tipos';
import { Chip, color, screenGutter, space, Text, ToggleRow, TopBar } from '@/ds';
import { t } from '@/i18n';
import { bearing, pos, progressAt, ROUTE } from '@/janela/geo';
import { Janela, QUALITY } from '@/janela/Janela';

const DURACAO_TESTE_MIN = 80;
const QUADROS = [2, 10, 30];

/**
 * Janela de teste (ferramenta de desenvolvimento): voo Barcelona → Londres com os blocos baixados
 * do R2, como num voo real (os pacotes do protótipo saíram do APK em 25/11/2026). Serve para medir
 * desempenho, memória e bateria no aparelho.
 * Em segundo plano a janela é desmontada (lição do protótipo, build-7).
 */
export default function JanelaDeTeste() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [inicio] = useState(() => Date.now());
  const [agora, setAgora] = useState(() => Date.now());
  const [ativo, setAtivo] = useState(AppState.currentState === 'active');
  const [quadros, setQuadros] = useState(10);
  const [qualidade, setQualidade] = useState(1);
  const [nuvensSatelite, setNuvensSatelite] = useState(true);
  const [medidor, setMedidor] = useState(true);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAtivo(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ativo]);

  const fim = inicio + DURACAO_TESTE_MIN * 60_000;
  // Voo fictício na rota de teste, só para baixar os blocos à frente como no voo real.
  const vooDeTeste = useMemo<Voo>(() => {
    const [la, lo] = pos(progressAt(inicio, inicio, fim));
    const aeroporto = (a: typeof ROUTE.from) => ({ iata: a.code, icao: null, nome: a.city, cidade: a.city, pais: null, lat: a.lat, lon: a.lon });
    return {
      hex: 'teste',
      callsign: 'TESTE',
      companhia: null,
      companhiaPais: null,
      companhiaNome: null,
      aeronave: null,
      origem: aeroporto(ROUTE.from),
      destino: aeroporto(ROUTE.to),
      lat: la,
      lon: lo,
      altitudePes: 35000,
      velocidadeNos: Math.round(ROUTE.speedKmh / 1.852),
      rumo: null,
      distanciaRestanteKm: ROUTE.distKm,
      pousoPrevistoEm: fim,
      coletadoEm: inicio,
      regiao: 'teste',
    };
  }, [inicio, fim]);
  useBlocosDoVoo(vooDeTeste, ativo);
  const progresso = progressAt(agora, inicio, fim);
  const [lat, lon] = pos(progresso);
  const rumo = bearing([lat, lon], pos(Math.min(progresso + 0.01, 1))) || bearing(pos(0.98), [ROUTE.to.lat, ROUTE.to.lon]);
  const deslocamentoKm = ((agora - inicio) / 3_600_000) * ROUTE.speedKmh;
  const larguraJanela = Math.min(width - screenGutter * 2, 440);

  return (
    <ScrollView
      style={{ backgroundColor: color.bg.flight }}
      contentContainerStyle={{ paddingTop: insets.top + space[12], paddingBottom: insets.bottom + space[40], gap: space[16] }}
    >
      <View style={{ paddingHorizontal: screenGutter }}>
        <TopBar title={t('comum.voltar')} onBack={() => router.back()} />
      </View>

      {ativo ? (
        <Janela
          width={larguraJanela}
          posicao={{ lat, lon, rumo }}
          time={agora}
          driftKm={deslocamentoKm}
          fps={quadros}
          quality={qualidade}
          satClouds={nuvensSatelite}
          showMeter={medidor}
          showLandscape
          showOverlay
        />
      ) : (
        <View style={{ width: larguraJanela, height: Math.round((larguraJanela * 4) / 3), alignSelf: 'center' }} />
      )}

      <View style={{ paddingHorizontal: screenGutter, gap: space[16] }}>
        <Text variant="Body/Medium 14" tone="secondary">
          {ROUTE.from.code} → {ROUTE.to.code}
        </Text>

        <Text variant="Label/Strong 14" tone="tertiary">
          {t('janela.qualidade')}
        </Text>
        <View style={{ flexDirection: 'row', gap: space[8], flexWrap: 'wrap' }}>
          {QUALITY.map((q, i) => (
            <Chip key={q.label} label={q.label} size="small" selected={qualidade === i} onPress={() => setQualidade(i)} />
          ))}
        </View>

        <Text variant="Label/Strong 14" tone="tertiary">
          {t('janela.quadros')}
        </Text>
        <View style={{ flexDirection: 'row', gap: space[8] }}>
          {QUADROS.map((q) => (
            <Chip key={q} label={String(q)} size="small" selected={quadros === q} onPress={() => setQuadros(q)} />
          ))}
        </View>

        <ToggleRow title={t('janela.nuvensSatelite')} value={nuvensSatelite} onChange={setNuvensSatelite} />
        <ToggleRow title={t('janela.diagnostico')} value={medidor} onChange={setMedidor} />
      </View>
    </ScrollView>
  );
}
