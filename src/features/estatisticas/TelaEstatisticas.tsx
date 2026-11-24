/**
 * M4 · Estatísticas (Figma v3, Free e Plus). PRD: RF-35.
 * Decisões do Alberto no Figma v3 (24/11/2026):
 * - Dia, semana, mês e ano liberados para todos; o globo mostra as rotas do período.
 * - A partir de "Por categoria", os blocos são do Plus: na econômica aparecem desfocados com a marca
 *   Plus, e o toque abre o paywall (RN-20).
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useIsFocused } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useVoosEncerrados } from '@/data/historico/useHistorico';
import { estatisticas, minutosCurtos } from '@/domain/historico/estatisticas';
import { rotasVoadas, voosDoPeriodo, type Periodo } from '@/domain/historico/historico';
import { color, Icon, Plus, radius, screenGutter, space, Text, TopBar, type IconName } from '@/ds';
import { GloboDeRotas } from '@/globo-rotas/GloboDeRotas';
import { t, type ChaveDeTexto } from '@/i18n';
import { useClasse } from '@/services/compras';

import { duracaoTotal } from '../voo/formato';
import { useRelogio } from '../voo/useRelogio';

const PERIODOS: Periodo[] = ['dia', 'semana', 'mes', 'ano'];
const ICONE_DA_CATEGORIA: Record<string, IconName> = {
  estudo: 'categoriaEstudo',
  trabalho: 'categoriaTrabalho',
  leitura: 'categoriaLeitura',
  criacao: 'categoriaCriacao',
  outro: 'categoriaOutro',
};
/** Exemplo desfocado na econômica (não mostra os dados do usuário por trás do desfoque). */
const EXEMPLO_CATEGORIAS = [
  { categoria: 'estudo' as const, minutos: 200 },
  { categoria: 'trabalho' as const, minutos: 120 },
  { categoria: 'leitura' as const, minutos: 50 },
];

export function TelaEstatisticas() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const focada = useIsFocused();
  const classe = useClasse();
  const plus = classe === 'primeira';
  const q = useVoosEncerrados();
  const { agora, ativo } = useRelogio(60_000);
  const [periodo, setPeriodo] = useState<Periodo>('semana');

  const voos = useMemo(() => q.data ?? [], [q.data]);
  const e = useMemo(() => estatisticas(voos, periodo, agora), [voos, periodo, agora]);
  const rotas = useMemo(() => rotasVoadas(voosDoPeriodo(voos, periodo, agora)), [voos, periodo, agora]);
  const lado = width - screenGutter * 2;
  const maior = Math.max(1, ...e.barras.map((b) => b.minutos));
  const diferenca = e.minutos - e.minutosAnterior;
  const comparacao =
    diferenca === 0
      ? t(`estatisticas.comparacao.${periodo}.igual` as ChaveDeTexto)
      : t(`estatisticas.comparacao.${periodo}.${diferenca > 0 ? 'mais' : 'menos'}` as ChaveDeTexto, { min: duracaoTotal(Math.abs(diferenca)) });
  const categorias = plus ? e.categorias : EXEMPLO_CATEGORIAS;
  const maiorCategoria = Math.max(1, ...categorias.map((c) => c.minutos));

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={{ paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[32], paddingHorizontal: screenGutter, gap: space[24] }}
    >
      <TopBar title={t('estatisticas.titulo')} onBack={() => router.back()} />

      <View style={{ gap: space[16] }}>
        {/* Período (Figma: "Período", todos liberados) */}
        <View style={styles.periodos} accessibilityRole="tablist">
          {PERIODOS.map((p) => (
            <Pressable
              key={p}
              accessibilityRole="tab"
              accessibilityState={{ selected: periodo === p }}
              onPress={() => setPeriodo(p)}
              style={[styles.periodo, periodo === p && styles.periodoAtivo]}
            >
              <Text variant="Label/Medium 14" tone={periodo === p ? 'primary' : 'tertiary'}>
                {t(`estatisticas.${p}` as ChaveDeTexto)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Globo com as rotas do período */}
        {q.isSuccess ? (
          <GloboDeRotas rotas={rotas} largura={lado} altura={lado} agora={agora} ativo={focada && ativo} dentroDeRolagem />
        ) : (
          <View style={{ width: lado, height: lado }} />
        )}

        <View style={{ gap: space[2] }}>
          <Text variant="Display/Data 52">{duracaoTotal(e.minutos)}</Text>
          <Text variant="Body/Small 13" tone="tertiary">
            {t(`estatisticas.deFoco.${periodo}` as ChaveDeTexto)} · {comparacao}
          </Text>
        </View>

        {/* Por dia (ou faixa do período) */}
        <View style={styles.barras}>
          {e.barras.map((b) => {
            const altura = b.minutos ? Math.max(6, (b.minutos / maior) * 76) : 3;
            return (
              <View
                key={b.rotulo}
                style={styles.coluna}
                accessible
                accessibilityLabel={t('estatisticas.barraAcessivel', { rotulo: b.rotulo, tempo: duracaoTotal(b.minutos) })}
              >
                {b.minutos ? (
                  <Text variant="Caption/Regular 12" tone={b.atual ? 'accent' : 'muted'} numberOfLines={1}>
                    {minutosCurtos(b.minutos)}
                  </Text>
                ) : null}
                <View style={[styles.barra, { height: altura, backgroundColor: b.atual && b.minutos ? color.accent.default : color.surface.strong }]} />
                <Text variant="Caption/Medium 12" tone={b.atual ? 'accent' : 'tertiary'} numberOfLines={1}>
                  {b.rotulo}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Voos */}
        <View style={{ gap: space[8] }}>
          <View style={styles.linhaDeBlocos}>
            <Bloco valor={String(e.voos)} rotulo={t('estatisticas.voos')} />
            <Bloco valor={String(e.pousos)} rotulo={t('estatisticas.pousos')} />
            <Bloco valor={dias(e.sequencia)} rotulo={t('estatisticas.seguidos')} />
          </View>
          <View style={styles.linhaDeBlocos}>
            <Bloco valor={String(e.pousosAntes)} rotulo={t('estatisticas.pousosAntes')} />
            <Bloco valor={String(e.servicos)} rotulo={t('estatisticas.servicos')} />
            <Bloco valor={dias(e.recorde)} rotulo={t('estatisticas.recorde')} />
          </View>
        </View>

        {/* Por categoria: Plus */}
        <Pressable
          disabled={plus}
          accessibilityRole={plus ? undefined : 'button'}
          accessibilityLabel={plus ? undefined : t('estatisticas.plusAcessivel')}
          onPress={() => router.push('/primeira-classe')}
          style={{ gap: space[12], paddingVertical: space[16] }}
        >
          <View style={styles.tituloDoBloco}>
            {plus ? null : <Plus />}
            <Text variant="Label/Strong 14">{t('estatisticas.porCategoria')}</Text>
          </View>
          <View style={[{ gap: space[12] }, !plus && styles.bloqueado]} importantForAccessibility={plus ? 'auto' : 'no-hide-descendants'}>
            {plus && categorias.length === 0 ? (
              <Text variant="Body/Small 13" tone="tertiary">
                {t('estatisticas.semCategoria')}
              </Text>
            ) : null}
            {categorias.map((c) => (
              <View key={c.categoria} style={{ gap: space[6] }}>
                <View style={styles.linhaDaCategoria}>
                  <View style={styles.nomeDaCategoria}>
                    <Icon name={ICONE_DA_CATEGORIA[c.categoria]} size={12} />
                    <Text variant="Body/Medium 14">{t(`motivo.categorias.${c.categoria}` as ChaveDeTexto)}</Text>
                  </View>
                  <Text variant="Label/Medium 14" tone="secondary">
                    {duracaoTotal(c.minutos)}
                  </Text>
                </View>
                <View style={styles.trilho}>
                  <View style={[styles.preenchido, { width: `${(c.minutos / maiorCategoria) * 100}%`, backgroundColor: color.categoria[c.categoria] }]} />
                </View>
              </View>
            ))}
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const dias = (n: number) => (n === 1 ? t('estatisticas.umDia') : t('estatisticas.dias', { n }));

function Bloco({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={styles.bloco} accessible accessibilityLabel={`${valor} ${rotulo}`}>
      <Text variant="Label/Strong 14">{valor}</Text>
      <Text variant="Caption/Regular 12" tone="tertiary" numberOfLines={1}>
        {rotulo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app },
  periodos: { flexDirection: 'row', gap: space[4], padding: space[4], borderRadius: radius.lg, backgroundColor: color.surface.sunken },
  periodo: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 36, borderRadius: radius.tile },
  periodoAtivo: { backgroundColor: color.surface.strong },
  barras: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space[4], paddingTop: space[16], paddingBottom: space[12], minHeight: 148 },
  coluna: { flex: 1, maxWidth: 32, alignItems: 'center', gap: space[6] },
  barra: { width: '100%', borderRadius: radius.sm },
  linhaDeBlocos: { flexDirection: 'row', gap: space[8] },
  bloco: { flex: 1, gap: space[2], paddingVertical: space[10], paddingHorizontal: space[12], borderRadius: radius.lg, backgroundColor: color.surface.subtle },
  tituloDoBloco: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  bloqueado: { opacity: 0.35, filter: 'blur(5px)' },
  linhaDaCategoria: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nomeDaCategoria: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  trilho: { height: 6, borderRadius: 3, backgroundColor: color.surface.strong, overflow: 'hidden' },
  preenchido: { height: 6, borderRadius: 3 },
});
