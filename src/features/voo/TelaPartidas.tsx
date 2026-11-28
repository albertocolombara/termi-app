/**
 * 02 · Partidas. PRD: RF-12, RF-13, RN-02, RN-12; UC-02.
 * Voos no ar que pousam a até 10 min do tempo escolhido, do mais próximo; filtros de região;
 * cauda com a bandeira do país da companhia. Estados: carregando, erro, nenhum voo (tempos próximos), voo de ontem.
 */
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useVoosDisponiveis } from '@/data/voos/useVoos';
import { temposProximos, voosElegiveis, TOLERANCIA_ELEGIVEL_MIN } from '@/domain/voos/elegibilidade';
import { filtrarPorRegiao, filtrosDisponiveis, type FiltroDeRegiao } from '@/domain/voos/regioes';
import { CabecalhoDoPainel, Chip, color, InfoBanner, LinhaDoPainel, screenGutter, SectionHeader, space, Text, TopBar } from '@/ds';
import { t, type ChaveDeTexto } from '@/i18n';
import { useClasse } from '@/services/compras';

import { codigoDoLugar, duracao, duracaoCompacta, duracaoPorExtenso, nomeDoLugar } from './formato';
import { useNovoVoo } from './novoVoo';

const ROTULO: Record<FiltroDeRegiao, ChaveDeTexto> = {
  qualquer: 'partidas.qualquerLugar',
  europa: 'partidas.europa',
  'america-do-norte': 'partidas.americaDoNorte',
  'america-do-sul': 'partidas.americaDoSul',
  asia: 'partidas.asia',
  'oriente-medio': 'partidas.orienteMedio',
  oceania: 'partidas.oceania',
};

export function TelaPartidas() {
  const insets = useSafeAreaInsets();
  const classe = useClasse();
  const { tempoMin, setTempo, setVoo } = useNovoVoo();
  const [filtro, setFiltro] = useState<FiltroDeRegiao>('qualquer');
  const q = useVoosDisponiveis();
  const agora = q.data?.consultadoEm ?? 0;

  const elegiveis = useMemo(() => voosElegiveis(q.data?.voos ?? [], tempoMin, agora, classe), [q.data, tempoMin, agora, classe]);
  const filtros = useMemo(() => filtrosDisponiveis(elegiveis), [elegiveis]);
  const filtroAtivo = filtros.includes(filtro) ? filtro : 'qualquer';
  const lista = useMemo(() => filtrarPorRegiao(elegiveis, filtroAtivo), [elegiveis, filtroAtivo]);
  const sugestoes = useMemo(() => temposProximos(q.data?.voos ?? [], tempoMin, agora, classe), [q.data, tempoMin, agora, classe]);

  const escolher = (hex: string) => {
    setVoo(hex);
    router.push('/voo/cartao');
  };

  let vazio = null;
  if (q.isPending) vazio = <InfoBanner type="live" title={t('dial.procurando')} />;
  else if (q.isError) vazio = <InfoBanner message={t('dial.semInternet')} />;
  else if (elegiveis.length === 0)
    vazio = (
      <View style={{ gap: space[12] }}>
        <InfoBanner message={t('partidas.nenhum', { tempo: duracao(tempoMin) })} />
        {sugestoes.length > 0 ? (
          <View style={{ gap: space[8] }}>
            <Text variant="Label/Medium 14" tone="tertiary">
              {t('partidas.temposComVoos')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[8] }}>
              {sugestoes.map((m) => (
                <Chip key={m} label={`${m} min`} onPress={() => setTempo(m)} />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: color.bg.app }}>
      <FlashList
        data={vazio ? [] : lista}
        keyExtractor={(e) => e.voo.hex}
        contentContainerStyle={{ paddingTop: insets.top + space[6], paddingBottom: insets.bottom + 160 }}
        ListHeaderComponent={
          <View style={{ gap: space[20] }}>
            <View style={{ paddingHorizontal: screenGutter }}>
              <TopBar title={t('partidas.voltarTempo')} onBack={() => router.back()} time={duracaoCompacta(tempoMin)} step={2} />
            </View>
            <View style={{ gap: space[12] }}>
              <SectionHeader title={t('partidas.titulo')} />
              <View style={{ gap: space[20] }}>
                <Text variant="Body/Large 16" tone="tertiary" style={{ paddingHorizontal: screenGutter }}>
                  {t('partidas.subtitulo', { de: duracao(Math.max(15, tempoMin - TOLERANCIA_ELEGIVEL_MIN)), ate: duracao(tempoMin + TOLERANCIA_ELEGIVEL_MIN), tempo: duracao(tempoMin) })}
                </Text>
                {!vazio ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[8], paddingHorizontal: screenGutter }}>
                    {filtros.map((f) => (
                      <Chip key={f} label={t(ROTULO[f])} selected={f === filtroAtivo} onPress={() => setFiltro(f)} />
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            </View>
            {q.data?.origem === 'ontem' ? (
              <View style={{ paddingHorizontal: screenGutter }}>
                <InfoBanner message={t('dial.vooDeOntem')} />
              </View>
            ) : null}
            {vazio ? (
              <View style={{ paddingHorizontal: screenGutter }}>{vazio}</View>
            ) : (
              <CabecalhoDoPainel voo={t('partidas.colunaVoo')} destino={t('partidas.colunaDestino')} tempo={t('partidas.colunaTempo')} />
            )}
          </View>
        }
        renderItem={({ item, index }) => {
          const destino = nomeDoLugar(item.voo.destino);
          return (
            <LinhaDoPainel
              codigo={item.voo.callsign}
              companhia={item.voo.companhiaNome}
              pais={item.voo.companhiaPais}
              destino={destino}
              rota={`${codigoDoLugar(item.voo.origem)} → ${codigoDoLugar(item.voo.destino)}`}
              tempo={duracao(item.minutosAtePouso)}
              alternado={index % 2 === 1}
              accessibilityLabel={t('partidas.linhaAcessivel', {
                voo: item.voo.callsign,
                destino,
                codigo: codigoDoLugar(item.voo.destino),
                tempo: duracaoPorExtenso(item.minutosAtePouso),
              })}
              onPress={() => escolher(item.voo.hex)}
            />
          );
        }}
      />
      {/* Degradê: a lista continua por baixo (Figma: "Degradê · continuidade da lista") */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 160, backgroundImage: `linear-gradient(180deg, transparent 0%, ${color.bg.app} 100%)` }}
      />
    </View>
  );
}
