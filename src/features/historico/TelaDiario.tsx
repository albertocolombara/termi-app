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
  const semana = resumoDoDiario(voosDoPeriodo(voos, 'semana', agora));
  const filtrados = filtro ? voos.filter((v) => v.categoria === filtro) : voos;
  const grupos = voosPorDia(filtrados, agora);
  const vazio = q.isSuccess && voos.length === 0;

  return (
    <View style={styles.tela}>
      <ScrollView
        contentContainerStyle={[styles.conteudo, { paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[24] }]}
      >
        <View style={{ gap: space[24] }}>
          <TopBar title={t('diario.titulo')} onBack={() => router.back()} />
          {vazio ? (
            <DiarioVazio carimbos={contagens.data?.carimbos ?? 0} />
          ) : (
            <View style={{ gap: space[12] }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[6] }} style={{ marginHorizontal: -screenGutter }}>
                <View style={{ width: screenGutter - space[6] }} />
                <Chip size="small" label={t('diario.todos')} selected={filtro === null} onPress={() => setFiltro(null)} />
                {CATEGORIAS.map((c) => (
                  <Chip key={c} size="small" label={t(`motivo.categorias.${c}` as ChaveDeTexto)} selected={filtro === c} onPress={() => setFiltro(c)} />
                ))}
                <View style={{ width: screenGutter - space[6] }} />
              </ScrollView>
              <Text variant="Body/Small 13" tone="tertiary">
                {t('diario.resumo', {
                  voos: semana.voos === 1 ? t('diario.umVoo') : t('diario.voos', { n: semana.voos }),
                  tempo: duracaoTotal(semana.minutos),
                })}
              </Text>
              {grupos.length === 0 && q.isSuccess ? (
                <Text variant="Body/Medium 14" tone="secondary" style={{ paddingVertical: space[16] }}>
                  {t('diario.nenhumNaCategoria')}
                </Text>
              ) : null}
              {grupos.map((g) => (
                <View key={g.dia} style={{ paddingTop: space[4] }}>
                  <Text variant="Caption/Strong 12" tone="tertiary" accessibilityRole="header">
                    {g.dia}
                  </Text>
                  {g.voos.map((v) => (
                    <LinhaDoDiario key={v.id} voo={v} />
                  ))}
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

function LinhaDoDiario({ voo }: { voo: VooDoDiario }) {
  const antes = voo.resultado === 'pousou_antes';
  const rota = `${nomeDoLugar(voo.origem)} → ${nomeDoLugar(voo.destino)}`;
  const resultado = antes ? t('diario.pousouAntes') : t('diario.pousou');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('diario.linhaAcessivel', { rota, voo: voo.callsign, duracao: duracao(voo.minutosFoco), resultado })}
      onPress={() => router.push({ pathname: '/diario/[id]', params: { id: voo.id } })}
      style={({ pressed }) => [styles.linha, pressed && { opacity: 0.8 }]}
    >
      <Cauda pais={voo.companhiaPais} />
      <View style={{ flex: 1, gap: space[2] }}>
        <Text variant="Label/Medium 14" numberOfLines={1}>
          {rota}
        </Text>
        <View style={styles.meta}>
          <Text variant="Caption/Regular 12" tone="tertiary">
            {t('diario.horario', { voo: voo.callsign, hora: horaLocal(voo.embarcouEm) })}
          </Text>
          {voo.categoria ? <CategoriaTag categoria={voo.categoria} rotulo={t(`motivo.categorias.${voo.categoria}` as ChaveDeTexto)} /> : null}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: space[2] }}>
        <Text variant="Label/Strong 14">{duracaoComMin(voo.minutosFoco)}</Text>
        {/* "Pousou antes" em cor neutra (CLAUDE.md §9). */}
        <Text variant="Caption/Medium 12" style={{ color: antes ? color.text.secondary : color.status.success }}>
          {resultado}
        </Text>
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
        <Indicador valor="0" rotulo={t('diario.voosRotulo')} />
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
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[10], minHeight: 62 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space[6], flexWrap: 'wrap' },
  indicadores: { flexDirection: 'row', gap: space[8] },
  indicador: { flex: 1, gap: space[2], padding: space[12], borderRadius: radius.lg, backgroundColor: color.surface.default },
  exemplo: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[12] },
  bloco: { backgroundColor: color.surface.default },
});
