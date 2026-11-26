/**
 * M4 · Estatísticas (Figma v3; blocos de desempenho da proposta v4, 546:8545, de 26/11/2026). PRD: RF-35.
 * Decisões do Alberto no Figma v3 (24/11/2026):
 * - Dia, semana, mês e ano liberados para todos; o globo mostra as rotas do período.
 * - A partir de "Por categoria", os blocos são do Plus: na econômica aparecem desfocados com a marca
 *   Plus e dados de exemplo (nunca os do usuário por trás do desfoque), e o toque abre o paywall (RN-20).
 *   Na v4: Por categoria, Bagagem de mão, Pelo mundo e Milhas. Antes deles, para todos: média e melhor
 *   dia, resumo, sequência da semana e "Quando você foca".
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useIsFocused } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useVoosEncerrados } from '@/data/historico/useHistorico';
import {
  bagagemDeMao,
  horarioDeFoco,
  mediaEMelhor,
  milhasDoPeriodo,
  peloMundo,
  porcentagens,
  resumo,
  semanaDaSequencia,
  type Bagagem,
  type DiaDaSemana,
  type MilhasDoPeriodo,
  type PeloMundo,
} from '@/domain/historico/desempenho';
import { estatisticas, minutosCurtos } from '@/domain/historico/estatisticas';
import type { Categoria } from '@/domain/sessao/motivo';
import { statusDeViajante } from '@/domain/status/niveis';
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
/** Exemplos desfocados na econômica (não mostram os dados do usuário por trás do desfoque). */
const EXEMPLO_CATEGORIAS: { categoria: Categoria; minutos: number }[] = [
  { categoria: 'estudo', minutos: 200 },
  { categoria: 'trabalho', minutos: 120 },
  { categoria: 'leitura', minutos: 50 },
];
const EXEMPLO_BAGAGEM: Bagagem = { tarefas: 16, feitas: 12, voosComTarefas: 6, voos: 9 };
const EXEMPLO_MUNDO: PeloMundo = { km: 6240, paisesNovos: 3, cidades: 5, rotaMaisVoada: { origem: 'Barcelona', destino: 'Londres', voos: 3 }, voltaDaTerra: 0.16 };
const EXEMPLO_MILHAS: MilhasDoPeriodo = { doPeriodo: 2140, total: 4820, status: statusDeViajante(4820) };
const ALTURA_DO_HORARIO = 72;

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
  const mm = useMemo(() => mediaEMelhor(voos, periodo, agora), [voos, periodo, agora]);
  const r = useMemo(() => resumo(voos, periodo, agora), [voos, periodo, agora]);
  const semana = useMemo(() => semanaDaSequencia(voos, agora), [voos, agora]);
  const horario = useMemo(() => horarioDeFoco(voos, periodo, agora), [voos, periodo, agora]);
  const categorias = porcentagens(plus ? e.categorias : EXEMPLO_CATEGORIAS);
  const bagagem = useMemo(() => (plus ? bagagemDeMao(voos, periodo, agora) : EXEMPLO_BAGAGEM), [plus, voos, periodo, agora]);
  const mundo = useMemo(() => (plus ? peloMundo(voos, periodo, agora) : EXEMPLO_MUNDO), [plus, voos, periodo, agora]);
  const milhas = useMemo(() => (plus ? milhasDoPeriodo(voos, periodo, agora) : EXEMPLO_MILHAS), [plus, voos, periodo, agora]);
  const maiorFaixa = Math.max(1, ...horario.faixas);

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

        {/* Média e melhor dia (Figma v4: "Média") */}
        {periodo !== 'dia' && e.minutos > 0 ? (
          <View style={styles.media}>
            <Rotulado rotulo={t('estatisticas.media')} valor={t(mm.unidade === 'mes' ? 'estatisticas.mediaPorMes' : 'estatisticas.mediaPorDia', { tempo: duracaoTotal(mm.media) })} />
            {mm.melhor ? (
              <Rotulado
                rotulo={t(periodo === 'ano' ? 'estatisticas.melhorMes' : 'estatisticas.melhorDia')}
                valor={`${quando(mm.melhor.quando, periodo)}, ${minutosCurtos(mm.melhor.minutos)}`}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Resumo */}
      <View style={{ gap: space[12] }}>
        <Text variant="Label/Strong 14" accessibilityRole="header">
          {t(`estatisticas.resumo.${periodo}` as ChaveDeTexto)}
        </Text>
        <View style={{ gap: space[8] }}>
          <View style={styles.linhaDeBlocos}>
            <Bloco valor={String(r.voos)} rotulo={t('estatisticas.voos')} />
            <Bloco valor={String(r.pousos)} rotulo={t('estatisticas.pousosCompletos')} />
            <Bloco valor={String(r.pousosAntes)} rotulo={t('estatisticas.pousaramAntes')} />
          </View>
          <View style={styles.linhaDeBlocos}>
            <Bloco valor={r.voos ? duracaoTotal(r.sessaoMedia) : '—'} rotulo={t('estatisticas.sessaoMedia')} />
            <Bloco valor={r.voos ? minutosCurtos(r.vooMaisLongo) : '—'} rotulo={t('estatisticas.vooMaisLongo')} />
            <Bloco valor={String(e.servicos)} rotulo={t('estatisticas.servicos')} />
          </View>
        </View>
        {r.voos ? (
          <View style={{ gap: space[6] }}>
            <View style={styles.divisao} accessible accessibilityLabel={t('estatisticas.chegaram', { porcento: Math.round(r.chegaram * 100) })}>
              {r.pousos ? <View style={[styles.parte, { flex: r.pousos, backgroundColor: color.accent.default }]} /> : null}
              {r.pousosAntes ? <View style={[styles.parte, { flex: r.pousosAntes, backgroundColor: color.surface.track }]} /> : null}
            </View>
            <Text variant="Caption/Regular 12" tone="tertiary">
              {t('estatisticas.chegaram', { porcento: Math.round(r.chegaram * 100) })}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Sequência */}
      <View style={styles.sequencia}>
        <View style={{ flex: 1, gap: space[2] }}>
          <Text variant="Heading/Data 24">{t('estatisticas.seguidosTitulo', { dias: dias(e.sequencia) })}</Text>
          <Text variant="Caption/Regular 12" tone="tertiary">
            {t('estatisticas.recordeDe', { dias: dias(e.recorde) })}
          </Text>
        </View>
        <SemanaDaSequencia dias={semana} />
      </View>

      {/* Quando você foca */}
      <View style={{ gap: space[12] }}>
        <View style={{ gap: space[2] }}>
          <Text variant="Label/Strong 14" accessibilityRole="header">
            {t('estatisticas.quandoFoca')}
          </Text>
          <Text variant="Body/Small 13" tone="tertiary">
            {horario.maisForte ? t('estatisticas.horarioMaisForte', horario.maisForte) : t('estatisticas.horarioSemVoos')}
          </Text>
        </View>
        <View
          style={styles.horario}
          accessible
          accessibilityLabel={horario.maisForte ? t('estatisticas.horarioAcessivel', horario.maisForte) : t('estatisticas.horarioSemVoos')}
        >
          {horario.faixas.map((minutos, i) => {
            const forte = !!horario.maisForte && i * 2 >= horario.maisForte.de && i * 2 < horario.maisForte.ate;
            return (
              <View
                key={i}
                style={[styles.faixa, { height: minutos ? Math.max(6, (minutos / maiorFaixa) * ALTURA_DO_HORARIO) : 3, backgroundColor: forte ? color.accent.default : color.surface.strong }]}
              />
            );
          })}
        </View>
        <View style={styles.eixo} importantForAccessibility="no-hide-descendants">
          {['0h', '6h', '12h', '18h', '24h'].map((h) => (
            <Text key={h} variant="Caption/Regular 12" tone="muted">
              {h}
            </Text>
          ))}
        </View>
      </View>

      {/* Por categoria (Plus) */}
      <BlocoPlus plus={plus} titulo={t('estatisticas.porCategoria')}>
        {plus && categorias.length === 0 ? (
          <Text variant="Body/Small 13" tone="tertiary">
            {t('estatisticas.semCategoria')}
          </Text>
        ) : (
          <>
            <View style={styles.divisao}>
              {categorias.map((c) => (
                <View key={c.categoria} style={[styles.parte, { flex: c.minutos, height: 8, backgroundColor: color.categoria[c.categoria] }]} />
              ))}
            </View>
            {categorias.map((c) => (
              <View key={c.categoria} style={styles.linhaDaCategoria} accessible accessibilityLabel={`${t(`motivo.categorias.${c.categoria}` as ChaveDeTexto)}: ${duracaoTotal(c.minutos)}, ${c.porcento}%`}>
                <View style={styles.nomeDaCategoria}>
                  <Icon name={ICONE_DA_CATEGORIA[c.categoria]} size={12} />
                  <Text variant="Body/Medium 14">{t(`motivo.categorias.${c.categoria}` as ChaveDeTexto)}</Text>
                </View>
                <Text variant="Label/Medium 14" tone="secondary">
                  {duracaoTotal(c.minutos)}
                </Text>
                <Text variant="Caption/Regular 12" tone="tertiary" style={styles.porcento}>
                  {`${c.porcento}%`}
                </Text>
              </View>
            ))}
          </>
        )}
      </BlocoPlus>

      {/* Bagagem de mão (Plus) */}
      <BlocoPlus plus={plus} titulo={t('estatisticas.bagagem')} subtitulo={t('estatisticas.bagagemTexto')}>
        {bagagem.tarefas === 0 ? (
          <Text variant="Body/Small 13" tone="tertiary">
            {t('estatisticas.semTarefas')}
          </Text>
        ) : (
          <>
            <View style={styles.linhaBase}>
              <Text variant="Heading/Data 24">{t('estatisticas.tarefasDe', { feitas: bagagem.feitas, total: bagagem.tarefas })}</Text>
              <Text variant="Body/Small 13" tone="tertiary">
                {t('estatisticas.tarefasConcluidas')}
              </Text>
            </View>
            <Progresso fracao={bagagem.feitas / bagagem.tarefas} altura={6} />
            <Text variant="Caption/Regular 12" tone="tertiary">
              {t('estatisticas.voosComTarefas', { n: bagagem.voosComTarefas, total: bagagem.voos })}
            </Text>
          </>
        )}
      </BlocoPlus>

      {/* Pelo mundo (Plus) */}
      <BlocoPlus plus={plus} titulo={t('estatisticas.peloMundo')}>
        <View style={styles.linhaDeBlocos}>
          <Bloco valor={`${mundo.km.toLocaleString('pt-BR')} km`} rotulo={t('estatisticas.kmVoados')} />
          <Bloco valor={String(mundo.paisesNovos)} rotulo={t('estatisticas.paisesNovos')} />
          <Bloco valor={String(mundo.cidades)} rotulo={t('estatisticas.cidades')} />
        </View>
        {mundo.rotaMaisVoada ? (
          <View style={styles.cartao}>
            <Text variant="Caption/Regular 12" tone="tertiary">
              {t('estatisticas.rotaMaisVoada')}
            </Text>
            <Text variant="Label/Medium 14">
              {t('estatisticas.rota', {
                origem: mundo.rotaMaisVoada.origem,
                destino: mundo.rotaMaisVoada.destino,
                voos: mundo.rotaMaisVoada.voos === 1 ? t('estatisticas.umVoo') : t('estatisticas.nVoos', { n: mundo.rotaMaisVoada.voos }),
              })}
            </Text>
          </View>
        ) : null}
        {mundo.km > 0 ? (
          <Text variant="Caption/Regular 12" tone="tertiary">
            {mundo.voltaDaTerra < 1
              ? t('estatisticas.voltaDaTerra', { porcento: Math.max(1, Math.round(mundo.voltaDaTerra * 100)) })
              : t('estatisticas.voltasDaTerra', { voltas: mundo.voltaDaTerra.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) })}
          </Text>
        ) : null}
      </BlocoPlus>

      {/* Milhas (Plus) */}
      <BlocoPlus plus={plus} titulo={t('estatisticas.milhasTitulo')}>
        <Pressable
          disabled={!plus}
          accessibilityRole="button"
          onPress={() => router.push('/milhas')}
          style={({ pressed }) => [styles.cartao, { gap: space[8] }, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.linhaDaCategoria}>
            <Text variant="Label/Medium 14" style={{ flex: 1 }}>
              {t(`estatisticas.milhasNoPeriodo.${periodo}` as ChaveDeTexto, { milhas: milhas.doPeriodo.toLocaleString('pt-BR') })}
            </Text>
            <Icon name="chevronRight" />
          </View>
          <Progresso fracao={milhas.status.progresso} altura={4} />
          <Text variant="Caption/Regular 12" tone="tertiary">
            {milhas.status.proximo
              ? t('estatisticas.milhasStatus', {
                  total: milhas.total.toLocaleString('pt-BR'),
                  faltam: milhas.status.faltam.toLocaleString('pt-BR'),
                  proximo: milhas.status.proximo.nome,
                })
              : t('estatisticas.milhasNomade', { total: milhas.total.toLocaleString('pt-BR'), atual: milhas.status.atual.nome })}
          </Text>
        </Pressable>
      </BlocoPlus>
    </ScrollView>
  );
}

const dias = (n: number) => (n === 1 ? t('estatisticas.umDia') : t('estatisticas.dias', { n }));

/** "quinta" (semana), "12 nov" (mês) ou "março" (ano). */
function quando(ms: number, periodo: Periodo): string {
  const d = new Date(ms);
  if (periodo === 'ano') return d.toLocaleDateString('pt-BR', { month: 'long' });
  if (periodo === 'semana') return d.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0];
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace(/\./g, '').replace(/ de /g, ' ');
}

function Rotulado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.rotulado} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <Text variant="Caption/Regular 12" tone="tertiary">
        {rotulo}
      </Text>
      <Text variant="Caption/Medium 12" tone="secondary">
        {valor}
      </Text>
    </View>
  );
}

function Progresso({ fracao, altura }: { fracao: number; altura: number }) {
  return (
    <View style={[styles.trilho, { height: altura, borderRadius: altura / 2 }]}>
      <View style={{ height: altura, borderRadius: altura / 2, width: `${Math.round(Math.min(1, Math.max(0, fracao)) * 100)}%`, backgroundColor: color.accent.default }} />
    </View>
  );
}

/** Semana corrente no cartão da sequência (Figma v4: bolinhas S T Q Q S S D). */
function SemanaDaSequencia({ dias: semana }: { dias: DiaDaSemana[] }) {
  const descricao = semana.map((d) => (d.estado === 'voou' || d.estado === 'hoje-voou' ? t('estatisticas.diaComFoco', { dia: d.rotulo }) : t('estatisticas.diaSemFoco', { dia: d.rotulo })));
  return (
    <View style={styles.semana} accessible accessibilityLabel={t('estatisticas.semanaAcessivel', { dias: descricao.join(', ') })}>
      {semana.map((d, i) => {
        const hoje = d.estado === 'hoje' || d.estado === 'hoje-voou';
        return (
          <View key={i} style={{ alignItems: 'center', gap: space[4] }}>
            <View
              style={[
                styles.bolinha,
                d.estado === 'voou' && { backgroundColor: color.text.muted },
                d.estado === 'hoje-voou' && { backgroundColor: color.accent.default },
                d.estado === 'hoje' && { borderWidth: 1.5, borderColor: color.accent.default },
                d.estado === 'vazio' && { backgroundColor: color.surface.strong },
                d.estado === 'futuro' && { borderWidth: 1, borderColor: color.text.muted },
              ]}
            />
            <Text variant="Caption/Medium 12" tone={hoje ? 'accent' : 'tertiary'}>
              {d.rotulo}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Bloco do Plus: no Plus mostra o conteúdo; na econômica, a marca Plus no título, o conteúdo
 * desfocado (com dados de exemplo) e o toque abre o paywall (RN-20).
 */
function BlocoPlus({ plus, titulo, subtitulo, children }: { plus: boolean; titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <Pressable
      disabled={plus}
      accessibilityRole={plus ? undefined : 'button'}
      accessibilityLabel={plus ? undefined : t('estatisticas.plusAcessivel', { bloco: titulo })}
      onPress={() => router.push('/primeira-classe')}
      style={{ gap: space[12] }}
    >
      <View style={{ gap: space[2] }}>
        <View style={styles.tituloDoBloco}>
          {plus ? null : <Plus tamanho="pequeno" />}
          <Text variant="Label/Strong 14" accessibilityRole="header">
            {titulo}
          </Text>
        </View>
        {subtitulo ? (
          <Text variant="Body/Small 13" tone="tertiary">
            {subtitulo}
          </Text>
        ) : null}
      </View>
      <View style={[{ gap: space[12] }, !plus && styles.bloqueado]} importantForAccessibility={plus ? 'auto' : 'no-hide-descendants'}>
        {children}
      </View>
    </Pressable>
  );
}

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
  linhaDaCategoria: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  nomeDaCategoria: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[6] },
  porcento: { width: 36, textAlign: 'right' },
  trilho: { backgroundColor: color.surface.track, overflow: 'hidden' },
  media: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8] },
  rotulado: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  divisao: { flexDirection: 'row', gap: space[2], height: 6 },
  parte: { height: 6, borderRadius: radius.xs },
  sequencia: { flexDirection: 'row', alignItems: 'center', gap: space[16], padding: space[16], borderRadius: radius.xl, backgroundColor: color.surface.subtle },
  semana: { flexDirection: 'row', gap: space[6] },
  bolinha: { width: 14, height: 14, borderRadius: 7 },
  horario: { flexDirection: 'row', alignItems: 'flex-end', gap: space[6], height: ALTURA_DO_HORARIO },
  faixa: { flex: 1, borderRadius: radius.xs },
  eixo: { flexDirection: 'row', justifyContent: 'space-between' },
  linhaBase: { flexDirection: 'row', alignItems: 'baseline', gap: space[8] },
  cartao: { gap: space[2], paddingVertical: space[12], paddingHorizontal: space[14], borderRadius: radius.xl, borderWidth: 1, borderColor: color.border.subtle },
});
