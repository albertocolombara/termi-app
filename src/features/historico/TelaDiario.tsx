/**
 * M3 · Diário de bordo e X7 · Diário vazio (Figma v3). PRD: RF-34; UC-11.
 * Todos os voos, inclusive os que pousaram antes ("Pousou antes" em cor neutra), agrupados por dia,
 * com filtro por categoria do motivo da viagem.
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useContagens, useVoosEncerrados } from '@/data/historico/useHistorico';
import { estatisticas } from '@/domain/historico/estatisticas';
import { resumoDoDiario, voosDoPeriodo, voosPorDia, type VooDoDiario } from '@/domain/historico/historico';
import { CATEGORIAS, type Categoria } from '@/domain/sessao/motivo';
import { Button, Cauda, CategoriaTag, Chip, color, radius, screenGutter, space, Text, TopBar } from '@/ds';
import { t, type ChaveDeTexto } from '@/i18n';

import { duracao, duracaoTotal, horaLocal, nomeDoLugar } from '../voo/formato';
import { useRelogio } from '../voo/useRelogio';

export function TelaDiario() {
  const insets = useSafeAreaInsets();
  const q = useVoosEncerrados();
  const contagens = useContagens();
  const { agora } = useRelogio(60_000);
  const [filtro, setFiltro] = useState<Categoria | null>(null);

  const voos = useMemo(() => q.data ?? [], [q.data]);
  const mes = resumoDoDiario(voosDoPeriodo(voos, 'mes', agora));
  const statsMes = useMemo(() => estatisticas(voos, 'mes', agora), [voos, agora]);
  const saldo = contagens.data?.saldo ?? 0;
  const taxaConcluidos = mes.voos > 0 ? Math.round((mes.concluidos / mes.voos) * 100) : 0;
  const filtrados = filtro ? voos.filter((v) => v.categoria === filtro) : voos;
  const grupos = voosPorDia(filtrados, agora);
  const vazio = q.isSuccess && voos.length === 0;

  return (
    <View style={styles.tela}>
      <ScrollView
        contentContainerStyle={[styles.conteudo, { paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[24] }]}
      >
        <View style={{ gap: space[20] }}>
          <TopBar title={t('diario.titulo')} onBack={() => router.back()} />
          {vazio ? (
            <DiarioVazio carimbos={contagens.data?.carimbos ?? 0} />
          ) : (
            <View style={{ gap: space[16] }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[6] }} style={{ marginHorizontal: -screenGutter }}>
                <View style={{ width: screenGutter - space[6] }} />
                <Chip size="small" label={t('diario.todos')} selected={filtro === null} onPress={() => setFiltro(null)} />
                {CATEGORIAS.map((c) => (
                  <Chip key={c} size="small" label={t(`motivo.categorias.${c}` as ChaveDeTexto)} selected={filtro === c} onPress={() => setFiltro(c)} />
                ))}
                <View style={{ width: screenGutter - space[6] }} />
              </ScrollView>

              {/* Hero Papel Marfim 1:1 (Figma D1 · Diário de bordo · Clean) */}
              <View style={styles.heroPapel}>
                <View style={styles.heroTopo}>
                  <Text variant="Caption/Regular 12" tone="onPaper" style={{ opacity: 0.6 }}>
                    Tempo em foco este mês
                  </Text>
                  {statsMes.sequencia > 0 ? (
                    <View style={styles.streakBadge}>
                      <Text variant="Caption/Medium 12" style={{ fontSize: 11 }}>
                        {`🔥 ${statsMes.sequencia}d seguidos`}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text variant="Heading/Screen 32" tone="onPaper" style={{ fontSize: 38, lineHeight: 42, fontWeight: '500' }}>
                  {duracaoTotal(mes.minutos)}
                </Text>
                <Text variant="Caption/Regular 12" tone="onPaper" style={{ opacity: 0.6 }}>
                  {`${taxaConcluidos}% dos voos concluídos`}
                </Text>
                <View style={styles.heroTrilho}>
                  <View style={[styles.heroBarra, { width: `${taxaConcluidos}%` }]} />
                </View>
              </View>

              {/* 2 cards compactos: Voos no mês + Saldo acumulado */}
              <View style={styles.duplaCards}>
                <View style={styles.miniCard}>
                  <Text variant="Caption/Regular 12" tone="tertiary">Voos no mês</Text>
                  <Text variant="Heading/Data 24">{String(mes.voos)}</Text>
                </View>
                <View style={styles.miniCard}>
                  <Text variant="Caption/Regular 12" tone="tertiary">Saldo acumulado</Text>
                  <Text variant="Heading/Data 24">{`$ ${saldo.toLocaleString('pt-BR')}`}</Text>
                </View>
              </View>

              {grupos.length === 0 && q.isSuccess ? (
                <Text variant="Body/Medium 14" tone="secondary" style={{ paddingVertical: space[16] }}>
                  {t('diario.nenhumNaCategoria')}
                </Text>
              ) : null}
              {grupos.map((g) => (
                <View key={g.dia} style={{ gap: space[8] }}>
                  <Text variant="Caption/Strong 12" tone="tertiary" accessibilityRole="header">
                    {g.dia}
                  </Text>
                  <View style={styles.tabelaCard}>
                    {g.voos.map((v, idx) => (
                      <LinhaDoDiario key={v.id} voo={v} ultima={idx === g.voos.length - 1} />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
        {vazio ? <Button variant="secondary" label={t('diario.encontrarVoos')} onPress={() => router.push('/voo')} /> : null}
      </ScrollView>
    </View>
  );
}

function LinhaDoDiario({ voo, ultima }: { voo: VooDoDiario; ultima?: boolean }) {
  const antes = voo.resultado === 'pousou_antes';
  const rota = `${nomeDoLugar(voo.origem)} → ${nomeDoLugar(voo.destino)}`;
  const resultado = antes ? t('diario.pousouAntes') : t('diario.pousou');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('diario.linhaAcessivel', { rota, voo: voo.callsign, duracao: duracao(voo.minutosFoco), resultado })}
      onPress={() => router.push({ pathname: '/diario/[id]', params: { id: voo.id } })}
      style={({ pressed }) => [styles.linha, !ultima && styles.linhaDivisor, pressed && { opacity: 0.8 }]}
    >
      <Cauda pais={voo.companhiaPais} tamanho={24} />
      <View style={{ flex: 1, gap: space[4] }}>
        <Text variant="Label/Medium 14" numberOfLines={1}>
          {rota}
        </Text>
        <View style={styles.meta}>
          <View style={styles.callsignChip}>
            <Text variant="Caption/Regular 12" tone="tertiary" style={{ fontSize: 10.5 }}>
              {voo.callsign}
            </Text>
          </View>
          <View style={[styles.pontoResultado, { backgroundColor: antes ? color.text.tertiary : color.status.success }]} />
          <Text variant="Caption/Regular 12" tone="tertiary" style={{ fontSize: 11 }}>
            {`${resultado} · ${horaLocal(voo.embarcouEm)}`}
          </Text>
        </View>
      </View>
      {voo.categoria ? <CategoriaTag categoria={voo.categoria} rotulo={t(`motivo.categorias.${voo.categoria}` as ChaveDeTexto)} /> : null}
      <View style={{ alignItems: 'flex-end', gap: space[4], minWidth: 48 }}>
        <Text variant="Label/Medium 14" style={{ fontSize: 13 }}>{duracaoComMin(voo.minutosFoco)}</Text>
        <View style={styles.miniBarraTrilho}>
          <View style={[styles.miniBarraFill, { width: antes ? '55%' : '100%', backgroundColor: antes ? color.text.tertiary : color.accent.default }]} />
        </View>
      </View>
    </Pressable>
  );
}

/** "52 min" ou "1h 35min", como no diário do Figma. */
const duracaoComMin = (min: number) => (min < 60 ? `${min} min` : duracaoTotal(min));

/** X7: indicadores zerados, linhas de exemplo apagadas e a explicação. */
function DiarioVazio({ carimbos }: { carimbos: number }) {
  return (
    <View style={{ gap: space[16] }}>
      <View style={styles.indicadores}>
        <Indicador valor="0 min" rotulo={t('diario.estaSemana')} />
        <View style={styles.divisor} />
        <Indicador valor="0" rotulo={t('diario.voosRotulo')} />
        <View style={styles.divisor} />
        <Indicador valor={String(carimbos)} rotulo={t('diario.carimbos')} />
      </View>
      <View importantForAccessibility="no-hide-descendants">
        {[0.5, 0.36, 0.22].map((opacidade) => (
          <View key={opacidade} style={[styles.exemplo, { opacity: opacidade }]}>
            <View style={[styles.bloco, { width: 36, height: 28, borderRadius: radius.md }]} />
            <View style={{ flex: 1, gap: space[6] }}>
              <View style={[styles.bloco, { width: 150, height: 10, borderRadius: 5 }]} />
              <View style={[styles.bloco, { width: 96, height: 8, borderRadius: 4 }]} />
            </View>
            <View style={[styles.bloco, { width: 44, height: 10, borderRadius: 5 }]} />
          </View>
        ))}
      </View>
      <View style={{ gap: space[8], paddingTop: space[8], paddingHorizontal: space[12] }}>
        <Text variant="Heading/Sheet 22">{t('diario.vazioTitulo')}</Text>
        <Text variant="Body/Medium 14" tone="secondary">
          {t('diario.vazioTexto')}
        </Text>
      </View>
    </View>
  );
}

function Indicador({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={styles.indicador}>
      <Text variant="Heading/Data 24" tone="muted">
        {valor}
      </Text>
      <Text variant="Caption/Regular 12" tone="muted">
        {rotulo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app },
  conteudo: { flexGrow: 1, justifyContent: 'space-between', gap: space[24], paddingHorizontal: screenGutter },
  heroPapel: {
    backgroundColor: color.surface.paper,
    borderRadius: radius.card,
    padding: space[20],
    gap: space[8],
  },
  heroTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[8] },
  streakBadge: {
    paddingVertical: space[4],
    paddingHorizontal: space[10],
    borderRadius: radius.full,
    backgroundColor: color.bg.app,
  },
  heroTrilho: { height: 3, borderRadius: radius.full, backgroundColor: 'rgba(11, 13, 18, 0.14)', overflow: 'hidden', marginTop: space[4] },
  heroBarra: { height: '100%', borderRadius: radius.full, backgroundColor: color.text.onPaper },
  duplaCards: { flexDirection: 'row', gap: space[10] },
  miniCard: { flex: 1, gap: space[6], padding: space[16], borderRadius: radius.card, backgroundColor: color.surface.card },
  tabelaCard: { borderRadius: radius.card, backgroundColor: color.surface.card, paddingHorizontal: space[14] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[10], paddingVertical: space[12], minHeight: 62 },
  linhaDivisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border.subtle },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space[6], flexWrap: 'wrap' },
  callsignChip: { paddingVertical: 1, paddingHorizontal: space[6], borderRadius: radius.xs, backgroundColor: color.surface.subtle },
  pontoResultado: { width: 5, height: 5, borderRadius: 2.5 },
  miniBarraTrilho: { width: 44, height: 2.5, borderRadius: radius.full, backgroundColor: color.surface.default, overflow: 'hidden' },
  miniBarraFill: { height: '100%', borderRadius: radius.full },
  indicadores: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.subtle,
    paddingVertical: space[14],
  },
  divisor: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: color.border.subtle },
  indicador: { flex: 1, gap: space[2], paddingHorizontal: space[8] },
  exemplo: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[12] },
  bloco: { backgroundColor: color.surface.default },
});
